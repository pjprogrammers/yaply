import type { DurableObjectState } from "@cloudflare/workers-types";
import type {
  ChainState,
  GameKind,
  GamePhase,
  GameSettings,
  Player,
  Ranking,
  RoomSnapshot,
  SmashMatchSnapshot,
  Stroke,
} from "@yaply/shared/types";
import type { ChatEventKind, ClientEvent, ServerEvent } from "@yaply/shared/events";
import {
  CHAIN_MAX_MOVES,
  DEFAULT_GAME_SETTINGS,
  EMPTY_ROOM_TTL_MS,
  chainBoardDimensions,
  isChainBoardSize,
  isChainPaletteId,
  isSmashMapId,
  isWordLanguage,
  resolveChainPalette,
  sanitizeCustomColors,
  MAX_CHAT_LENGTH,
  MAX_INVALID_MESSAGES,
  MAX_MESSAGE_BYTES,
  MAX_POINTS_PER_STROKE,
  MAX_SMASH_MESSAGE_BYTES,
  MAX_SMASH_SOCKETS_PER_ROOM,
  MAX_SOCKETS_PER_CLIENT_PER_ROOM,
  MAX_SOCKETS_PER_ROOM,
  MAX_STROKE_POINTS_PER_ROUND,
  MAX_STROKES_PER_ROUND,
  MESSAGE_RATE_LIMIT,
  PLAYER_COLORS,
  PROTOCOL_VERSION,
  RECONNECT_GRACE_PERIOD_MS,
  ROOM_INACTIVITY_EXPIRY_MS,
  ROOM_RESERVATION_TTL_MS,
  SMASH_DURATION_MAX_SECONDS,
  SMASH_DURATION_MIN_SECONDS,
  SMASH_KILL_TARGET_MAX,
  SMASH_KILL_TARGET_MIN,
  SMASH_MAX_PLAYERS,
  SMASH_PLAYER_COLORS,
  UNJOINED_SOCKET_TTL_MS,
} from "@yaply/shared/constants";
import { ClientEventSchema } from "@yaply/shared/schemas";
import { pickWordChoices, isExactGuess, isCloseGuess, matchesWord, containsSecretWord } from "./words-util";
import { calculateGuessPoints, calculateDrawerPoints } from "./scoring";
import {
  applyChainMove,
  countOrbs,
  createChainState,
  pickAutoMove,
  rankChainPlayers,
  removeChainPlayer,
} from "./chain";

type StoredPlayer = Player & {
  resumeToken: string;
  lastSeen: number;
};

type DepartedPlayer = StoredPlayer & {
  /** Skribbl turn the seat was released in, used to reset per-round flags. */
  departedTurnNumber: number;
};

type WordChoice = {
  id: string;
  word: string;
};

type StoredState = {
  code: string;
  game: GameKind;
  phase: GamePhase;
  hostId: string;
  players: StoredPlayer[];
  /**
   * Seats removed during an active match. Keeping them here means a player who
   * leaves or drops off can return with the score they had, instead of being
   * seated as a brand-new player on zero.
   */
  departedPlayers: DepartedPlayer[];
  settings: GameSettings;
  roundNumber: number;
  drawerId: string | null;
  selectedWord: string | null;
  selectedWordId: string | null;
  wordChoices: WordChoice[];
  /**
   * Words already offered in the current match. A word is only recycled after
   * the whole directory has been used, so a short game never repeats a choice.
   */
  usedWords: string[];
  guessedPlayerIds: string[];
  roundOrder: string[];
  turnNumber: number;
  endsAt: number | null;
  roundStartedAt: number | null;
  roundEndsAt: number | null;
  chooseEndsAt: number | null;
  revealedIndices: number[];
  strokes: Stroke[];
  chain: ChainState | null;
  /**
   * Last authoritative snapshot relayed by the Smash Karts host. It is kept
   * separate from `RoomSnapshot` so a 40-kart match state is not serialized on
   * every lobby event. New mid-match joiners receive it once after joining.
   */
  lastSmashState: SmashMatchSnapshot | null;
  version: number;
  createdAt: number;
  lastActivity: number;
  /**
   * Set by `POST /rooms` before the first player connects. The reservation is
   * what makes room allocation atomic: a second request for the same code sees
   * an unexpired reservation and picks another code.
   */
  reservedAt: number | null;
  reservedGame: GameKind | null;
};

type SocketState = {
  tokens: number;
  lastRefill: number;
  invalid: number;
  createdAt: number;
  lastMessageAt: number;
  /** Last explicit snapshot request, used to bound expensive sync replies. */
  lastSyncAt: number;
  /** Best-effort client identity used to cap multiple sockets per room. */
  client: string;
};

const DRAWER_GRACE_MS = 15_000;
const CHOOSE_TIME_MS = 20_000;
const ROUND_RESULT_MS = 5_000;
const SNAPSHOT_SYNC_COOLDOWN_MS = 1_000;
/** A stalled Smash Karts host is replaced quickly so the match can continue. */
const SMASH_HOST_TRANSFER_MS = 6_000;
const SECRET_MESSAGE_PLACEHOLDER = "Secret message hidden.";
const SECRET_MESSAGE_REDACTED = "••••••";

function logRoom(
  level: "info" | "warn" | "error",
  event: string,
  details: Record<string, unknown>,
): void {
  const line = JSON.stringify({ level, event, ...details, at: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function safeCode(code: string): string {
  return code ? `${code.slice(0, 2)}***` : "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function sanitizeSettings(input: Partial<GameSettings> | undefined, game: GameKind): GameSettings {
  const maxAllowed = game === "smashkarts" ? SMASH_MAX_PLAYERS : game === "chain" ? 8 : 12;
  const defaultMax = game === "smashkarts" ? SMASH_MAX_PLAYERS : DEFAULT_GAME_SETTINGS.maxPlayers;
  const maxPlayers = clamp(
    input?.maxPlayers ?? input?.playerCount ?? defaultMax,
    2,
    maxAllowed,
  );
  const playerCount = clamp(
    input?.playerCount ?? maxPlayers,
    2,
    maxAllowed,
  );
  const requestedPalette = input?.palette;
  const palette = isChainPaletteId(requestedPalette) ? requestedPalette : "classic";
  const customColors = palette === "custom" ? sanitizeCustomColors(input?.customColors) : [];

  return {
    maxPlayers,
    rounds: clamp(input?.rounds ?? DEFAULT_GAME_SETTINGS.rounds, 1, 10),
    drawingTimeSeconds: clamp(
      input?.drawingTimeSeconds ?? DEFAULT_GAME_SETTINGS.drawingTimeSeconds,
      30,
      180,
    ),
    language: isWordLanguage(input?.language) ? input.language : "en",
    allowLateJoin: input?.allowLateJoin ?? DEFAULT_GAME_SETTINGS.allowLateJoin,
    wordCount: clamp(input?.wordCount ?? DEFAULT_GAME_SETTINGS.wordCount ?? 3, 2, 5),
    turnTimeSeconds: clamp(
      input?.turnTimeSeconds ?? DEFAULT_GAME_SETTINGS.turnTimeSeconds ?? 45,
      15,
      120,
    ),
    playerCount,
    boardSize: isChainBoardSize(input?.boardSize)
      ? input.boardSize
      : DEFAULT_GAME_SETTINGS.boardSize ?? "medium",
    palette,
    customColors,
    theme:
      input?.theme === "light" || input?.theme === "neon" || input?.theme === "dark"
        ? input.theme
        : "dark",
    gridStyle: input?.gridStyle === "2d" ? "2d" : "3d",
    confirmMoves: input?.confirmMoves ?? false,
    vsCpu: input?.vsCpu ?? false,
    cpuDifficulty:
      input?.cpuDifficulty === "easy" || input?.cpuDifficulty === "hard"
        ? input.cpuDifficulty
        : "medium",
    mapId: isSmashMapId(input?.mapId) ? input.mapId : "foundry",
    killTarget: clamp(
      input?.killTarget ?? DEFAULT_GAME_SETTINGS.killTarget ?? 20,
      SMASH_KILL_TARGET_MIN,
      SMASH_KILL_TARGET_MAX,
    ),
    durationSeconds: clamp(
      input?.durationSeconds ?? DEFAULT_GAME_SETTINGS.durationSeconds ?? 300,
      SMASH_DURATION_MIN_SECONDS,
      SMASH_DURATION_MAX_SECONDS,
    ),
  };
}

function createEmptyState(code: string, game: GameKind): StoredState {
  const now = Date.now();
  return {
    code,
    game,
    phase: "lobby",
    hostId: "",
    players: [],
    departedPlayers: [],
    settings: { ...DEFAULT_GAME_SETTINGS },
    roundNumber: 0,
    drawerId: null,
    selectedWord: null,
    selectedWordId: null,
    wordChoices: [],
    usedWords: [],
    guessedPlayerIds: [],
    roundOrder: [],
    turnNumber: 0,
    endsAt: null,
    roundStartedAt: null,
    roundEndsAt: null,
    chooseEndsAt: null,
    revealedIndices: [],
    strokes: [],
    chain: null,
    lastSmashState: null,
    version: 0,
    createdAt: now,
    lastActivity: now,
    reservedAt: null,
    reservedGame: null,
  };
}

export class GameRoom {
  private ctx: DurableObjectState;
  private env: any;
  private room: StoredState;
  private requestedCode = "";
  private requestedGame: GameKind | null = null;
  private sockets = new Map<WebSocket, string | null>();
  private playerSockets = new Map<string, WebSocket>();
  private socketState = new Map<WebSocket, SocketState>();
  // Reactions are ephemeral chat messages, so they stay in memory and reset
  // with every drawing turn instead of growing the persisted room state.
  private reactedPlayerIds = new Set<string>();
  private ready: Promise<void>;
  private lastSmashPersistAt = 0;

  constructor(ctx: DurableObjectState, env: any) {
    this.ctx = ctx;
    this.env = env;
    this.room = createEmptyState("", "skribbl");

    this.ready = this.load();
    this.ctx.blockConcurrencyWhile(() => this.ready);
  }

  private async load(): Promise<void> {
    const stored = await this.ctx.storage.get<Partial<StoredState>>("room");
    if (!stored || !stored.code) return;
    const game: GameKind =
      stored.game === "chain"
        ? "chain"
        : stored.game === "smashkarts"
          ? "smashkarts"
          : "skribbl";
    // Merge over a fresh state so rooms written by an older build gain any
    // fields added since, instead of starting with `undefined` values.
    this.room = { ...createEmptyState(stored.code, game), ...stored, game };

    // Sockets never survive a Durable Object restart. Persisted `connected`
    // flags are stale until each player reconnects with their resume token, so
    // reset them and give every seat a fresh reconnect grace period. Without a
    // fresh `lastSeen`, a DO that wakes after a long hibernation would delete
    // players the instant its first alarm fires, even though their clients are
    // still reconnecting.
    const now = Date.now();
    if (this.room.players.length > 0) {
      for (const player of this.room.players) {
        player.connected = false;
        player.lastSeen = now;
      }
      await this.ctx.storage.put("room", this.room);
    }
    // Re-establish timeout/expiry enforcement after a hibernation or restart.
    await this.scheduleAlarm();
  }

  private roomHasState(): boolean {
    return (
      this.room.players.length > 0 ||
      this.room.phase !== "lobby" ||
      this.room.version > 0 ||
      this.room.strokes.length > 0 ||
      this.room.chain !== null
    );
  }

  private activeReservation(now = Date.now()): { game: GameKind; expiresAt: number } | null {
    if (!this.room.reservedAt || !this.room.reservedGame) return null;
    const expiresAt = this.room.reservedAt + ROOM_RESERVATION_TTL_MS;
    if (now >= expiresAt) return null;
    return { game: this.room.reservedGame, expiresAt };
  }

  private clearExpiredReservation(now: number): boolean {
    if (!this.room.reservedAt || this.activeReservation(now)) return false;
    this.room.reservedAt = null;
    this.room.reservedGame = null;
    this.room.lastActivity = now;
    return true;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/internal/exists") {
      const now = Date.now();
      const exists = this.roomHasState() || this.activeReservation(now) !== null;
      return new Response(JSON.stringify({ exists }), {
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    if (url.pathname === "/internal/reserve") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ reserved: false, reason: "method" }), {
          status: 405,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ reserved: false, reason: "body" }), {
          status: 400,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      }

      const payload = typeof body === "object" && body !== null
        ? (body as { game?: unknown; code?: unknown })
        : {};
      const game =
        payload.game === "chain"
          ? "chain"
          : payload.game === "skribbl"
            ? "skribbl"
            : payload.game === "smashkarts"
              ? "smashkarts"
              : null;
      const code = typeof payload.code === "string" ? payload.code.toLowerCase() : "";
      if (!game || !/^[a-z0-9]{6}$/.test(code)) {
        return new Response(JSON.stringify({ reserved: false, reason: "invalid" }), {
          status: 400,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      }

      const now = Date.now();
      this.clearExpiredReservation(now);

      if (this.roomHasState()) {
        return new Response(JSON.stringify({ reserved: false, reason: "exists" }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      }

      if (this.room.code && this.room.code !== code) {
        return new Response(JSON.stringify({ reserved: false, reason: "code" }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      }

      if (this.activeReservation(now)) {
        return new Response(JSON.stringify({ reserved: false, reason: "reserved" }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      }

      this.room.code = code;
      this.room.game = game;
      this.room.reservedAt = now;
      this.room.reservedGame = game;
      this.room.lastActivity = now;
      await this.ctx.storage.put("room", this.room);
      await this.scheduleAlarm();

      return new Response(JSON.stringify({ reserved: true }), {
        status: 201,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const code = (parts[1] ?? "").toLowerCase();
    if (!/^[a-z0-9]{6}$/.test(code)) {
      return new Response("Invalid room code", { status: 400 });
    }

    const gameParam = url.searchParams.get("game");
    if (gameParam !== "chain" && gameParam !== "skribbl" && gameParam !== "smashkarts") {
      return new Response("Invalid game", { status: 400 });
    }
    const game: GameKind = gameParam;
    this.requestedCode = code;
    this.requestedGame = game;

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected websocket", { status: 400 });
    }

    const socketCap = game === "smashkarts" ? MAX_SMASH_SOCKETS_PER_ROOM : MAX_SOCKETS_PER_ROOM;
    if (this.sockets.size >= socketCap) {
      return new Response("Too many connections for this room", { status: 429 });
    }

    const clientId = this.clientKey(request);
    let clientSockets = 0;
    for (const state of this.socketState.values()) {
      if (state.client === clientId) clientSockets += 1;
    }
    if (clientSockets >= MAX_SOCKETS_PER_CLIENT_PER_ROOM) {
      logRoom("warn", "room.connect.client_capped", {
        game,
        code: safeCode(code),
      });
      return new Response("Too many connections from this client", { status: 429 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.handleSession(server, clientId);
    return new Response(null, { status: 101, webSocket: client });
  }

  private clientKey(request: Request): string {
    return (
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown"
    );
  }

  private handleSession(ws: WebSocket, client = "unknown") {
    ws.accept();
    this.sockets.set(ws, null);
    this.socketState.set(ws, {
      tokens: MESSAGE_RATE_LIMIT.capacity,
      lastRefill: Date.now(),
      invalid: 0,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      lastSyncAt: 0,
      client,
    });

    // A fresh room has no alarm yet. Schedule one so the unjoined-socket
    // deadline and empty-room expiry are enforced even if this socket never
    // sends a message.
    void this.scheduleAlarm();

    ws.addEventListener("message", async (message) => {
      const raw = typeof message.data === "string" ? message.data : String(message.data);
      const state = this.socketState.get(ws);
      if (!state) return;

      state.lastMessageAt = Date.now();

      const messageLimit =
        (this.requestedGame ?? this.room.game) === "smashkarts"
          ? MAX_SMASH_MESSAGE_BYTES
          : MAX_MESSAGE_BYTES;
      if (new TextEncoder().encode(raw).byteLength > messageLimit) {
        this.rejectMessage(ws, "MESSAGE_TOO_LARGE", "That message is too large.");
        return;
      }

      if (!this.takeToken(state)) {
        this.rejectMessage(ws, "RATE_LIMITED", "Slow down for a moment.");
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        this.rejectMessage(ws, "PARSE_ERROR", "That message was not valid JSON.");
        return;
      }

      const result = ClientEventSchema.safeParse(parsed);
      if (!result.success) {
        this.rejectMessage(ws, "INVALID_EVENT", "That action is not valid.");
        return;
      }

      try {
        await this.handleEvent(ws, result.data as ClientEvent);
      } catch (error) {
        logRoom("error", "room.event_failed", {
          game: this.room.game,
          code: safeCode(this.room.code || this.requestedCode),
          category: error instanceof Error ? error.name : "unknown",
        });
        this.send(ws, { type: "room.error", code: "SERVER_ERROR", message: "The room could not complete that action." });
      }
    });

    ws.addEventListener("close", () => {
      void this.handleSocketClose(ws);
    });

    ws.addEventListener("error", () => {
      void this.handleSocketClose(ws);
    });
  }

  private takeToken(state: SocketState): boolean {
    const now = Date.now();
    const elapsed = Math.max(0, (now - state.lastRefill) / 1000);
    state.tokens = Math.min(
      MESSAGE_RATE_LIMIT.capacity,
      state.tokens + elapsed * MESSAGE_RATE_LIMIT.refillPerSecond,
    );
    state.lastRefill = now;
    if (state.tokens < 1) return false;
    state.tokens -= 1;
    return true;
  }

  private rejectMessage(ws: WebSocket, code: string, message: string) {
    const state = this.socketState.get(ws);
    if (state) {
      state.invalid += 1;
      if (state.invalid >= MAX_INVALID_MESSAGES) {
        this.send(ws, { type: "room.error", code, message });
        try {
          ws.close(1008, "Too many invalid messages");
        } catch {
          // Already closed.
        }
        return;
      }
    }
    this.send(ws, { type: "room.error", code, message });
  }

  private send(ws: WebSocket, event: ServerEvent) {
    try {
      ws.send(JSON.stringify(event));
    } catch {
      // A closed socket is removed by its close handler.
    }
  }

  private rejectEntry(
    ws: WebSocket,
    action: "room.create" | "room.join",
    code: string,
    message: string,
  ) {
    logRoom("warn", "room.entry_rejected", {
      game: this.requestedGame ?? this.room.game,
      code: safeCode(this.requestedCode || this.room.code),
      action,
      reason: code,
      phase: this.room.phase,
    });
    this.send(ws, { type: "room.error", code, message });
  }

  private broadcast(event: ServerEvent) {
    for (const [ws, playerId] of this.sockets) {
      // A socket that only opened the room URL has not joined yet and must not
      // receive room snapshots, chat, drawings or system messages.
      if (!playerId) continue;
      this.send(ws, event);
    }
  }

  private createSnapshot(): RoomSnapshot {
    return {
      code: this.room.code,
      game: this.room.game,
      phase: this.room.phase,
      hostId: this.room.hostId,
      players: this.room.players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        color: player.color,
        score: player.score,
        connected: player.connected,
        guessedCorrectly: player.guessedCorrectly,
        joinedAt: player.joinedAt,
      })),
      settings: this.room.settings,
      roundNumber: this.room.roundNumber,
      drawerId: this.room.drawerId,
      maskedWord: this.maskedWord(),
      endsAt:
        this.room.phase === "choosing"
          ? this.room.chooseEndsAt
          : this.room.phase === "drawing"
            ? this.room.endsAt
            : this.room.phase === "round-result"
              ? this.room.roundEndsAt
              : this.room.game === "chain"
                ? this.room.chain?.turnEndsAt ?? null
                : null,
      strokes: this.room.strokes.slice(-MAX_STROKES_PER_ROUND),
      chain: this.room.chain,
      rankings:
        this.room.phase === "round-result" || this.room.phase === "game-over"
          ? this.rankings()
          : undefined,
      winnerId:
        this.room.phase === "game-over"
          ? this.room.game === "chain"
            ? this.room.chain?.winnerId ?? null
            : this.rankings()[0]?.playerId ?? null
          : undefined,
      version: ++this.room.version,
    };
  }

  private broadcastSnapshot() {
    this.broadcast({ type: "room.snapshot", snapshot: this.createSnapshot() });
  }

  private maskedWord(): string | null {
    if (this.room.game !== "skribbl" || !this.room.selectedWord) return null;
    if (this.room.phase === "round-result" || this.room.phase === "game-over") {
      return this.room.selectedWord;
    }
    if (this.room.phase !== "drawing") return null;

    const revealed = new Set(this.room.revealedIndices);
    return [...this.room.selectedWord]
      .map((character, index) => {
        if (character === " " || !/[\p{L}\p{N}]/u.test(character) || revealed.has(index)) {
          return character;
        }
        return "_";
      })
      .join("");
  }

  private player(playerId: string | null): StoredPlayer | undefined {
    if (!playerId) return undefined;
    return this.room.players.find((entry) => entry.id === playerId);
  }

  private socketPlayer(ws: WebSocket): StoredPlayer | undefined {
    return this.player(this.sockets.get(ws) ?? null);
  }

  private sendWelcome(ws: WebSocket, player: StoredPlayer) {
    this.send(ws, {
      type: "room.welcome",
      playerId: player.id,
      resumeToken: player.resumeToken,
      protocolVersion: PROTOCOL_VERSION,
    });
  }

  private sendPrivateState(ws: WebSocket, playerId: string) {
    if (this.room.game !== "skribbl" || playerId !== this.room.drawerId) return;

    if (this.room.phase === "choosing" && this.room.wordChoices.length > 0) {
      this.send(ws, {
        type: "game.word.choices",
        choices: this.room.wordChoices.map((choice) => ({ id: choice.id, display: choice.word })),
      });
    }

    if (this.room.phase === "drawing" && this.room.selectedWord) {
      this.send(ws, { type: "game.word.selected", word: this.room.selectedWord });
    }
  }

  private sendSmashState(ws: WebSocket) {
    if (this.room.game !== "smashkarts" || !this.room.lastSmashState) return;
    // Send this before room.snapshot. The client uses room.snapshot to mount
    // the arena, and a reconnecting host must already hold the seed when that
    // happens or it would restart the match from zero.
    this.send(ws, { type: "smash.snapshot", snapshot: this.room.lastSmashState });
  }

  private attachSocket(ws: WebSocket, player: StoredPlayer) {
    const previous = this.playerSockets.get(player.id);
    if (previous && previous !== ws) {
      this.sockets.delete(previous);
      this.socketState.delete(previous);
      try {
        previous.close(4000, "Replaced by a new connection");
      } catch {
        // Already closed.
      }
    }

    this.sockets.set(ws, player.id);
    this.playerSockets.set(player.id, ws);
    player.connected = true;
    player.lastSeen = Date.now();
    this.room.lastActivity = Date.now();
    // A room can briefly have no host after its last connected player dropped
    // while the rest of the seats were still in their grace period.
    if (!this.room.hostId) this.room.hostId = player.id;
  }

  private async handleSocketClose(ws: WebSocket) {
    const playerId = this.sockets.get(ws);
    this.sockets.delete(ws);
    this.socketState.delete(ws);
    if (!playerId) return;
    if (this.playerSockets.get(playerId) !== ws) return;

    this.playerSockets.delete(playerId);
    const player = this.player(playerId);
    if (!player) return;

    player.connected = false;
    player.lastSeen = Date.now();
    this.room.lastActivity = Date.now();

    // The host keeps the role through the reconnect grace period so a refresh
    // does not hand the room to someone else.
    this.broadcast({ type: "room.player.left", playerId });
    this.broadcastSnapshot();
    logRoom("info", "room.player_disconnected", {
      game: this.room.game,
      code: safeCode(this.room.code),
      phase: this.room.phase,
      players: this.room.players.length,
    });
    await this.persist();
    await this.scheduleAlarm();
  }

  private transferHost() {
    const next =
      this.room.players.find((entry) => entry.connected && entry.id !== this.room.hostId) ??
      this.room.players.find((entry) => entry.id !== this.room.hostId);
    this.room.hostId = next?.id ?? "";
  }

  private paletteColors(): string[] {
    // Smash Karts has its own 40-seat grid; Chain uses player palettes.
    if (this.room.game === "smashkarts") return SMASH_PLAYER_COLORS;
    if (this.room.game !== "chain") return PLAYER_COLORS;
    return resolveChainPalette(this.room.settings.palette, this.room.settings.customColors);
  }

  private nextPlayerColor(): string {
    const colors = this.paletteColors();
    const usedColors = new Set(this.room.players.map((player) => player.color));
    return (
      colors.find((candidate) => !usedColors.has(candidate)) ??
      colors[this.room.players.length % colors.length] ??
      PLAYER_COLORS[this.room.players.length % PLAYER_COLORS.length]
    );
  }

  /** Re-applies the selected palette to every seat, keeping colours distinct. */
  private applyPaletteToPlayers() {
    const colors = this.paletteColors();
    this.room.players.forEach((player, index) => {
      player.color = colors[index % colors.length] ?? PLAYER_COLORS[index % PLAYER_COLORS.length];
    });
  }

  private newPlayer(nickname: string): StoredPlayer {
    const color = this.nextPlayerColor();

    return {
      id: crypto.randomUUID(),
      nickname,
      avatar: nickname.slice(0, 1).toUpperCase(),
      color,
      score: 0,
      connected: true,
      guessedCorrectly: false,
      joinedAt: Date.now(),
      resumeToken: crypto.randomUUID(),
      lastSeen: Date.now(),
    };
  }

  private async handleEvent(ws: WebSocket, event: ClientEvent) {
    const attachedPlayer = this.socketPlayer(ws);
    const isEntry = event.type === "room.create" || event.type === "room.join";

    if (isEntry) {
      if (attachedPlayer) {
        this.send(ws, {
          type: "room.error",
          code: "ALREADY_IN_ROOM",
          message: "This connection is already in a room.",
        });
        return;
      }
      if (event.protocolVersion !== PROTOCOL_VERSION) {
        logRoom("warn", "room.protocol_mismatch", {
          game: this.requestedGame ?? this.room.game,
          code: safeCode(this.requestedCode || this.room.code),
          clientVersion: event.protocolVersion,
          serverVersion: PROTOCOL_VERSION,
        });
        this.send(ws, {
          type: "room.error",
          code: "PROTOCOL_MISMATCH",
          message: "This page is out of date. Refresh to reconnect.",
        });
        return;
      }
    } else if (!attachedPlayer) {
      this.send(ws, {
        type: "room.error",
        code: "NOT_IN_ROOM",
        message: "Join a room before doing that.",
      });
      return;
    }

    switch (event.type) {
      case "room.create":
        await this.handleCreate(ws, event);
        break;
      case "room.join":
        await this.handleJoin(ws, event);
        break;
      case "room.leave":
        await this.handleLeave(ws);
        break;
      case "room.start":
        await this.handleStart(ws);
        break;
      case "room.settings.update":
        await this.handleSettings(ws, event.settings);
        break;
      case "game.word.choose":
        await this.handleChooseWord(ws, event.wordId);
        break;
      case "drawing.stroke":
        await this.handleStroke(ws, event);
        break;
      case "drawing.undo":
        await this.handleUndo(ws, event.strokeId);
        break;
      case "drawing.clear":
        await this.handleClear(ws);
        break;
      case "chat.guess":
        await this.handleChat(ws, event.text);
        break;
      case "chat.reaction":
        this.handleReaction(ws, event.reaction);
        break;
      case "chain.place":
        await this.handleChainPlace(ws, event.row, event.col);
        break;
      case "chain.surrender":
        await this.handleChainSurrender(ws);
        break;
      case "smash.input":
        this.handleSmashInput(ws, event.input);
        break;
      case "smash.snapshot":
        await this.handleSmashSnapshot(ws, event.snapshot);
        break;
      case "game.rematch":
        await this.handleRematch(ws);
        break;
      case "room.sync": {
        const state = this.socketState.get(ws);
        const now = Date.now();
        // Reconnects already receive a snapshot. Without a cooldown a client can
        // make the room serialize the full canvas up to the message rate limit
        // every second, even though the client never uses this event.
        if (state) {
          if (now - state.lastSyncAt < SNAPSHOT_SYNC_COOLDOWN_MS) return;
          state.lastSyncAt = now;
        }
        this.sendPrivateState(ws, this.sockets.get(ws) ?? "");
        this.sendSmashState(ws);
        this.send(ws, { type: "room.snapshot", snapshot: this.createSnapshot() });
        break;
      }
      default:
        break;
    }
  }

  private async handleCreate(ws: WebSocket, event: Extract<ClientEvent, { type: "room.create" }>) {
    if (!this.requestedCode || !this.requestedGame) {
      this.rejectEntry(ws, "room.create", "INVALID_ROOM", "That room address is not valid.");
      return;
    }

    if (this.requestedGame !== event.game) {
      this.rejectEntry(ws, "room.create", "GAME_MISMATCH", "That room belongs to a different game.");
      return;
    }

    if (this.room.code && this.room.game !== event.game) {
      this.rejectEntry(ws, "room.create", "GAME_MISMATCH", "That room belongs to a different game.");
      return;
    }

    if (this.roomHasState()) {
      this.rejectEntry(
        ws,
        "room.create",
        "ROOM_EXISTS",
        "That room code is already in use. Go back and create a new room.",
      );
      return;
    }

    const reservation = this.activeReservation();
    if (!reservation) {
      this.rejectEntry(
        ws,
        "room.create",
        "ROOM_NOT_RESERVED",
        "This room was not reserved. Go back and create a new room.",
      );
      return;
    }

    if (reservation.game !== event.game || this.room.reservedGame !== event.game) {
      this.rejectEntry(ws, "room.create", "GAME_MISMATCH", "That room belongs to a different game.");
      return;
    }

    this.room = createEmptyState(this.requestedCode, event.game);
    this.room.settings = sanitizeSettings(event.settings, event.game);

    const player = this.newPlayer(event.nickname);
    this.room.players.push(player);
    this.room.hostId = player.id;
    this.room.roundOrder = [player.id];

    this.attachSocket(ws, player);
    this.sendWelcome(ws, player);
    this.send(ws, { type: "room.snapshot", snapshot: this.createSnapshot() });
    this.broadcastSystemChat(`${player.nickname} joined the room.`, "player_joined");
    logRoom("info", "room.created", {
      game: this.room.game,
      code: safeCode(this.room.code),
    });
    await this.commit();
  }

  private async handleJoin(ws: WebSocket, event: Extract<ClientEvent, { type: "room.join" }>) {
    if (this.room.players.length === 0 && this.room.departedPlayers.length === 0) {
      this.rejectEntry(
        ws,
        "room.join",
        "ROOM_NOT_FOUND",
        "No room with that code is open. Check the code and try again.",
      );
      return;
    }

    if (this.requestedGame !== event.game) {
      this.rejectEntry(ws, "room.join", "GAME_MISMATCH", "That room belongs to a different game.");
      return;
    }

    if (event.game !== this.room.game) {
      this.rejectEntry(ws, "room.join", "GAME_MISMATCH", "That room belongs to a different game.");
      return;
    }

    if (event.code.toLowerCase() !== this.room.code.toLowerCase()) {
      this.rejectEntry(
        ws,
        "room.join",
        "ROOM_NOT_FOUND",
        "No room with that code is open. Check the code and try again.",
      );
      return;
    }

    const resumed = event.resumeToken
      ? this.room.players.find((player) => player.resumeToken === event.resumeToken)
      : undefined;

    if (resumed) {
      this.room.departedPlayers = this.room.departedPlayers.filter(
        (player) => player.resumeToken !== event.resumeToken,
      );
      this.attachSocket(ws, resumed);
      this.sendWelcome(ws, resumed);
      this.sendPrivateState(ws, resumed.id);
      this.sendSmashState(ws);
      this.send(ws, { type: "room.snapshot", snapshot: this.createSnapshot() });
      this.broadcastSnapshot();
      logRoom("info", "room.reconnected", {
        game: this.room.game,
        code: safeCode(this.room.code),
        players: this.room.players.length,
        phase: this.room.phase,
      });
      await this.commit();
      return;
    }

    const departed = event.resumeToken
      ? this.room.departedPlayers.find((player) => player.resumeToken === event.resumeToken)
      : undefined;

    if (departed) {
      // This player left (or timed out) during the current match. Restore the
      // same seat and score instead of starting them over at zero.
      this.room.departedPlayers = this.room.departedPlayers.filter(
        (player) => player.id !== departed.id,
      );
      // Only carry the "already guessed" flag into the same turn. If the match
      // moved on while this player was away, they get a fresh guess.
      if (departed.departedTurnNumber !== this.room.turnNumber) {
        departed.guessedCorrectly = false;
      } else if (
        departed.guessedCorrectly &&
        !this.room.guessedPlayerIds.includes(departed.id)
      ) {
        this.room.guessedPlayerIds.push(departed.id);
      }
      departed.connected = true;
      departed.lastSeen = Date.now();
      this.room.players.push(departed);
      if (!this.room.roundOrder.includes(departed.id)) {
        this.room.roundOrder.push(departed.id);
      }

      this.attachSocket(ws, departed);
      this.sendWelcome(ws, departed);
      this.sendPrivateState(ws, departed.id);
      this.sendSmashState(ws);
      this.send(ws, { type: "room.snapshot", snapshot: this.createSnapshot() });
      this.broadcast({ type: "room.player.joined", playerId: departed.id });
      this.broadcastSnapshot();
      this.broadcastSystemChat(`${departed.nickname} rejoined the room.`, "reconnected");
      logRoom("info", "room.rejoined_match", {
        game: this.room.game,
        code: safeCode(this.room.code),
        phase: this.room.phase,
        players: this.room.players.length,
      });
      await this.commit();
      return;
    }

    if (event.resumeToken) {
      // The seat can be gone because the player left, the reconnect grace
      // period expired, or the token was copied from another room. Treat the
      // join as a fresh seat instead of locking the player out mid-match.
      logRoom("info", "room.resume_fallback", {
        game: this.room.game,
        code: safeCode(this.room.code),
        phase: this.room.phase,
        players: this.room.players.length,
      });
    }

    // Departed seats keep their slot for the current match so a returning
    // player can reclaim their score. New players can use any remaining slot.
    const seatedPlayers = this.room.players.length + this.room.departedPlayers.length;
    if (seatedPlayers >= this.room.settings.maxPlayers) {
      this.rejectEntry(ws, "room.join", "ROOM_FULL", "That room is full.");
      return;
    }

    // Late joiners are welcome in every phase. They start with no score and
    // join the turn order from the next turn onward; during an active drawing
    // round they can guess immediately against the current word.
    const player = this.newPlayer(event.nickname);
    this.room.players.push(player);
    this.room.roundOrder.push(player.id);

    this.attachSocket(ws, player);
    this.sendWelcome(ws, player);
    this.broadcast({ type: "room.player.joined", playerId: player.id });
    this.sendSmashState(ws);
    this.send(ws, { type: "room.snapshot", snapshot: this.createSnapshot() });
    this.broadcastSnapshot();
    this.broadcastSystemChat(`${player.nickname} joined the room.`, "player_joined");
    logRoom("info", "room.joined", {
      game: this.room.game,
      code: safeCode(this.room.code),
      players: this.room.players.length,
    });
    await this.commit();
  }

  private async handleLeave(ws: WebSocket) {
    const player = this.socketPlayer(ws);
    if (!player) return;

    this.sockets.delete(ws);
    this.socketState.delete(ws);
    this.playerSockets.delete(player.id);

    const midMatch =
      this.room.game === "skribbl" &&
      (this.room.phase === "choosing" ||
        this.room.phase === "drawing" ||
        this.room.phase === "round-result");

    if (midMatch) {
      // An explicit leave during a match keeps the seat for the reconnect grace
      // period, exactly like a dropped connection. If the player comes back in
      // time they resume the same score instead of starting over at zero.
      player.connected = false;
      player.lastSeen = Date.now();
      this.room.lastActivity = Date.now();
      this.broadcast({ type: "room.player.left", playerId: player.id });
      this.broadcastSystemChat(`${player.nickname} left the room.`, "player_left");
    } else {
      this.removePlayer(player.id, "left");
    }

    this.broadcastSnapshot();
    try {
      ws.close(1000, "Left room");
    } catch {
      // Already closed.
    }
    await this.commit();
  }

  private async handleStart(ws: WebSocket) {
    const player = this.socketPlayer(ws);
    if (!player || player.id !== this.room.hostId) {
      this.send(ws, { type: "room.error", code: "NOT_HOST", message: "Only the host can start the game." });
      return;
    }
    if (this.room.phase !== "lobby") return;
    if (this.room.players.filter((entry) => entry.connected).length < 2) {
      this.send(ws, {
        type: "room.error",
        code: "NOT_ENOUGH_PLAYERS",
        message: "At least two connected players are needed to start.",
      });
      return;
    }

    this.startGame();
    this.broadcastSystemChat("The game started.", "round_started");
    logRoom("info", "room.started", {
      game: this.room.game,
      code: safeCode(this.room.code),
      players: this.room.players.length,
    });
    await this.commit();
  }

  private async handleSettings(ws: WebSocket, settings: Partial<GameSettings>) {
    const player = this.socketPlayer(ws);
    if (!player || player.id !== this.room.hostId) {
      this.send(ws, { type: "room.error", code: "NOT_HOST", message: "Only the host can change the room settings." });
      return;
    }
    if (this.room.phase !== "lobby") return;

    const previousLanguage = this.room.settings.language;
    this.room.settings = sanitizeSettings({ ...this.room.settings, ...settings }, this.room.game);
    if (this.room.settings.language !== previousLanguage) {
      // The bag belongs to the previous language; starting a fresh cycle keeps
      // words from another pool out of this room's history.
      this.room.usedWords = [];
    }
    this.room.settings.maxPlayers = Math.max(this.room.settings.maxPlayers, this.room.players.length);
    this.room.settings.playerCount = this.room.settings.maxPlayers;
    if (this.room.game === "chain") this.applyPaletteToPlayers();
    this.broadcastSnapshot();
    await this.commit();
  }

  private startGame() {
    const previousRound = this.room.roundNumber;
    for (const player of this.room.players) {
      player.score = 0;
      player.guessedCorrectly = false;
    }

    this.room.strokes = [];
    this.room.selectedWord = null;
    this.room.selectedWordId = null;
    this.room.wordChoices = [];
    this.room.usedWords = [];
    this.room.guessedPlayerIds = [];
    this.room.revealedIndices = [];
    // A rematch is a new match, so scores and departed seats from the previous
    // one must not carry over.
    this.room.departedPlayers = [];
    this.room.endsAt = null;
    this.room.roundStartedAt = null;
    this.room.roundEndsAt = null;
    this.room.chooseEndsAt = null;
    this.room.chain = null;
    this.room.roundNumber = 0;
    this.room.turnNumber = 0;
    this.room.roundOrder = this.room.players.map((player) => player.id);
    this.shuffle(this.room.roundOrder);
    this.room.lastActivity = Date.now();
    this.applyPaletteToPlayers();

    if (this.room.game === "chain") {
      const board = chainBoardDimensions(this.room.settings.boardSize);
      this.room.chain = createChainState(
        this.room.roundOrder,
        Date.now(),
        this.room.settings.turnTimeSeconds ?? 45,
        board.rows,
        board.cols,
      );
      this.room.phase = "playing";
      this.room.roundNumber = 1;
      this.syncChainScores();
      this.broadcastSnapshot();
      return;
    }

    if (this.room.game === "smashkarts") {
      // The host client owns the match simulation. The Worker only advances
      // the round number so late snapshots from a rematch's previous round are
      // rejected, and clears the relayed state until the host seeds it.
      this.room.phase = "playing";
      this.room.roundNumber = previousRound + 1;
      this.room.lastSmashState = null;
      this.room.roundOrder = this.room.players.map((player) => player.id);
      this.broadcastSnapshot();
      return;
    }

    this.nextTurn();
  }

  private shuffle<T>(items: T[]) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }

  private nextTurn() {
    if (this.room.game !== "skribbl") return;

    this.room.guessedPlayerIds = [];
    this.reactedPlayerIds.clear();
    for (const p of this.room.players) {
      p.guessedCorrectly = false;
    }
    this.room.strokes = [];
    this.room.selectedWord = null;
    this.room.selectedWordId = null;
    this.room.wordChoices = [];
    this.room.revealedIndices = [];
    this.room.endsAt = null;
    this.room.roundStartedAt = null;
    this.room.roundEndsAt = null;
    this.room.chooseEndsAt = null;

    const totalTurns = this.room.settings.rounds * this.room.roundOrder.length;
    let attempts = 0;
    let drawer: StoredPlayer | undefined;

    while (attempts < this.room.roundOrder.length) {
      this.room.turnNumber += 1;
      if (this.room.turnNumber > totalTurns) {
        this.finishSkribbl();
        return;
      }
      const drawerId = this.room.roundOrder[(this.room.turnNumber - 1) % this.room.roundOrder.length];
      const candidate = this.player(drawerId);
      if (candidate?.connected) {
        drawer = candidate;
        break;
      }
      attempts += 1;
    }

    if (!drawer) {
      this.finishSkribbl();
      return;
    }

    this.room.drawerId = drawer.id;
    this.room.roundNumber = Math.ceil(this.room.turnNumber / this.room.roundOrder.length);
    this.room.phase = "choosing";
    this.room.chooseEndsAt = Date.now() + CHOOSE_TIME_MS;
    const pick = pickWordChoices(
      this.room.settings.wordCount ?? 3,
      this.room.settings.language,
      this.room.usedWords ?? [],
    );
    this.room.usedWords = pick.used;
    this.room.wordChoices = pick.words.map((word, index) => ({
      id: `w${index}`,
      word,
    }));

    const drawerSocket = this.playerSockets.get(drawer.id);
    if (drawerSocket) {
      this.send(drawerSocket, {
        type: "game.word.choices",
        choices: this.room.wordChoices.map((choice) => ({ id: choice.id, display: choice.word })),
      });
    }

    this.broadcastSystemChat(`${drawer.nickname} is choosing a word.`, "drawing_started");
    this.broadcastSnapshot();
  }

  private async handleChooseWord(ws: WebSocket, wordId: string) {
    const player = this.socketPlayer(ws);
    if (!player || player.id !== this.room.drawerId || this.room.phase !== "choosing") return;

    const choice = this.room.wordChoices.find((entry) => entry.id === wordId);
    if (!choice) {
      this.send(ws, { type: "room.error", code: "INVALID_WORD", message: "That word is not on offer." });
      return;
    }

    this.applyWordChoice(choice.id);
    await this.commit();
  }

  private applyWordChoice(wordId: string) {
    const choice = this.room.wordChoices.find((entry) => entry.id === wordId) ?? this.room.wordChoices[0];
    if (!choice) return;

    this.room.selectedWord = choice.word;
    this.room.selectedWordId = choice.id;
    this.room.phase = "drawing";
    this.room.chooseEndsAt = null;
    this.room.roundStartedAt = Date.now();
    this.room.endsAt = this.room.roundStartedAt + this.room.settings.drawingTimeSeconds * 1000;
    this.room.revealedIndices = [];

    const drawerSocket = this.playerSockets.get(this.room.drawerId ?? "");
    if (drawerSocket) {
      this.send(drawerSocket, { type: "game.word.selected", word: choice.word });
    }

    const drawer = this.player(this.room.drawerId);
    if (drawer) this.broadcastSystemChat(`${drawer.nickname} is drawing.`, "drawing_started");
    this.broadcastSnapshot();
  }

  private async handleStroke(
    ws: WebSocket,
    event: Extract<ClientEvent, { type: "drawing.stroke" }>,
  ) {
    const player = this.socketPlayer(ws);
    if (!player || player.id !== this.room.drawerId || this.room.phase !== "drawing") return;

    // Bound the whole round, not just each stroke. Without this a drawer can
    // create hundreds of maximum-length strokes and push the persisted room and
    // every snapshot past the Durable Object value limit.
    let totalPoints = 0;
    for (const entry of this.room.strokes) totalPoints += entry.points.length;
    let budget = MAX_STROKE_POINTS_PER_ROUND - totalPoints;
    if (budget <= 0) {
      if (event.done) await this.commit();
      return;
    }

    let stroke = this.room.strokes.find((entry) => entry.id === event.strokeId);
    if (!stroke) {
      // The final `done` frame follows an earlier flushed frame, so it carries
      // no points of its own. Never create an empty stroke for it.
      if (event.points.length === 0) return;
      if (this.room.strokes.length >= MAX_STROKES_PER_ROUND) return;
      stroke = {
        id: event.strokeId,
        playerId: player.id,
        color: event.color,
        width: event.width,
        points: [],
      };
      this.room.strokes.push(stroke);
    }

    budget = Math.min(budget, MAX_POINTS_PER_STROKE - stroke.points.length);
    const accepted = budget > 0 ? event.points.slice(0, budget) : [];
    if (accepted.length === 0) {
      // The canvas flushes every 40ms and then sends a trailing `done` frame
      // when the pointer is released. That frame is valid even though its
      // points array is empty, so persist the round without treating it as
      // abuse or appending an empty stroke.
      if (event.done) await this.commit();
      return;
    }

    stroke.points.push(...accepted);

    this.broadcast({
      type: "drawing.stroke",
      strokeId: stroke.id,
      playerId: stroke.playerId,
      color: stroke.color,
      width: stroke.width,
      points: accepted,
      done: event.done ?? false,
    });

    if (event.done) {
      await this.commit();
    }
  }

  private async handleUndo(ws: WebSocket, strokeId?: string) {
    const player = this.socketPlayer(ws);
    if (!player || player.id !== this.room.drawerId || this.room.phase !== "drawing") return;

    let removedId: string | null = null;
    if (strokeId) {
      const index = this.room.strokes.findIndex((entry) => entry.id === strokeId);
      if (index >= 0) {
        removedId = strokeId;
        this.room.strokes.splice(index, 1);
      }
    } else {
      const last = this.room.strokes.pop();
      removedId = last?.id ?? null;
    }

    if (removedId) {
      this.broadcast({ type: "drawing.undo", strokeId: removedId });
    } else {
      // No canvas change means no state to persist or re-broadcast. Clients
      // apply the undo event locally, so a full snapshot here would only give a
      // drawer a way to amplify traffic to every player.
      return;
    }
    await this.commit();
  }

  private async handleClear(ws: WebSocket) {
    const player = this.socketPlayer(ws);
    if (!player || player.id !== this.room.drawerId || this.room.phase !== "drawing") return;

    if (this.room.strokes.length === 0) return;

    this.room.strokes = [];
    this.broadcast({ type: "drawing.clear" });
    await this.commit();
  }

  private async handleChat(ws: WebSocket, text: string) {
    const player = this.socketPlayer(ws);
    if (!player) return;

    const trimmed = text.trim().slice(0, MAX_CHAT_LENGTH);
    if (!trimmed) return;

    const isDrawing = this.room.game === "skribbl" && this.room.phase === "drawing";
    const selectedWord = this.room.selectedWord ?? "";
    const isDrawer = player.id === this.room.drawerId;
    const alreadyGuessed =
      this.room.guessedPlayerIds.includes(player.id) || player.guessedCorrectly;

    // Once a player knows the word, everything they type belongs to the
    // private green channel shared by the drawer and correct guessers. Players
    // who have not guessed yet never receive these messages.
    if (isDrawing && (isDrawer || alreadyGuessed)) {
      this.sendSecretChat(player, trimmed);
      return;
    }

    if (!isDrawing) {
      this.broadcastChat(player, trimmed);
      return;
    }

    const correct = isExactGuess(trimmed, selectedWord);

    if (!correct) {
      // A player who has not guessed yet can still accidentally reveal the word
      // inside a longer sentence. Keep that message private as well, but do not
      // award points: only an exact guess counts as correct.
      if (matchesWord(trimmed, selectedWord)) {
        this.sendSecretMessage(player, trimmed);
      } else {
        this.broadcastChat(player, trimmed);
        // A near miss is a private nudge, not a room-wide event.
        if (isCloseGuess(trimmed, selectedWord)) {
          this.sendSystemChat(player.id, "You are very close to the word!", "close_guess");
        }
      }
      return;
    }

    this.room.guessedPlayerIds.push(player.id);
    player.guessedCorrectly = true;

    const remaining = Math.max(
      0,
      Math.floor(((this.room.endsAt ?? Date.now()) - Date.now()) / 1000),
    );
    const points = calculateGuessPoints(
      remaining,
      this.room.settings.drawingTimeSeconds,
      this.room.guessedPlayerIds.length,
    );
    player.score += points;

    this.broadcast({
      type: "game.correct-guess",
      playerId: player.id,
      nickname: player.nickname,
      points,
    });
    this.broadcastGuessChat(player, points);

    const guessers = this.room.players.filter(
      (entry) => entry.id !== this.room.drawerId && entry.connected,
    );
    const allGuessed =
      guessers.length > 0 && guessers.every((entry) => this.room.guessedPlayerIds.includes(entry.id));

    this.broadcastSnapshot();

    if (allGuessed) {
      this.endRound("all-guessed");
      await this.commit();
      return;
    }

    await this.commit();
  }

  private handleReaction(ws: WebSocket, reaction: "like" | "dislike") {
    const player = this.socketPlayer(ws);
    if (!player || this.room.game !== "skribbl" || this.room.phase !== "drawing") return;
    // The drawer rates their own work with the scoreboard, not the chat.
    if (player.id === this.room.drawerId) return;
    // One reaction per player per drawing turn prevents chat spam even when a
    // client bypasses the button state.
    if (this.reactedPlayerIds.has(player.id)) return;
    this.reactedPlayerIds.add(player.id);

    const verb = reaction === "like" ? "liked" : "disliked";
    this.broadcastSystemChat(
      `${player.nickname} ${verb} the drawing`,
      reaction === "like" ? "liked" : "disliked",
    );
  }

  private sendSecretMessage(player: StoredPlayer, text: string) {
    // The sender always sees the message they wrote. Every other socket gets a
    // safe placeholder in the same slot, so chat order is preserved without
    // leaking the word through any realtime event.
    const selectedWord = this.room.selectedWord ?? "";
    const hiddenText = containsSecretWord(SECRET_MESSAGE_PLACEHOLDER, selectedWord)
      ? SECRET_MESSAGE_REDACTED
      : SECRET_MESSAGE_PLACEHOLDER;

    const createdAt = Date.now();
    for (const [ws, playerId] of this.sockets.entries()) {
      if (!playerId) continue;
      const canSeeOriginal = playerId === player.id;
      this.send(ws, {
        type: "chat.message",
        playerId: player.id,
        nickname: player.nickname,
        text: canSeeOriginal ? text : hiddenText,
        createdAt,
        private: true,
      });
    }
  }

  /**
   * Chat from the drawer and correct guessers goes only to players who already
   * know the word. Non-guessers do not receive the event at all, so no hidden
   * placeholder appears in their chat.
   */
  private sendSecretChat(player: StoredPlayer, text: string) {
    const createdAt = Date.now();
    for (const [ws, playerId] of this.sockets.entries()) {
      if (!playerId || !this.knowsSecretWord(playerId)) continue;
      this.send(ws, {
        type: "chat.message",
        playerId: player.id,
        nickname: player.nickname,
        text,
        createdAt,
        kind: "secret",
      });
    }
  }

  private knowsSecretWord(playerId: string): boolean {
    if (playerId === this.room.drawerId) return true;
    if (this.room.guessedPlayerIds.includes(playerId)) return true;
    return this.player(playerId)?.guessedCorrectly === true;
  }

  private broadcastChat(player: StoredPlayer, text: string) {
    this.broadcast({
      type: "chat.message",
      playerId: player.id,
      nickname: player.nickname,
      text,
      createdAt: Date.now(),
    });
  }

  private broadcastSystemChat(text: string, kind?: ChatEventKind) {
    this.broadcast({
      type: "chat.message",
      playerId: "system",
      nickname: "Room",
      text,
      createdAt: Date.now(),
      system: true,
      kind,
    });
  }

  /** Send a system chat line to one player without leaking it to the room. */
  private sendSystemChat(playerId: string, text: string, kind: ChatEventKind) {
    const ws = this.playerSockets.get(playerId);
    if (!ws) return;
    this.send(ws, {
      type: "chat.message",
      playerId: "system",
      nickname: "Room",
      text,
      createdAt: Date.now(),
      system: true,
      kind,
    });
  }

  /**
   * Correct guessers see a personal purple line; everyone else sees the green
   * room announcement. Both carry the semantic kind so the UI stays in charge
   * of presentation.
   */
  private broadcastGuessChat(guesser: StoredPlayer, points: number) {
    const createdAt = Date.now();
    for (const [ws, playerId] of this.sockets.entries()) {
      if (!playerId) continue;
      const own = playerId === guesser.id;
      this.send(ws, {
        type: "chat.message",
        playerId: "system",
        nickname: "Room",
        text: own
          ? "You guessed the word!"
          : `${guesser.nickname} guessed the word (+${points}).`,
        createdAt,
        system: true,
        kind: own ? "own_correct_guess" : "correct_guess",
      });
    }
  }

  private endRound(reason: "all-guessed" | "timeout" | "drawer-disconnected") {
    if (this.room.game !== "skribbl" || this.room.phase !== "drawing") return;

    const drawer = this.player(this.room.drawerId);
    const guessers = this.room.players.filter((entry) => entry.id !== this.room.drawerId);
    if (drawer && this.room.guessedPlayerIds.length > 0) {
      drawer.score += calculateDrawerPoints(this.room.guessedPlayerIds.length, guessers.length);
    }

    this.room.phase = "round-result";
    this.room.endsAt = null;
    this.room.chooseEndsAt = null;
    this.room.roundEndsAt = Date.now() + ROUND_RESULT_MS;

    const word = this.room.selectedWord ?? "";
    this.broadcast({
      type: "game.round.ended",
      reason,
      word,
      rankings: this.rankings(),
    });
    this.broadcastSystemChat(`The word was "${word}".`, "word_revealed");
    this.broadcastSnapshot();
  }

  private finishSkribbl() {
    this.room.phase = "game-over";
    this.room.endsAt = null;
    this.room.chooseEndsAt = null;
    this.room.roundEndsAt = null;
    this.room.drawerId = null;
    this.room.selectedWord = null;
    this.room.selectedWordId = null;
    this.room.wordChoices = [];
    this.room.guessedPlayerIds = [];
    this.room.strokes = [];
    // The match is over, so there is no score left to reclaim.
    this.room.departedPlayers = [];

    const rankings = this.rankings();
    this.broadcast({ type: "game.finished", rankings, winnerId: rankings[0]?.playerId });
    this.broadcastSystemChat("The game is over.", "announcement");
    this.broadcastSnapshot();
  }

  private rankings(): Ranking[] {
    return [...this.room.players]
      .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
      .map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        score: player.score,
      }));
  }

  private async handleChainPlace(ws: WebSocket, row: number, col: number) {
    const player = this.socketPlayer(ws);
    if (!player || this.room.game !== "chain" || this.room.phase !== "playing" || !this.room.chain) {
      return;
    }

    if (this.room.chain.turnEndsAt && Date.now() >= this.room.chain.turnEndsAt) {
      await this.handleChainTimeout();
      await this.commit();
      return;
    }

    const result = applyChainMove(
      this.room.chain,
      player.id,
      row,
      col,
      this.room.roundOrder,
      Date.now(),
      this.room.settings.turnTimeSeconds ?? 45,
    );

    if (!result) {
      this.send(ws, { type: "room.error", code: "INVALID_MOVE", message: "That move is not legal." });
      return;
    }

    this.room.chain = result.state;
    this.syncChainScores();
    this.broadcast({ type: "chain.move", move: result.move, snapshot: this.createSnapshot() });

    for (const eliminatedId of result.eliminated) {
      const eliminated = this.player(eliminatedId);
      if (eliminated) this.broadcastSystemChat(`${eliminated.nickname} was eliminated.`, "announcement");
    }

    this.broadcastSnapshot();

    if (result.winnerId) {
      this.finishChain(result.winnerId);
    } else if (this.room.chain.moveCount >= CHAIN_MAX_MOVES) {
      this.finishChain(this.chainLeader());
    }

    await this.commit();
  }

  private async handleChainSurrender(ws: WebSocket) {
    const player = this.socketPlayer(ws);
    if (!player || this.room.game !== "chain" || this.room.phase !== "playing" || !this.room.chain) {
      return;
    }

    const next = removeChainPlayer(
      this.room.chain,
      player.id,
      this.room.roundOrder,
      Date.now(),
      this.room.settings.turnTimeSeconds ?? 45,
    );
    if (!next) return;

    this.room.chain = next;
    this.syncChainScores();
    this.broadcastSystemChat(`${player.nickname} surrendered.`, "announcement");
    this.broadcastSnapshot();

    if (next.winnerId) {
      this.finishChain(next.winnerId);
    } else if (!next.turnPlayerId) {
      this.finishChain(this.chainLeader());
    }

    await this.commit();
  }

  private chainLeader(): string | null {
    if (!this.room.chain) return null;
    return [...this.room.roundOrder]
      .filter((id) => !this.room.chain?.eliminatedPlayerIds.includes(id))
      .sort(
        (a, b) =>
          countOrbs(this.room.chain?.cells ?? [], b) - countOrbs(this.room.chain?.cells ?? [], a),
      )[0] ?? null;
  }

  private syncChainScores() {
    if (!this.room.chain) return;
    for (const player of this.room.players) {
      player.score = countOrbs(this.room.chain.cells, player.id);
    }
  }

  private finishChain(winnerId: string | null) {
    if (!this.room.chain) return;
    this.room.phase = "game-over";
    this.room.chain.winnerId = winnerId;
    this.room.chain.turnPlayerId = null;
    this.room.chain.turnEndsAt = null;
    this.syncChainScores();

    const order = rankChainPlayers(this.room.chain, this.room.roundOrder);
    const rankings: Ranking[] = order
      .map((playerId) => {
        const player = this.player(playerId);
        if (!player) return null;
        return {
          playerId,
          nickname: player.nickname,
          score: countOrbs(this.room.chain?.cells ?? [], playerId),
        };
      })
      .filter((entry): entry is Ranking => entry !== null);

    const winner = this.player(winnerId);
    if (winner) this.broadcastSystemChat(`${winner.nickname} won the board.`, "announcement");
    this.broadcast({ type: "game.finished", rankings, winnerId: winnerId ?? undefined });
    this.broadcastSnapshot();
  }

  private async handleChainTimeout() {
    if (!this.room.chain || this.room.phase !== "playing") return;
    const currentId = this.room.chain.turnPlayerId;
    if (!currentId) {
      // No one owns the turn: finish instead of leaving an expired deadline
      // that the alarm would keep re-scheduling.
      this.finishChain(this.chainLeader());
      return;
    }

    const current = this.player(currentId);
    if (current) {
      this.broadcast({ type: "chain.turn.timeout", playerId: currentId });
      this.broadcastSystemChat(`${current.nickname} ran out of time.`, "announcement");
    }

    const autoMove = pickAutoMove(this.room.chain, currentId);
    if (!autoMove) {
      const next = removeChainPlayer(
        this.room.chain,
        currentId,
        this.room.roundOrder,
        Date.now(),
        this.room.settings.turnTimeSeconds ?? 45,
      );
      if (next) {
        this.room.chain = next;
        this.syncChainScores();
        this.broadcastSnapshot();
        if (next.winnerId) this.finishChain(next.winnerId);
        else if (!next.turnPlayerId) this.finishChain(this.chainLeader());
      }
      return;
    }

    const result = applyChainMove(
      this.room.chain,
      currentId,
      autoMove.row,
      autoMove.col,
      this.room.roundOrder,
      Date.now(),
      this.room.settings.turnTimeSeconds ?? 45,
    );
    if (!result) return;

    this.room.chain = result.state;
    this.syncChainScores();
    this.broadcast({ type: "chain.move", move: result.move, snapshot: this.createSnapshot() });
    this.broadcastSnapshot();

    if (result.winnerId) this.finishChain(result.winnerId);
    else if (this.room.chain.moveCount >= CHAIN_MAX_MOVES) this.finishChain(this.chainLeader());
  }

  private handleSmashInput(
    ws: WebSocket,
    input: Extract<ClientEvent, { type: "smash.input" }>["input"],
  ) {
    const player = this.socketPlayer(ws);
    if (!player || this.room.game !== "smashkarts" || this.room.phase !== "playing") return;
    // The host simulates every kart itself, so relaying a host-authored input
    // back to the host would double-apply it.
    if (player.id === this.room.hostId) return;

    const hostSocket = this.playerSockets.get(this.room.hostId);
    if (!hostSocket) return;
    this.send(hostSocket, { type: "smash.input", playerId: player.id, input });
  }

  private async handleSmashSnapshot(ws: WebSocket, snapshot: SmashMatchSnapshot) {
    const player = this.socketPlayer(ws);
    if (
      !player ||
      player.id !== this.room.hostId ||
      this.room.game !== "smashkarts" ||
      this.room.phase !== "playing"
    ) {
      return;
    }
    // A rematch resets the engine while an old snapshot can still be in flight.
    if (snapshot.round !== this.room.roundNumber) return;

    const seated = new Map(this.room.players.map((entry) => [entry.id, entry]));
    const seen = new Set<string>();
    const karts = snapshot.karts
      .filter((kart) => {
        if (!seated.has(kart.id) || seen.has(kart.id)) return false;
        seen.add(kart.id);
        return true;
      })
      .map((kart) => {
        // The room owns identity and paint; never let one client spoof another
        // player's nickname or colour through the relayed snapshot.
        const roomPlayer = seated.get(kart.id)!;
        return { ...kart, name: roomPlayer.nickname, color: roomPlayer.color };
      });

    const sanitized: SmashMatchSnapshot = {
      ...snapshot,
      mapId: this.room.settings.mapId ?? snapshot.mapId,
      killTarget: this.room.settings.killTarget ?? snapshot.killTarget,
      karts,
    };

    for (const kart of karts) {
      const roomPlayer = seated.get(kart.id);
      // Keep the room leaderboard correct for late joiners and reconnects
      // without making the Worker simulate the match.
      if (roomPlayer) roomPlayer.score = kart.kills;
    }

    this.room.lastSmashState = sanitized;
    this.room.lastActivity = Date.now();
    this.broadcast({ type: "smash.snapshot", snapshot: sanitized });

    if (sanitized.phase === "over") {
      this.finishSmash(sanitized);
    }

    // Snapshots arrive around 10 Hz. Persisting every frame would hammer
    // Durable Object storage, but keeping a recent copy lets a hibernating
    // room seed late joiners.
    const now = Date.now();
    if (sanitized.phase === "over" || now - this.lastSmashPersistAt >= 2_000) {
      this.lastSmashPersistAt = now;
      await this.persist();
      await this.scheduleAlarm();
    }
  }

  private finishSmash(snapshot: SmashMatchSnapshot) {
    if (this.room.game !== "smashkarts" || this.room.phase !== "playing") return;

    const karts = new Map(snapshot.karts.map((kart) => [kart.id, kart]));
    const rankings: Ranking[] = this.room.players
      .map((player) => {
        const kart = karts.get(player.id);
        const kills = kart?.kills ?? player.score;
        player.score = kills;
        return {
          playerId: player.id,
          nickname: player.nickname,
          score: kills,
          deaths: kart?.deaths ?? 0,
          joinedAt: player.joinedAt,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.deaths - b.deaths ||
          a.joinedAt - b.joinedAt,
      )
      .map(({ playerId, nickname, score }) => ({ playerId, nickname, score }));

    this.room.phase = "game-over";
    this.room.endsAt = null;
    const winnerId = rankings[0]?.playerId ?? null;
    const winner = this.player(winnerId);
    if (winner) this.broadcastSystemChat(`${winner.nickname} won the match.`, "announcement");
    this.broadcast({ type: "game.finished", rankings, winnerId: winnerId ?? undefined });
    this.broadcastSnapshot();
  }

  private async handleRematch(ws: WebSocket) {
    const player = this.socketPlayer(ws);
    if (!player || player.id !== this.room.hostId) {
      this.send(ws, { type: "room.error", code: "NOT_HOST", message: "Only the host can start a rematch." });
      return;
    }
    if (this.room.phase !== "game-over") return;
    if (this.room.players.filter((entry) => entry.connected).length < 2) {
      this.send(ws, {
        type: "room.error",
        code: "NOT_ENOUGH_PLAYERS",
        message: "At least two connected players are needed for a rematch.",
      });
      return;
    }

    this.startGame();
    this.broadcastSystemChat("Rematch started.", "round_started");
    await this.commit();
  }

  private removePlayer(playerId: string, reason: "left" | "disconnected") {
    const player = this.player(playerId);
    if (!player) return;

    const wasDrawer = this.room.drawerId === playerId;
    const wasTurn = this.room.chain?.turnPlayerId === playerId;

    this.room.players = this.room.players.filter((entry) => entry.id !== playerId);
    this.room.roundOrder = this.room.roundOrder.filter((id) => id !== playerId);
    this.room.guessedPlayerIds = this.room.guessedPlayerIds.filter((id) => id !== playerId);
    this.playerSockets.delete(playerId);

    if (this.room.game === "smashkarts" && this.room.lastSmashState) {
      // Drop the seat from the cached snapshot immediately instead of waiting
      // for the host's next frame, so a new joiner never sees a ghost kart.
      this.room.lastSmashState = {
        ...this.room.lastSmashState,
        karts: this.room.lastSmashState.karts.filter((kart) => kart.id !== playerId),
      };
    }

    if (this.room.hostId === playerId) {
      this.transferHost();
    }

    if (this.room.game === "skribbl" && wasDrawer && this.room.phase === "drawing") {
      this.endRound("drawer-disconnected");
    } else if (this.room.game === "skribbl" && wasDrawer && this.room.phase === "choosing") {
      this.nextTurn();
    }

    if (this.room.game === "chain" && this.room.chain && this.room.phase === "playing") {
      const next = removeChainPlayer(
        this.room.chain,
        playerId,
        this.room.roundOrder,
        Date.now(),
        this.room.settings.turnTimeSeconds ?? 45,
      );
      if (next) {
        this.room.chain = next;
        this.syncChainScores();
        if (next.winnerId) this.finishChain(next.winnerId);
        else if (!next.turnPlayerId) this.finishChain(this.chainLeader());
      }
    }

    if (this.room.players.length === 0) {
      // Keep the used marker (version) and creation time so the code is not
      // reallocated before the empty-room TTL alarm fires. The room itself is
      // lobby-empty, so a fresh player can still create it after expiry.
      const previous = this.room;
      this.room = {
        ...createEmptyState(previous.code, previous.game),
        version: previous.version,
        createdAt: previous.createdAt,
        lastActivity: Date.now(),
      };
      return;
    }

    if (
      this.room.players.length < 2 &&
      this.room.game !== "smashkarts" &&
      this.room.phase !== "lobby" &&
      this.room.phase !== "game-over"
    ) {
      if (this.room.game === "chain") this.finishChain(this.room.players[0]?.id ?? null);
      else this.finishSkribbl();
    }

    // Preserve a skribbl seat for the rest of the match. The player keeps their
    // score and can reclaim it by joining again with the same resume token.
    if (
      this.room.game === "skribbl" &&
      this.room.players.length > 0 &&
      (this.room.phase === "choosing" ||
        this.room.phase === "drawing" ||
        this.room.phase === "round-result")
    ) {
      this.room.departedPlayers = this.room.departedPlayers.filter(
        (entry) => entry.id !== player.id && entry.resumeToken !== player.resumeToken,
      );
      this.room.departedPlayers.push({
        ...player,
        connected: false,
        lastSeen: Date.now(),
        departedTurnNumber: this.room.turnNumber,
      });
    }

    this.broadcastSystemChat(
      `${player.nickname} ${reason === "left" ? "left the room" : "disconnected"}.`,
      reason === "left" ? "player_left" : "disconnected",
    );
    if (wasTurn && this.room.chain && !this.room.chain.turnEndsAt) {
      this.room.chain.turnEndsAt = Date.now() + (this.room.settings.turnTimeSeconds ?? 45) * 1000;
    }
  }

  private async commit() {
    this.room.lastActivity = Date.now();
    await this.ctx.storage.put("room", this.room);
    await this.scheduleAlarm();
  }

  private async persist() {
    await this.ctx.storage.put("room", this.room);
  }

  private nextDeadline(now: number): number | null {
    const deadlines: number[] = [];

    if (this.room.game === "skribbl") {
      if (this.room.phase === "choosing" && this.room.chooseEndsAt) {
        deadlines.push(this.room.chooseEndsAt);
      }
      if (this.room.phase === "choosing") {
        const drawer = this.player(this.room.drawerId);
        if (drawer && !drawer.connected) {
          // Skip a drawer who dropped while picking a word instead of waiting
          // for the full auto-choice timeout.
          deadlines.push(drawer.lastSeen + DRAWER_GRACE_MS);
        }
      }
      if (this.room.phase === "drawing") {
        if (this.room.endsAt) deadlines.push(this.room.endsAt);
        if (this.room.roundStartedAt && this.room.endsAt) {
          const duration = this.room.endsAt - this.room.roundStartedAt;
          const letters = this.letterIndices().length;
          const first = Math.floor(letters / 3);
          const second = Math.floor((letters * 2) / 3);
          if (this.room.revealedIndices.length < first) {
            deadlines.push(this.room.roundStartedAt + duration / 3);
          } else if (this.room.revealedIndices.length < second) {
            deadlines.push(this.room.roundStartedAt + (duration * 2) / 3);
          }
        }
        const drawer = this.player(this.room.drawerId);
        if (drawer && !drawer.connected) {
          deadlines.push(drawer.lastSeen + DRAWER_GRACE_MS);
        }
      }
      if (this.room.phase === "round-result" && this.room.roundEndsAt) {
        deadlines.push(this.room.roundEndsAt);
      }
    }

    if (this.room.game === "chain" && this.room.phase === "playing" && this.room.chain?.turnEndsAt) {
      deadlines.push(this.room.chain.turnEndsAt);
    }

    if (
      this.room.game === "smashkarts" &&
      (this.room.phase === "playing" || this.room.phase === "game-over")
    ) {
      const host = this.player(this.room.hostId);
      const hasConnectedGuest =
        host &&
        this.room.players.some((player) => player.connected && player.id !== host.id);
      // Only arm the short host-transfer timer when there is actually someone
      // to promote. Otherwise a room with every seat disconnected would wake
      // every second until the normal reconnect grace expires.
      if (host && !host.connected && hasConnectedGuest) {
        deadlines.push(host.lastSeen + SMASH_HOST_TRANSFER_MS);
      }
    }

    for (const player of this.room.players) {
      if (!player.connected) deadlines.push(player.lastSeen + RECONNECT_GRACE_PERIOD_MS);
    }

    const anyConnected = this.room.players.some((player) => player.connected);
    if (!anyConnected) {
      deadlines.push(this.room.lastActivity + ROOM_INACTIVITY_EXPIRY_MS);
    }

    const reservation = this.activeReservation(now);
    if (reservation) {
      // While a code is reserved, the empty-room TTL must not delete it.
      deadlines.push(reservation.expiresAt);
    } else if (this.room.players.length === 0) {
      deadlines.push(this.room.lastActivity + EMPTY_ROOM_TTL_MS);
    }

    for (const [ws, state] of this.socketState) {
      if (!this.sockets.get(ws)) {
        deadlines.push(state.createdAt + UNJOINED_SOCKET_TTL_MS);
      }
    }

    const valid = deadlines.filter((deadline) => Number.isFinite(deadline));
    const future = valid.filter((deadline) => deadline > now);
    if (future.length > 0) return Math.min(...future);
    // A room that slept through its own deadlines (hibernation, late alarm)
    // must still wake up once so `alarm()` can finish or clean it up. Returning
    // null here would delete the alarm and strand the room forever.
    if (valid.length > 0) return now + 1;
    return null;
  }

  private async scheduleAlarm() {
    const now = Date.now();
    const deadline = this.nextDeadline(now);
    if (deadline === null) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(Math.max(now + 100, Math.ceil(deadline)));
  }

  private letterIndices(): number[] {
    if (!this.room.selectedWord) return [];
    return [...this.room.selectedWord]
      .map((character, index) => ({ character, index }))
      .filter(({ character }) => /[\p{L}\p{N}]/u.test(character))
      .map(({ index }) => index);
  }

  private revealHints(now: number) {
    if (
      this.room.phase !== "drawing" ||
      !this.room.roundStartedAt ||
      !this.room.endsAt ||
      !this.room.selectedWord
    ) {
      return;
    }

    const duration = this.room.endsAt - this.room.roundStartedAt;
    if (duration <= 0) return;

    const ratio = (now - this.room.roundStartedAt) / duration;
    const letters = this.letterIndices();
    const target =
      ratio >= 2 / 3
        ? Math.floor((letters.length * 2) / 3)
        : ratio >= 1 / 3
          ? Math.floor(letters.length / 3)
          : 0;

    if (target <= this.room.revealedIndices.length) return;

    const next = new Set(this.room.revealedIndices);
    for (let i = 0; i < target; i++) {
      const position = letters[Math.min(letters.length - 1, Math.floor(((i + 0.5) * letters.length) / target))];
      if (position !== undefined) next.add(position);
    }

    this.room.revealedIndices = [...next].sort((a, b) => a - b);
    this.broadcast({ type: "game.word.hint", maskedWord: this.maskedWord() ?? "" });
    this.broadcastSnapshot();
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    let changed = false;

    if (this.clearExpiredReservation(now)) {
      changed = true;
      logRoom("info", "room.reservation_expired", {
        game: this.room.game,
        code: safeCode(this.room.code),
      });
    }

    if (this.room.game === "skribbl") {
      if (this.room.phase === "choosing") {
        const drawer = this.player(this.room.drawerId);
        if (drawer && !drawer.connected && now - drawer.lastSeen >= DRAWER_GRACE_MS) {
          // Skip a drawer who dropped while picking a word instead of waiting
          // for the full auto-choice timeout.
          this.nextTurn();
          changed = true;
        } else if (this.room.chooseEndsAt && now >= this.room.chooseEndsAt) {
          // A persisted choosing phase can be missing its offers (older build
          // or corrupted state). Advance instead of re-arming the same expired
          // deadline forever.
          if (this.room.wordChoices.length > 0) {
            this.applyWordChoice(this.room.wordChoices[0]?.id ?? "");
          } else {
            this.nextTurn();
          }
          changed = true;
        }
      } else if (this.room.phase === "drawing") {
        const drawer = this.player(this.room.drawerId);
        if (drawer && !drawer.connected && now - drawer.lastSeen >= DRAWER_GRACE_MS) {
          this.endRound("drawer-disconnected");
          changed = true;
        } else if (this.room.endsAt && now >= this.room.endsAt) {
          this.endRound("timeout");
          changed = true;
        } else {
          const before = this.room.revealedIndices.length;
          this.revealHints(now);
          if (this.room.revealedIndices.length !== before) changed = true;
        }
      } else if (this.room.phase === "round-result" && this.room.roundEndsAt && now >= this.room.roundEndsAt) {
        this.nextTurn();
        changed = true;
      }
    } else if (this.room.game === "chain" && this.room.phase === "playing") {
      if (this.room.chain?.turnEndsAt && now >= this.room.chain.turnEndsAt) {
        await this.handleChainTimeout();
        changed = true;
      }
    } else if (
      this.room.game === "smashkarts" &&
      (this.room.phase === "playing" || this.room.phase === "game-over")
    ) {
      const host = this.player(this.room.hostId);
      const next =
        host && !host.connected
          ? this.room.players.find((player) => player.connected && player.id !== host.id)
          : undefined;
      if (host && !host.connected && next && now - host.lastSeen >= SMASH_HOST_TRANSFER_MS) {
        // The old host keeps its seat for the reconnect grace period. If it
        // comes back it returns as a guest so two engines never race.
        this.room.hostId = next.id;
        this.broadcastSystemChat(`${next.nickname} is now hosting the match.`, "announcement");
        changed = true;
      }
    }

    const stale = this.room.players.filter(
      (player) => !player.connected && now - player.lastSeen > RECONNECT_GRACE_PERIOD_MS,
    );
    for (const player of stale) {
      this.removePlayer(player.id, "disconnected");
      logRoom("info", "room.player_removed", {
        game: this.room.game,
        code: safeCode(this.room.code),
        reason: "grace_expired",
        players: this.room.players.length,
      });
      changed = true;
    }

    for (const [ws, state] of this.socketState) {
      if (this.sockets.get(ws)) continue;
      if (now - state.createdAt < UNJOINED_SOCKET_TTL_MS) continue;
      try {
        ws.close(1008, "Join a room first");
      } catch {
        // Already closed.
      }
      this.sockets.delete(ws);
      this.socketState.delete(ws);
    }

    const anyConnected = this.room.players.some((player) => player.connected);
    if (
      this.room.players.length === 0 &&
      !this.activeReservation(now) &&
      now - this.room.lastActivity >= EMPTY_ROOM_TTL_MS
    ) {
      this.room = createEmptyState(this.room.code, this.room.game);
      await this.ctx.storage.delete("room");
      await this.ctx.storage.deleteAlarm();
      logRoom("info", "room.expired", { game: this.room.game, code: safeCode(this.room.code) });
      return;
    }

    if (
      !anyConnected &&
      this.room.players.length > 0 &&
      now - this.room.lastActivity > ROOM_INACTIVITY_EXPIRY_MS
    ) {
      this.room = createEmptyState(this.room.code, this.room.game);
      await this.ctx.storage.delete("room");
      await this.ctx.storage.deleteAlarm();
      logRoom("info", "room.expired_inactive", {
        game: this.room.game,
        code: safeCode(this.room.code),
      });
      return;
    }

    if (changed) {
      this.broadcastSnapshot();
      await this.persist();
    }
    await this.scheduleAlarm();
  }
}

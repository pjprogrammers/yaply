import type { DurableObjectState } from "@cloudflare/workers-types";
import type { GamePhase, GameSettings, Player, Stroke, RoomSnapshot } from "@yaply/shared/types";
import type { ServerEvent, ClientEvent } from "@yaply/shared/events";
import { DEFAULT_GAME_SETTINGS, MAX_STROKES_PER_ROUND } from "@yaply/shared/constants";
import { ClientEventSchema } from "@yaply/shared/schemas";
import { generateRoomCode } from "./utils";
import { pickWords, maskWord, normalizeGuess } from "./words-util";
import { calculateGuessPoints, calculateDrawerPoints } from "./scoring";

type PrivateGameState = {
  code: string;
  phase: GamePhase;
  hostId: string;
  players: Map<string, Player>;
  settings: GameSettings;
  roundNumber: number;
  drawerId: string | null;
  selectedWord: string | null;
  selectedWordId: string | null;
  wordChoices: Map<string, string>;
  endsAt: number | null;
  strokes: Stroke[];
  guessedPlayerIds: Set<string>;
  roundOrder: string[];
  version: number;
};

export class GameRoom {
  state: DurableObjectState;
  env: any;
  private gameState: PrivateGameState;
  private sessions: Map<string, WebSocket> = new Map(); // playerId -> socket
  private sockets: Map<WebSocket, string> = new Map(); // socket -> playerId

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.gameState = this.initState();
  }

  private initState(): PrivateGameState {
    return {
      code: generateRoomCode(),
      phase: "lobby",
      hostId: "",
      players: new Map(),
      settings: { ...DEFAULT_GAME_SETTINGS },
      roundNumber: 0,
      drawerId: null,
      selectedWord: null,
      selectedWordId: null,
      wordChoices: new Map(),
      endsAt: null,
      strokes: [],
      guessedPlayerIds: new Set(),
      roundOrder: [],
      version: 0,
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 400 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.handleSession(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private handleSession(ws: WebSocket) {
    ws.accept();
    ws.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        const parsed = ClientEventSchema.safeParse(data);
        if (!parsed.success) {
          this.send(ws, { type: "room.error", code: "INVALID_EVENT", message: "Invalid event" });
          return;
        }
        await this.handleEvent(ws, parsed.data as ClientEvent);
      } catch (e) {
        this.send(ws, { type: "room.error", code: "PARSE_ERROR", message: "Parse error" });
      }
    });
    ws.addEventListener("close", () => {
      const pid = this.sockets.get(ws);
      if (pid) {
        const p = this.gameState.players.get(pid);
        if (p) {
          p.connected = false;
        }
        this.sockets.delete(ws);
        this.sessions.delete(pid);
        this.broadcast({ type: "room.player.left", playerId: pid });
        this.broadcastSnapshot();
      }
    });
  }

  private send(ws: WebSocket, event: ServerEvent) {
    try {
      ws.send(JSON.stringify(event));
    } catch {}
  }

  private broadcast(event: ServerEvent) {
    for (const ws of this.sockets.keys()) {
      this.send(ws, event);
    }
  }

  private broadcastSnapshot() {
    const snapshot = this.createSnapshot();
    this.broadcast({ type: "room.snapshot", snapshot });
  }

  private createSnapshot(): RoomSnapshot {
    return {
      code: this.gameState.code,
      phase: this.gameState.phase,
      hostId: this.gameState.hostId,
      players: Array.from(this.gameState.players.values()),
      settings: this.gameState.settings,
      roundNumber: this.gameState.roundNumber,
      drawerId: this.gameState.drawerId,
      maskedWord: this.gameState.phase === "drawing" && this.gameState.selectedWord
        ? maskWord(this.gameState.selectedWord)
        : null,
      endsAt: this.gameState.endsAt,
      strokes: this.gameState.strokes.slice(-MAX_STROKES_PER_ROUND),
      version: this.gameState.version++,
    };
  }

  private async handleEvent(ws: WebSocket, event: ClientEvent) {
    switch (event.type) {
      case "room.create":
        await this.handleCreate(ws, event);
        break;
      case "room.join":
        await this.handleJoin(ws, event);
        break;
      case "room.start":
        await this.handleStart(ws);
        break;
      case "game.word.choose":
        await this.handleChooseWord(ws, event);
        break;
      case "drawing.stroke":
        await this.handleStroke(ws, event);
        break;
      case "drawing.clear":
        await this.handleClear(ws);
        break;
      case "chat.guess":
        await this.handleGuess(ws, event);
        break;
      case "room.sync":
        this.send(ws, { type: "room.snapshot", snapshot: this.createSnapshot() });
        break;
      default:
        break;
    }
  }

  private async handleCreate(ws: WebSocket, event: any) {
    const pid = crypto.randomUUID();
    const player: Player = {
      id: pid,
      nickname: event.nickname,
      avatar: "default",
      score: 0,
      connected: true,
      guessedCorrectly: false,
      joinedAt: Date.now(),
    };
    this.gameState.hostId = pid;
    this.gameState.players.set(pid, player);
    this.sessions.set(pid, ws);
    this.sockets.set(ws, pid);
    this.broadcastSnapshot();
  }

  private async handleJoin(ws: WebSocket, event: any) {
    if (this.gameState.players.size >= this.gameState.settings.maxPlayers && this.gameState.phase !== "lobby") {
      this.send(ws, { type: "room.error", code: "ROOM_FULL", message: "Room is full" });
      return;
    }
    const pid = crypto.randomUUID();
    const player: Player = {
      id: pid,
      nickname: event.nickname,
      avatar: "default",
      score: 0,
      connected: true,
      guessedCorrectly: false,
      joinedAt: Date.now(),
    };
    this.gameState.players.set(pid, player);
    this.sessions.set(pid, ws);
    this.sockets.set(ws, pid);
    this.broadcastSnapshot();
  }

  private async handleStart(ws: WebSocket) {
    const pid = this.sockets.get(ws);
    if (!pid || pid !== this.gameState.hostId) return;
    if (this.gameState.players.size < 2) {
      this.send(ws, { type: "room.error", code: "NOT_ENOUGH_PLAYERS", message: "Need at least 2 players" });
      return;
    }
    this.gameState.phase = "lobby";
    this.startGame();
  }

  private startGame() {
    this.gameState.roundNumber = 0;
    this.gameState.roundOrder = Array.from(this.gameState.players.keys());
    // shuffle
    for (let i = this.gameState.roundOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.gameState.roundOrder[i], this.gameState.roundOrder[j]] = [this.gameState.roundOrder[j], this.gameState.roundOrder[i]];
    }
    for (const p of this.gameState.players.values()) {
      p.score = 0;
      p.guessedCorrectly = false;
    }
    this.nextTurn();
  }

  private nextTurn() {
    this.gameState.guessedPlayerIds.clear();
    this.gameState.strokes = [];
    this.gameState.roundNumber++;
    const maxTurns = this.gameState.settings.rounds * this.gameState.roundOrder.length;
    if (this.gameState.roundNumber > maxTurns) {
      this.finishGame();
      return;
    }
    const idx = (this.gameState.roundNumber - 1) % this.gameState.roundOrder.length;
    this.gameState.drawerId = this.gameState.roundOrder[idx];
    const words = pickWords(this.gameState.settings.wordCount || 3);
    this.gameState.wordChoices = new Map();
    words.forEach((w, i) => this.gameState.wordChoices.set(`w${i}`, w));
    this.gameState.selectedWord = null;
    this.gameState.phase = "choosing";
    this.gameState.endsAt = null;
    // send choices only to drawer
    const drawerWs = this.sessions.get(this.gameState.drawerId!);
    if (drawerWs) {
      this.send(drawerWs, { type: "game.word.choices", choices: Array.from(this.gameState.wordChoices.entries()).map(([id, display]) => ({ id, display })) });
    }
    this.broadcastSnapshot();
  }

  private async handleChooseWord(ws: WebSocket, event: any) {
    const pid = this.sockets.get(ws);
    if (!pid || pid !== this.gameState.drawerId || this.gameState.phase !== "choosing") return;
    const word = this.gameState.wordChoices.get(event.wordId);
    if (!word) return;
    this.gameState.selectedWord = word;
    this.gameState.phase = "drawing";
    this.gameState.endsAt = Date.now() + this.gameState.settings.drawingTimeSeconds * 1000;
    this.startTimer();
    this.broadcastSnapshot();
  }

  private startTimer() {
    // simple timer check
    setTimeout(() => {
      if (this.gameState.phase === "drawing" && this.gameState.endsAt && Date.now() >= this.gameState.endsAt) {
        this.endTurn("timeout");
      }
    }, (this.gameState.endsAt! - Date.now()) + 100);
  }

  private async handleStroke(ws: WebSocket, event: any) {
    const pid = this.sockets.get(ws);
    if (!pid || pid !== this.gameState.drawerId || this.gameState.phase !== "drawing") return;
    if (event.points.length > 1000) return;
    const stroke: Stroke = { id: event.strokeId, playerId: pid, color: event.color, width: event.width, points: event.points };
    this.gameState.strokes.push(stroke);
    if (this.gameState.strokes.length > MAX_STROKES_PER_ROUND) {
      this.gameState.strokes.shift();
    }
    this.broadcast({ type: "drawing.stroke", strokeId: stroke.id, playerId: stroke.playerId, color: stroke.color, width: stroke.width, points: stroke.points });
  }

  private async handleClear(ws: WebSocket) {
    const pid = this.sockets.get(ws);
    if (!pid || pid !== this.gameState.drawerId || this.gameState.phase !== "drawing") return;
    this.gameState.strokes = [];
    this.broadcast({ type: "drawing.clear" });
  }

  private async handleGuess(ws: WebSocket, event: any) {
    if (this.gameState.phase !== "drawing") return;
    const pid = this.sockets.get(ws);
    if (!pid) return;
    if (pid === this.gameState.drawerId) return;
    if (this.gameState.guessedPlayerIds.has(pid)) return;
    const guess = normalizeGuess(event.text);
    const word = normalizeGuess(this.gameState.selectedWord || "");
    if (guess === word) {
      this.gameState.guessedPlayerIds.add(pid);
      const p = this.gameState.players.get(pid);
      if (p) {
        p.guessedCorrectly = true;
        const pts = calculateGuessPoints(Math.max(0, Math.floor((this.gameState.endsAt! - Date.now()) / 1000)), this.gameState.settings.drawingTimeSeconds, this.gameState.guessedPlayerIds.size);
        p.score += pts;
        this.broadcast({ type: "game.correct-guess", playerId: pid, nickname: p.nickname, points: pts });
      }
      const nonDrawer = Array.from(this.gameState.players.keys()).filter(id => id !== this.gameState.drawerId);
      if (nonDrawer.every(id => this.gameState.guessedPlayerIds.has(id))) {
        this.endTurn("all-guessed");
      }
    } else {
      const p = this.gameState.players.get(pid);
      if (p) {
        this.broadcast({ type: "chat.message", playerId: pid, nickname: p.nickname, text: event.text, createdAt: Date.now() });
      }
    }
    this.broadcastSnapshot();
  }

  private endTurn(reason: "all-guessed" | "timeout" | "drawer-disconnected") {
    if (this.gameState.phase !== "drawing") return;
    this.gameState.phase = "round-result";
    const drawer = this.gameState.drawerId;
    if (drawer) {
      const correct = this.gameState.guessedPlayerIds.size;
      const nonDrawer = Array.from(this.gameState.players.keys()).filter(id => id !== drawer);
      const pts = calculateDrawerPoints(correct, nonDrawer.length);
      const dp = this.gameState.players.get(drawer);
      if (dp && correct > 0) dp.score += pts;
    }
    this.broadcast({ type: "game.round.ended", reason });
    this.broadcastSnapshot();
    setTimeout(() => this.nextTurn(), 4500);
  }

  private finishGame() {
    this.gameState.phase = "game-over";
    const rankings = Array.from(this.gameState.players.values())
      .sort((a, b) => b.score - a.score)
      .map(p => ({ playerId: p.id, nickname: p.nickname, score: p.score }));
    this.broadcast({ type: "game.finished", rankings });
    this.broadcastSnapshot();
  }
}

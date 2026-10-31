import { PROTOCOL_VERSION } from "./constants";
import type { ClientEvent, ServerEvent } from "./events";
import { parseServerEvent } from "./schemas";
import { normalizeRealtimeBaseUrl } from "./config";
import type { GameKind, GameSettings, RoomSnapshot } from "./types";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed";

export type GameSocketOptions = {
  baseUrl: string;
  code: string;
  game: GameKind;
  nickname: string;
  create?: boolean;
  settings?: Partial<GameSettings>;
  resumeToken?: string | null;
  onSnapshot: (snapshot: RoomSnapshot) => void;
  onEvent?: (event: ServerEvent) => void;
  onStatus?: (status: ConnectionStatus) => void;
  onWelcome?: (playerId: string, resumeToken: string) => void;
  onError?: (code: string, message: string) => void;
};

const FATAL_CODES = new Set([
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_EXISTS",
  "GAME_MISMATCH",
  "ROOM_IN_PROGRESS",
  "RESUME_FAILED",
  "PROTOCOL_MISMATCH",
]);

const MAX_QUEUED_EVENTS = 100;
const MAX_PROTOCOL_ERRORS = 5;

function roomUrl(baseUrl: string, code: string, game: GameKind): string {
  const base = normalizeRealtimeBaseUrl(baseUrl);
  if (!base) return "";
  return `${base}/${encodeURIComponent(code)}?game=${encodeURIComponent(game)}`;
}

export class GameSocket {
  private socket: WebSocket | null = null;
  private closed = false;
  private status: ConnectionStatus = "disconnected";
  private resumeToken: string | null;
  private retry = 0;
  private reconnectTimer: number | null = null;
  private queue: ClientEvent[] = [];
  private welcome = false;
  private protocolErrors = 0;

  constructor(private readonly options: GameSocketOptions) {
    this.resumeToken = options.resumeToken ?? null;
  }

  connect(): void {
    if (this.closed) return;
    this.open();
  }

  send(event: ClientEvent): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
      return;
    }
    if (this.queue.length >= MAX_QUEUED_EVENTS) this.queue.shift();
    this.queue.push(event);
  }

  close(): void {
    this.closed = true;
    this.clearReconnect();
    this.socket?.close();
    this.socket = null;
    this.setStatus("disconnected");
  }

  private fail(code: string, message: string): void {
    this.closed = true;
    this.clearReconnect();
    this.setStatus("failed");
    this.options.onError?.(code, message);
    try {
      this.socket?.close();
    } catch {
      // Already closed.
    }
    this.socket = null;
  }

  private open(): void {
    if (this.closed) return;

    const url = roomUrl(this.options.baseUrl, this.options.code, this.options.game);
    if (!url) {
      this.fail("BAD_URL", "The realtime server URL is not configured.");
      return;
    }

    this.setStatus(this.retry === 0 ? "connecting" : "reconnecting");

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.fail("BAD_URL", "The realtime URL is not valid.");
      return;
    }

    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.socket !== socket) return;
      this.retry = 0;
      this.setStatus("connected");

      if (this.resumeToken) {
        this.sendNow({
          type: "room.join",
          protocolVersion: PROTOCOL_VERSION,
          code: this.options.code,
          game: this.options.game,
          nickname: this.options.nickname,
          resumeToken: this.resumeToken,
        });
      } else if (this.options.create && !this.welcome) {
        this.sendNow({
          type: "room.create",
          protocolVersion: PROTOCOL_VERSION,
          game: this.options.game,
          nickname: this.options.nickname,
          settings: this.options.settings,
        });
      } else {
        this.sendNow({
          type: "room.join",
          protocolVersion: PROTOCOL_VERSION,
          code: this.options.code,
          game: this.options.game,
          nickname: this.options.nickname,
        });
      }

      for (const event of this.queue.splice(0)) {
        this.sendNow(event);
      }
    });

    socket.addEventListener("message", (message) => {
      if (this.socket !== socket) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(String(message.data));
      } catch {
        this.noteProtocolError("PROTOCOL_ERROR", "The server sent an unreadable message.");
        return;
      }

      const result = parseServerEvent(parsed);
      if (!result.success) {
        this.noteProtocolError("PROTOCOL_ERROR", "The server sent a message this client does not understand.");
        return;
      }

      const event = result.data as ServerEvent;

      if (event.type === "room.welcome") {
        if (event.protocolVersion !== PROTOCOL_VERSION) {
          this.fail("PROTOCOL_MISMATCH", "This page is out of date. Refresh to reconnect.");
          return;
        }
        this.welcome = true;
        this.resumeToken = event.resumeToken;
        this.options.onWelcome?.(event.playerId, event.resumeToken);
      }

      if (event.type === "room.error") {
        this.options.onError?.(event.code, event.message);
        if (FATAL_CODES.has(event.code)) {
          this.fail(event.code, event.message);
          return;
        }
      }

      if (event.type === "room.closed") {
        this.fail("ROOM_CLOSED", event.reason);
        return;
      }

      if (event.type === "room.snapshot") {
        this.options.onSnapshot(event.snapshot);
      }

      this.options.onEvent?.(event);
    });

    socket.addEventListener("close", (event) => {
      if (this.socket === socket) this.socket = null;
      if (this.closed) {
        this.setStatus("disconnected");
        return;
      }
      // 4000 means another tab took over this seat. Reconnecting would fight it.
      if (event.code === 4000) {
        this.fail("SESSION_REPLACED", "This room was opened in another tab.");
        return;
      }
      this.scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      if (socket.readyState !== WebSocket.CLOSED) return;
      if (!this.closed) this.scheduleReconnect();
    });
  }

  private noteProtocolError(code: string, message: string): void {
    this.protocolErrors += 1;
    if (this.protocolErrors >= MAX_PROTOCOL_ERRORS) {
      this.fail(code, message);
    }
  }

  private sendNow(event: ClientEvent): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer !== null) return;
    this.setStatus("reconnecting");
    const delay = Math.min(10_000, 500 * 2 ** this.retry);
    this.retry += 1;
    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay) as unknown as number;
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.options.onStatus?.(status);
  }
}

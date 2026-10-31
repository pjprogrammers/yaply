import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GameSocket } from "@yaply/shared/client";

type Listener = (event: any) => unknown;

class FakeSocket {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: FakeSocket[] = [];

  readyState = 0;
  readonly sent: any[] = [];
  readonly listeners = new Map<string, Listener[]>();
  closed: { code?: number; reason?: string } | null = null;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === FakeSocket.CLOSED) return;
    this.readyState = FakeSocket.CLOSED;
    this.closed = { code, reason };
    this.emit("close", { code, reason });
  }

  emit(type: string, event: any): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  open(): void {
    this.readyState = FakeSocket.OPEN;
    this.emit("open", {});
  }

  receive(payload: unknown): void {
    this.emit("message", { data: JSON.stringify(payload) });
  }

  lastSent(): any {
    return this.sent[this.sent.length - 1];
  }
}

const originalWebSocket = globalThis.WebSocket;

beforeEach(() => {
  FakeSocket.instances = [];
  (globalThis as any).WebSocket = FakeSocket;
});

afterEach(() => {
  (globalThis as any).WebSocket = originalWebSocket;
});

describe("GameSocket room creation fallback", () => {
  it("joins an existing room when a copied create link gets ROOM_EXISTS", () => {
    const errors: Array<{ code: string; message: string }> = [];
    const snapshots: unknown[] = [];
    const socket = new GameSocket({
      baseUrl: "ws://localhost:8787/room",
      code: "abc123",
      game: "skribbl",
      nickname: "Alice",
      create: true,
      onSnapshot: (snapshot) => snapshots.push(snapshot),
      onError: (code, message) => errors.push({ code, message }),
    });

    socket.connect();
    const transport = FakeSocket.instances[0];
    expect(transport.url).toBe("ws://localhost:8787/room/abc123?game=skribbl");
    transport.open();
    expect(transport.lastSent().type).toBe("room.create");

    transport.receive({ type: "room.error", code: "ROOM_EXISTS", message: "Already in use." });

    // The fallback must not surface a fatal error or close the connection.
    expect(errors).toHaveLength(0);
    expect(transport.closed).toBeNull();
    expect(transport.lastSent()).toMatchObject({
      type: "room.join",
      code: "abc123",
      game: "skribbl",
      nickname: "Alice",
    });
    expect(transport.lastSent().protocolVersion).toBe(1);

    transport.receive({
      type: "room.snapshot",
      snapshot: {
        code: "abc123",
        game: "skribbl",
        phase: "lobby",
        hostId: "player-1",
        players: [],
        settings: {
          maxPlayers: 8,
          rounds: 3,
          drawingTimeSeconds: 80,
          language: "en",
          allowLateJoin: false,
          wordCount: 3,
          turnTimeSeconds: 45,
        },
        roundNumber: 0,
        drawerId: null,
        maskedWord: null,
        endsAt: null,
        strokes: [],
        chain: null,
        version: 1,
      },
    });
    expect(snapshots).toHaveLength(1);
  });

  it("treats a later ROOM_EXISTS as fatal instead of looping", () => {
    const errors: Array<{ code: string; message: string }> = [];
    let status = "";
    const socket = new GameSocket({
      baseUrl: "ws://localhost:8787/room",
      code: "abc123",
      game: "chain",
      nickname: "Alice",
      create: true,
      onSnapshot: () => {},
      onError: (code, message) => errors.push({ code, message }),
      onStatus: (next) => {
        status = next;
      },
    });

    socket.connect();
    const transport = FakeSocket.instances[0];
    transport.open();
    transport.receive({ type: "room.error", code: "ROOM_EXISTS", message: "First." });
    expect(transport.lastSent().type).toBe("room.join");

    transport.receive({ type: "room.error", code: "ROOM_EXISTS", message: "Second." });
    expect(errors.at(-1)?.code).toBe("ROOM_EXISTS");
    expect(status).toBe("failed");
    expect(transport.closed).not.toBeNull();
  });
});

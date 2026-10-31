import type { DurableObjectState } from "@cloudflare/workers-types";
import { GameRoom } from "../src/Room";

type Listener = (event: any) => unknown;

export class FakeStorage {
  readonly map = new Map<string, unknown>();
  alarm: number | null = null;

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    this.map.set(key, structuredClone(value));
  }

  async delete(key: string): Promise<boolean> {
    return this.map.delete(key);
  }

  async deleteAll(): Promise<void> {
    this.map.clear();
  }

  async setAlarm(at: number): Promise<void> {
    this.alarm = at;
  }

  async deleteAlarm(): Promise<void> {
    this.alarm = null;
  }
}

export class FakeDurableObjectState {
  readonly storage = new FakeStorage();
  ready: Promise<void> = Promise.resolve();

  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
    const promise = callback();
    this.ready = promise.then(() => undefined);
    return promise;
  }

  waitUntil(): void {}
}

export class FakeWebSocket {
  readyState = 0;
  readonly sent: any[] = [];
  readonly listeners = new Map<string, Listener[]>();
  closed: { code?: number; reason?: string } | null = null;

  accept(): void {
    this.readyState = 1;
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
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.closed = { code, reason };
    void this.emit("close", { code, reason });
  }

  async emit(type: string, event: any): Promise<void> {
    for (const listener of this.listeners.get(type) ?? []) {
      await listener(event);
    }
  }

  async message(payload: unknown): Promise<void> {
    await this.emit("message", {
      data: typeof payload === "string" ? payload : JSON.stringify(payload),
    });
  }

  events(type?: string): any[] {
    return type ? this.sent.filter((event) => event.type === type) : this.sent;
  }

  last(type: string): any {
    const events = this.events(type);
    return events[events.length - 1];
  }
}

export type RoomHarness = {
  room: GameRoom;
  state: FakeDurableObjectState;
  connect: () => FakeWebSocket;
};

export async function makeRoom(
  game: "skribbl" | "chain",
  code = "abc123",
  options: { reserve?: boolean } = {},
): Promise<RoomHarness> {
  const state = new FakeDurableObjectState();
  const room = new GameRoom(state as unknown as DurableObjectState, {});
  await state.ready;

  (room as any).requestedCode = code;
  (room as any).requestedGame = game;

  if (options.reserve !== false) {
    const response = await room.fetch(
      new Request("https://room.internal/internal/reserve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game, code }),
      }),
    );
    if (!response.ok) {
      throw new Error(`Could not reserve test room: ${response.status}`);
    }
  }

  return {
    room,
    state,
    connect: () => {
      const socket = new FakeWebSocket();
      (room as any).handleSession(socket);
      return socket;
    },
  };
}

export async function createAndJoin(
  game: "skribbl" | "chain",
  names: string[] = ["Alice", "Bob"],
  code = "abc123",
): Promise<{
  harness: RoomHarness;
  sockets: FakeWebSocket[];
  playerIds: string[];
  tokens: string[];
}> {
  const harness = await makeRoom(game, code);
  const sockets: FakeWebSocket[] = [];
  const playerIds: string[] = [];
  const tokens: string[] = [];

  for (let index = 0; index < names.length; index += 1) {
    const socket = harness.connect();
    sockets.push(socket);
    if (index === 0) {
      await socket.message({
        type: "room.create",
        protocolVersion: 1,
        game,
        nickname: names[index],
      });
    } else {
      await socket.message({
        type: "room.join",
        protocolVersion: 1,
        game,
        code,
        nickname: names[index],
      });
    }
    const welcome = socket.last("room.welcome");
    playerIds.push(welcome.playerId);
    tokens.push(welcome.resumeToken);
  }

  return { harness, sockets, playerIds, tokens };
}

export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

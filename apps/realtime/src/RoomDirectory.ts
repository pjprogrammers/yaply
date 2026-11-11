import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@yaply/shared/constants";
import type { GameKind } from "@yaply/shared/types";

type Env = {
  GAME_ROOMS: DurableObjectNamespace;
};

type DirectoryState = {
  /** The public room Play hands out, or null when no room is open. */
  openCode: string | null;
};

type RoomStatus = {
  joinable: boolean;
  players: number;
  seats: number;
  maxPlayers: number;
  reserved: boolean;
};

export type OpenRoomResult = {
  code: string;
  game: GameKind;
  host: boolean;
  created: boolean;
};

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function generateRoomCode(): string {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_ALPHABET[bytes[index] % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

function roomKey(game: GameKind, code: string): string {
  return `${game}:${code}`;
}

function parseGame(value: unknown): GameKind | null {
  return value === "skribbl" ||
    value === "chain" ||
    value === "smashkarts" ||
    value === "holeio" ||
    value === "whos-the-spy"
    ? value
    : null;
}

/**
 * A tiny singleton Durable Object that owns the "open public room" pointer for
 * one game. Requests are serialized inside the object, which makes matchmaking
 * atomic: simultaneous Play clicks either all receive the same room or exactly
 * one of them reserves the next room after the current one fills.
 *
 * The directory never trusts a cached player count. It asks the room itself for
 * its live status before handing it out, so a room that emptied or filled in
 * the meantime is never returned.
 */
export class RoomDirectory {
  private state: DirectoryState = { openCode: null };
  private readonly loaded: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    this.loaded = this.load();
    this.ctx.blockConcurrencyWhile(() => this.loaded);
  }

  private async load(): Promise<void> {
    const stored = await this.ctx.storage.get<Partial<DirectoryState>>("directory");
    this.state = {
      openCode: typeof stored?.openCode === "string" ? stored.openCode : null,
    };
  }

  /** Serializes read-modify-write work across all requests to this object. */
  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put("directory", this.state);
  }

  private async roomStatus(game: GameKind, code: string): Promise<RoomStatus | null> {
    const stub = this.env.GAME_ROOMS.get(
      this.env.GAME_ROOMS.idFromName(roomKey(game, code)),
    );
    const response = await stub.fetch("https://room.internal/internal/open-status");
    if (!response.ok) return null;
    const body = (await response.json().catch(() => null)) as
      | Partial<RoomStatus>
      | null;
    if (!body || typeof body.joinable !== "boolean") return null;
    return {
      joinable: body.joinable,
      players: typeof body.players === "number" ? body.players : 0,
      seats: typeof body.seats === "number" ? body.seats : 0,
      maxPlayers: typeof body.maxPlayers === "number" ? body.maxPlayers : 0,
      reserved: body.reserved === true,
    };
  }

  private async reserve(game: GameKind, code: string): Promise<boolean> {
    const stub = this.env.GAME_ROOMS.get(
      this.env.GAME_ROOMS.idFromName(roomKey(game, code)),
    );
    const response = await stub.fetch("https://room.internal/internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game, code }),
    });
    if (!response.ok) return false;
    const body = (await response.json().catch(() => null)) as
      | { reserved?: unknown }
      | null;
    return body?.reserved === true;
  }

  private async createOpenRoom(game: GameKind): Promise<string | null> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateRoomCode();
      if (await this.reserve(game, code)) return code;
    }
    return null;
  }

  private async matchmake(game: GameKind): Promise<Response> {
    await this.loaded;

    const current = this.state.openCode;
    if (current) {
      const status = await this.roomStatus(game, current);
      if (status?.joinable) {
        return json({
          code: current,
          game,
          // A reserved room has no host yet, so whoever arrives first creates
          // it. Any later caller falls back to joining after ROOM_EXISTS.
          host: status.players === 0,
          created: false,
        } satisfies OpenRoomResult);
      }
      this.state.openCode = null;
    }

    const code = await this.createOpenRoom(game);
    if (!code) {
      return json(
        { error: "Could not open a room. Try again." },
        503,
        { "retry-after": "1" },
      );
    }

    this.state.openCode = code;
    await this.persist();
    return json(
      { code, game, host: true, created: true } satisfies OpenRoomResult,
      201,
    );
  }

  private async claim(game: GameKind, code: string): Promise<Response> {
    await this.loaded;

    if (this.state.openCode && this.state.openCode !== code) {
      const status = await this.roomStatus(game, this.state.openCode);
      if (status?.joinable) {
        // Another public room is already serving Play. Keep it; this room stays
        // reachable through its own code without stealing the open slot.
        return json({ claimed: false, code: this.state.openCode });
      }
    }

    this.state.openCode = code;
    await this.persist();
    return json({ claimed: true, code });
  }

  private async release(game: GameKind, code: string): Promise<Response> {
    await this.loaded;
    if (this.state.openCode !== code) {
      return json({ released: false });
    }
    this.state.openCode = null;
    await this.persist();
    return json({ released: true });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/internal/matchmake") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405, { allow: "POST" });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Expected a JSON body." }, 400);
      }
      const game = parseGame(
        typeof body === "object" && body !== null
          ? (body as { game?: unknown }).game
          : undefined,
      );
      if (!game) return json({ error: "Choose a valid game." }, 400);
      return this.runExclusive(() => this.matchmake(game));
    }

    if (path === "/internal/claim") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405, { allow: "POST" });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Expected a JSON body." }, 400);
      }
      const payload =
        typeof body === "object" && body !== null
          ? (body as { game?: unknown; code?: unknown })
          : {};
      const game = parseGame(payload.game);
      const code =
        typeof payload.code === "string" ? payload.code.toLowerCase() : "";
      if (!game || !/^[a-z0-9]{6}$/.test(code)) {
        return json({ error: "Choose a valid room." }, 400);
      }
      return this.runExclusive(() => this.claim(game, code));
    }

    if (path === "/internal/release") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405, { allow: "POST" });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Expected a JSON body." }, 400);
      }
      const payload =
        typeof body === "object" && body !== null
          ? (body as { game?: unknown; code?: unknown })
          : {};
      const game = parseGame(payload.game);
      const code =
        typeof payload.code === "string" ? payload.code.toLowerCase() : "";
      if (!game || !/^[a-z0-9]{6}$/.test(code)) {
        return json({ error: "Choose a valid room." }, 400);
      }
      return this.runExclusive(() => this.release(game, code));
    }

    return json({ error: "Not found." }, 404);
  }
}

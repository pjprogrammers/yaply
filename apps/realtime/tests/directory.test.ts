import { describe, expect, it } from "vitest";
import { RoomDirectory } from "../src/RoomDirectory";
import { FakeDurableObjectState } from "./helpers";
import type { DurableObjectState } from "@cloudflare/workers-types";

type FakeRoom = {
  reserved: boolean;
  players: number;
  maxPlayers: number;
};

function makeEnv() {
  const rooms = new Map<string, FakeRoom>();
  const names: string[] = [];
  const env = {
    GAME_ROOMS: {
      idFromName: (name: string) => name,
      get: (name: string) => ({
        fetch: async (url: string, init?: RequestInit) => {
          const code = name.split(":")[1] ?? "";
          if (String(url).endsWith("/internal/reserve")) {
            const body = JSON.parse(String(init?.body ?? "{}"));
            if (rooms.has(body.code)) {
              return new Response(JSON.stringify({ reserved: false, reason: "reserved" }), {
                headers: { "content-type": "application/json" },
              });
            }
            rooms.set(body.code, { reserved: true, players: 0, maxPlayers: 8 });
            return new Response(JSON.stringify({ reserved: true }), {
              status: 201,
              headers: { "content-type": "application/json" },
            });
          }
          const room = rooms.get(code);
          if (!room) {
            return new Response(JSON.stringify({ joinable: false }), {
              headers: { "content-type": "application/json" },
            });
          }
          return new Response(
            JSON.stringify({
              joinable:
                room.players === 0
                  ? room.reserved
                  : room.players < room.maxPlayers,
              players: room.players,
              seats: room.players,
              maxPlayers: room.maxPlayers,
              reserved: room.reserved,
            }),
            { headers: { "content-type": "application/json" } },
          );
        },
      }),
    },
  };
  return { env: env as any, rooms, names };
}

async function makeDirectory() {
  const { env, rooms, names } = makeEnv();
  const state = new FakeDurableObjectState();
  const directory = new RoomDirectory(state as unknown as DurableObjectState, env);
  await state.ready;
  return { directory, rooms, names };
}

async function post(directory: RoomDirectory, path: string, body: unknown) {
  const response = await directory.fetch(
    new Request(`https://directory.internal${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return {
    status: response.status,
    body: (await response.json()) as any,
  };
}

describe("RoomDirectory", () => {
  it("creates the first open room and returns it to later players", async () => {
    const { directory, rooms } = await makeDirectory();

    const first = await post(directory, "/internal/matchmake", { game: "skribbl" });
    expect(first.status).toBe(201);
    expect(first.body.host).toBe(true);
    expect(first.body.created).toBe(true);
    expect(first.body.code).toMatch(/^[a-z0-9]{6}$/);

    rooms.get(first.body.code)!.players = 1;
    const second = await post(directory, "/internal/matchmake", { game: "skribbl" });
    expect(second.status).toBe(200);
    expect(second.body.code).toBe(first.body.code);
    expect(second.body.host).toBe(false);
    expect(second.body.created).toBe(false);
  });

  it("opens the next room when the current one is full", async () => {
    const { directory, rooms } = await makeDirectory();

    const first = await post(directory, "/internal/matchmake", { game: "skribbl" });
    rooms.get(first.body.code)!.players = 8;

    const second = await post(directory, "/internal/matchmake", { game: "skribbl" });
    expect(second.status).toBe(201);
    expect(second.body.code).not.toBe(first.body.code);
    expect(second.body.created).toBe(true);
  });

  it("opens a fresh room after the last player leaves", async () => {
    const { directory, rooms } = await makeDirectory();

    const first = await post(directory, "/internal/matchmake", { game: "skribbl" });
    rooms.get(first.body.code)!.players = 1;

    const released = await post(directory, "/internal/release", {
      game: "skribbl",
      code: first.body.code,
    });
    expect(released.body.released).toBe(true);

    const next = await post(directory, "/internal/matchmake", { game: "skribbl" });
    expect(next.body.code).not.toBe(first.body.code);
    expect(next.body.created).toBe(true);
  });

  it("does not hand out a room that closed without releasing it", async () => {
    const { directory, rooms } = await makeDirectory();

    const first = await post(directory, "/internal/matchmake", { game: "skribbl" });
    rooms.get(first.body.code)!.reserved = false;
    rooms.get(first.body.code)!.players = 0;

    const next = await post(directory, "/internal/matchmake", { game: "skribbl" });
    expect(next.body.code).not.toBe(first.body.code);
  });

  it("serializes concurrent Play requests onto one room", async () => {
    const { directory, rooms } = await makeDirectory();

    const responses = await Promise.all(
      Array.from({ length: 9 }, () =>
        post(directory, "/internal/matchmake", { game: "skribbl" }),
      ),
    );

    const codes = responses.map((response) => response.body.code);
    expect(new Set(codes).size).toBe(1);
    expect(responses.filter((response) => response.body.created)).toHaveLength(1);
    expect(rooms.size).toBe(1);
  });

  it("keeps a manually created public room only when no open room exists", async () => {
    const { directory, rooms } = await makeDirectory();

    const open = await post(directory, "/internal/matchmake", { game: "skribbl" });
    rooms.get(open.body.code)!.players = 1;

    const rejected = await post(directory, "/internal/claim", {
      game: "skribbl",
      code: "manual",
    });
    expect(rejected.body.claimed).toBe(false);
    expect(rejected.body.code).toBe(open.body.code);

    rooms.get(open.body.code)!.players = 8;
    const claimed = await post(directory, "/internal/claim", {
      game: "skribbl",
      code: "manual",
    });
    expect(claimed.body.claimed).toBe(true);
    expect(claimed.body.code).toBe("manual");

    rooms.set("manual", { reserved: true, players: 1, maxPlayers: 8 });
    const next = await post(directory, "/internal/matchmake", { game: "skribbl" });
    expect(next.body.code).toBe("manual");
  });

  it("ignores a release for a room that is no longer the open one", async () => {
    const { directory, rooms } = await makeDirectory();

    const first = await post(directory, "/internal/matchmake", { game: "skribbl" });
    rooms.get(first.body.code)!.players = 8;
    const second = await post(directory, "/internal/matchmake", { game: "skribbl" });

    const stale = await post(directory, "/internal/release", {
      game: "skribbl",
      code: first.body.code,
    });
    expect(stale.body.released).toBe(false);

    rooms.get(second.body.code)!.players = 1;
    const next = await post(directory, "/internal/matchmake", { game: "skribbl" });
    expect(next.body.code).toBe(second.body.code);
  });
});

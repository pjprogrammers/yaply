import { describe, expect, it } from "vitest";
import {
  SMASH_MAX_PLAYERS,
  SMASH_PLAYER_COLORS,
} from "@yaply/shared/constants";
import { createAndJoin, flush, makeRoom } from "./helpers";

type SnapshotPlayer = {
  id: string;
  name?: string;
  color?: string;
  kills?: number;
  deaths?: number;
};

function makeSnapshot(
  players: SnapshotPlayer[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    phase: "playing",
    round: 1,
    mapId: "foundry",
    timeLeft: 240,
    killTarget: 20,
    matchSeconds: 60,
    karts: players.map((player, index) => ({
      id: player.id,
      name: player.name ?? `Driver ${index + 1}`,
      color: player.color ?? SMASH_PLAYER_COLORS[index % SMASH_PLAYER_COLORS.length],
      x: index * 5,
      y: 0,
      z: 0,
      yaw: 0,
      hp: 100,
      shield: 0,
      boost: 0,
      slow: 0,
      spike: 0,
      weapon: "machinegun",
      ammo: 80,
      kills: player.kills ?? 0,
      deaths: player.deaths ?? 0,
      shots: 4,
      hits: 2,
      alive: true,
      respawnIn: 0,
      speed: 12,
      drifting: false,
      driftCharge: 0,
    })),
    pickups: [{ id: 1, active: true }],
    projectiles: [],
    traps: [],
    feed: [{ id: 1, killer: "Alice", victim: "Bob", weapon: "rockets", self: false }],
    winner: null,
    ...overrides,
  };
}

describe("Smash Karts online rooms", () => {
  it("opens a 40-seat room with the host's Smash settings", async () => {
    const harness = await makeRoom("smashkarts");
    const host = harness.connect();
    await host.message({
      type: "room.create",
      protocolVersion: 1,
      game: "smashkarts",
      nickname: "Alice",
      settings: {
        maxPlayers: 40,
        mapId: "rooftop",
        killTarget: 30,
        durationSeconds: 420,
      },
    });

    const snapshot = host.last("room.snapshot").snapshot;
    expect(snapshot.game).toBe("smashkarts");
    expect(snapshot.phase).toBe("lobby");
    expect(snapshot.settings.maxPlayers).toBe(SMASH_MAX_PLAYERS);
    expect(snapshot.settings.mapId).toBe("rooftop");
    expect(snapshot.settings.killTarget).toBe(30);
    expect(snapshot.settings.durationSeconds).toBe(420);
  });

  it("starts a match and moves the room to playing", async () => {
    const { sockets } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    const snapshot = sockets[0].last("room.snapshot").snapshot;
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.roundNumber).toBe(1);
    expect(sockets[1].last("room.snapshot").snapshot.phase).toBe("playing");
  });

  it("accepts 40 players and rejects the 41st", async () => {
    const harness = await makeRoom("smashkarts");
    const host = harness.connect();
    await host.message({
      type: "room.create",
      protocolVersion: 1,
      game: "smashkarts",
      nickname: "Driver 1",
      settings: { maxPlayers: SMASH_MAX_PLAYERS },
    });

    for (let index = 2; index <= SMASH_MAX_PLAYERS; index += 1) {
      const socket = harness.connect();
      await socket.message({
        type: "room.join",
        protocolVersion: 1,
        game: "smashkarts",
        code: "abc123",
        nickname: `Driver ${index}`,
      });
    }

    expect(host.last("room.snapshot").snapshot.players).toHaveLength(SMASH_MAX_PLAYERS);

    const overflow = harness.connect();
    await overflow.message({
      type: "room.join",
      protocolVersion: 1,
      game: "smashkarts",
      code: "abc123",
      nickname: "Driver 41",
    });

    expect(overflow.last("room.error").code).toBe("ROOM_FULL");
    expect(host.last("room.snapshot").snapshot.players).toHaveLength(SMASH_MAX_PLAYERS);
  });

  it("relays guest input to the host only", async () => {
    const { sockets, playerIds } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    const input = { seq: 41, throttle: 1, steer: -0.4, drift: true, fire: false };
    await sockets[1].message({ type: "smash.input", input });

    const relayed = sockets[0].last("smash.input");
    expect(relayed.playerId).toBe(playerIds[1]);
    expect(relayed.input).toEqual(input);
    expect(sockets[1].events("smash.input")).toHaveLength(0);

    await sockets[0].message({ type: "smash.input", input });
    expect(sockets[1].events("smash.input")).toHaveLength(0);
  });

  it("relays a host snapshot and filters spoofed karts", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    await sockets[0].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot([
        { id: playerIds[0], name: "Imposter", color: "#123456", kills: 5 },
        { id: playerIds[1], kills: 2 },
        { id: "unknown-player", kills: 99 },
        { id: playerIds[0], kills: 99 },
      ]),
    });

    const relayed = sockets[1].last("smash.snapshot").snapshot;
    expect(relayed.karts.map((kart: any) => kart.id)).toEqual([playerIds[0], playerIds[1]]);
    expect(relayed.karts[0].name).toBe("Alice");
    expect(relayed.karts[0].color).not.toBe("#123456");
    expect(relayed.karts[0].kills).toBe(5);

    const room = (harness.room as any).room;
    expect(room.players.find((player: any) => player.id === playerIds[0]).score).toBe(5);
    expect(room.players.find((player: any) => player.id === playerIds[1]).score).toBe(2);
  });

  it("ignores snapshots from a guest", async () => {
    const { sockets, playerIds } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    const before = sockets[0].events("smash.snapshot").length;
    await sockets[1].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot([{ id: playerIds[0] }, { id: playerIds[1] }]),
    });

    expect(sockets[0].events("smash.snapshot")).toHaveLength(before);
  });

  it("seeds a late joiner with the latest snapshot while the match is running", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    await sockets[0].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot([{ id: playerIds[0] }, { id: playerIds[1] }]),
    });

    const late = harness.connect();
    await late.message({
      type: "room.join",
      protocolVersion: 1,
      game: "smashkarts",
      code: "abc123",
      nickname: "Carol",
    });

    const snapshot = late.last("room.snapshot").snapshot;
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.players).toHaveLength(3);
    expect(late.last("smash.snapshot").snapshot.karts).toHaveLength(2);
  });

  it("finishes the match from the host's final frame and keeps rankings", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    await sockets[0].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot(
        [
          { id: playerIds[0], kills: 8, deaths: 2 },
          { id: playerIds[1], kills: 3, deaths: 4 },
        ],
        {
          phase: "over",
          timeLeft: 0,
          winner: {
            id: playerIds[0],
            name: "Alice",
            color: SMASH_PLAYER_COLORS[0],
            kills: 8,
          },
        },
      ),
    });

    const finished = sockets[1].last("game.finished");
    expect(finished.winnerId).toBe(playerIds[0]);
    expect(finished.rankings.map((entry: any) => entry.playerId)).toEqual([
      playerIds[0],
      playerIds[1],
    ]);
    expect(finished.rankings[0].score).toBe(8);

    const snapshot = sockets[1].last("room.snapshot").snapshot;
    expect(snapshot.phase).toBe("game-over");
    expect(snapshot.players.find((player: any) => player.id === playerIds[0]).score).toBe(8);
    expect((harness.room as any).room.lastSmashState.phase).toBe("over");
  });

  it("lets only the host run the match back", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    await sockets[0].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot(
        [{ id: playerIds[0], kills: 8 }, { id: playerIds[1], kills: 3 }],
        { phase: "over", timeLeft: 0 },
      ),
    });

    await sockets[1].message({ type: "game.rematch" });
    expect(sockets[1].last("room.error").code).toBe("NOT_HOST");

    await sockets[0].message({ type: "game.rematch" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.roundNumber).toBe(2);
    expect((harness.room as any).room.lastSmashState).toBeNull();
  });

  it("keeps the match running with one player after a guest leaves", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    await sockets[0].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot([{ id: playerIds[0] }, { id: playerIds[1] }]),
    });

    await sockets[1].message({ type: "room.leave" });
    await flush();

    const room = (harness.room as any).room;
    expect(room.phase).toBe("playing");
    expect(room.players).toHaveLength(1);
    expect(room.lastSmashState.karts).toHaveLength(1);

    await sockets[0].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot([{ id: playerIds[0] }]),
    });

    expect(room.phase).toBe("playing");
    expect(room.lastSmashState.karts).toHaveLength(1);
  });

  it("promotes a connected guest after the host drops", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("smashkarts", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    await sockets[0].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot([{ id: playerIds[0] }, { id: playerIds[1] }]),
    });

    sockets[0].close();
    await flush();

    const hostPlayer = (harness.room as any).room.players.find(
      (player: any) => player.id === playerIds[0],
    );
    hostPlayer.lastSeen = Date.now() - 6_100;
    await harness.room.alarm();

    const snapshot = sockets[1].last("room.snapshot").snapshot;
    expect(snapshot.hostId).toBe(playerIds[1]);
    expect(snapshot.phase).toBe("playing");
    expect(
      sockets[1]
        .events("chat.message")
        .some((event: any) => event.text.includes("is now hosting")),
    ).toBe(true);

    // The guest is now authoritative. Its snapshot must be accepted.
    await sockets[1].message({
      type: "smash.snapshot",
      snapshot: makeSnapshot([{ id: playerIds[0] }, { id: playerIds[1] }]),
    });
    expect((harness.room as any).room.lastSmashState).not.toBeNull();
    expect(sockets[1].last("smash.snapshot").snapshot.karts).toHaveLength(2);
  });
});

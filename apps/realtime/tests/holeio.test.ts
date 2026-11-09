import { describe, expect, it } from "vitest";
import {
  HOLEIO_BOT_MAX,
  HOLEIO_MAX_PLAYERS,
  HOLEIO_PLAYER_COLORS,
} from "@yaply/shared/constants";
import { createAndJoin, flush, makeRoom } from "./helpers";

type SnapshotHole = {
  id: string;
  name?: string;
  color?: string;
  score?: number;
  alive?: boolean;
};

function makeHoleioSnapshot(
  holes: SnapshotHole[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    phase: "playing",
    round: 1,
    timeLeft: 91.5,
    countdown: 0,
    holes: holes.map((hole, index) => ({
      id: hole.id,
      name: hole.name ?? `Hole ${index + 1}`,
      color: hole.color ?? HOLEIO_PLAYER_COLORS[index % HOLEIO_PLAYER_COLORS.length],
      x: index * 4,
      z: -index * 3,
      radius: 2.4,
      score: hole.score ?? 0,
      alive: hole.alive ?? true,
      respawnIn: 0,
      eaten: 12,
      eatenHoles: 1,
      eatenBy: null,
    })),
    feed: [
      {
        id: 1,
        text: "Alice swallowed a bus",
        tone: "player",
        ttl: 3.4,
      },
    ],
    winner: null,
    city: "AQID",
    ...overrides,
  };
}

describe("Hole.io online rooms", () => {
  it("opens an eight-seat room with bot fill and the host's Hole.io settings", async () => {
    const harness = await makeRoom("holeio");
    const host = harness.connect();
    await host.message({
      type: "room.create",
      protocolVersion: 1,
      game: "holeio",
      nickname: "Alice",
      settings: { maxPlayers: 40, botCount: 4 },
    });

    const snapshot = host.last("room.snapshot").snapshot;
    expect(snapshot.game).toBe("holeio");
    expect(snapshot.phase).toBe("lobby");
    expect(snapshot.settings.maxPlayers).toBe(HOLEIO_MAX_PLAYERS);
    expect(snapshot.settings.botCount).toBe(4);
  });

  it("defaults to seven bots when the host does not specify a count", async () => {
    const harness = await makeRoom("holeio");
    const host = harness.connect();
    await host.message({
      type: "room.create",
      protocolVersion: 1,
      game: "holeio",
      nickname: "Alice",
    });

    expect(host.last("room.snapshot").snapshot.settings.botCount).toBe(HOLEIO_BOT_MAX);
  });

  it("lets a solo host start against bots", async () => {
    const harness = await makeRoom("holeio");
    const host = harness.connect();
    await host.message({
      type: "room.create",
      protocolVersion: 1,
      game: "holeio",
      nickname: "Alice",
    });

    await host.message({ type: "room.start" });
    const snapshot = host.last("room.snapshot").snapshot;
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.roundNumber).toBe(1);
    expect(snapshot.hostId).toBe(snapshot.players[0].id);
  });

  it("refuses to start with one human and no bots", async () => {
    const harness = await makeRoom("holeio");
    const host = harness.connect();
    await host.message({
      type: "room.create",
      protocolVersion: 1,
      game: "holeio",
      nickname: "Alice",
      settings: { botCount: 0 },
    });

    await host.message({ type: "room.start" });
    expect(host.last("room.error").code).toBe("NOT_ENOUGH_PLAYERS");
    expect(host.last("room.snapshot").snapshot.phase).toBe("lobby");
  });

  it("relays guest direction packets to the host only", async () => {
    const { sockets, playerIds } = await createAndJoin("holeio", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    const input = { seq: 7, x: 0.82, z: -0.31 };
    await sockets[1].message({ type: "holeio.input", input });

    const relayed = sockets[0].last("holeio.input");
    expect(relayed.playerId).toBe(playerIds[1]);
    expect(relayed.input).toEqual(input);
    expect(sockets[1].events("holeio.input")).toHaveLength(0);

    await sockets[0].message({ type: "holeio.input", input });
    expect(sockets[1].events("holeio.input")).toHaveLength(0);
  });

  it("relays snapshots, rewrites human names and colours, and drops duplicates", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("holeio", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    await sockets[0].message({
      type: "holeio.snapshot",
      snapshot: makeHoleioSnapshot([
        { id: playerIds[0], name: "Imposter", color: "#123456", score: 420 },
        { id: playerIds[1], score: 210 },
        { id: playerIds[0], score: 9999 },
        { id: "bot-1", name: "Muncher", score: 60 },
      ]),
    });

    const relayed = sockets[1].last("holeio.snapshot").snapshot;
    expect(relayed.holes.map((hole: any) => hole.id)).toEqual([
      playerIds[0],
      playerIds[1],
      "bot-1",
    ]);
    expect(relayed.holes[0].name).toBe("Alice");
    expect(relayed.holes[0].color).not.toBe("#123456");
    expect(relayed.holes[0].score).toBe(420);
    expect(relayed.holes[1].name).toBe("Bob");
    expect(relayed.winner.id).toBe(playerIds[0]);
    expect(relayed.city).toBe("AQID");

    const room = (harness.room as any).room;
    expect(room.players.find((player: any) => player.id === playerIds[0]).score).toBe(420);
    expect(room.players.find((player: any) => player.id === playerIds[1]).score).toBe(210);
    expect(room.lastHoleioState.holes).toHaveLength(3);
  });

  it("ignores snapshots from guests and mismatched rounds", async () => {
    const { sockets, playerIds } = await createAndJoin("holeio", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    const baseline = sockets[0].events("holeio.snapshot").length;
    await sockets[1].message({
      type: "holeio.snapshot",
      snapshot: makeHoleioSnapshot([{ id: playerIds[0] }, { id: playerIds[1] }]),
    });
    expect(sockets[0].events("holeio.snapshot")).toHaveLength(baseline);

    await sockets[0].message({
      type: "holeio.snapshot",
      snapshot: makeHoleioSnapshot([{ id: playerIds[0] }, { id: playerIds[1] }], {
        round: 99,
      }),
    });
    expect(sockets[0].events("holeio.snapshot")).toHaveLength(baseline);
  });

  it("seeds a late joiner with the latest relayed frame", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("holeio", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    await sockets[0].message({
      type: "holeio.snapshot",
      snapshot: makeHoleioSnapshot([{ id: playerIds[0] }, { id: playerIds[1] }]),
    });

    const late = harness.connect();
    await late.message({
      type: "room.join",
      protocolVersion: 1,
      game: "holeio",
      code: "abc123",
      nickname: "Carol",
    });

    const snapshot = late.last("room.snapshot").snapshot;
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.players).toHaveLength(3);
    expect(late.last("holeio.snapshot").snapshot.holes).toHaveLength(2);
    expect(late.last("holeio.snapshot").snapshot.city).toBe("AQID");
  });

  it("finishes from the host's final frame and starts a fresh rematch round", async () => {
    const { sockets, playerIds } = await createAndJoin("holeio", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    await sockets[0].message({
      type: "holeio.snapshot",
      snapshot: makeHoleioSnapshot(
        [
          { id: playerIds[0], score: 900 },
          { id: playerIds[1], score: 300 },
        ],
        { phase: "over", timeLeft: 0 },
      ),
    });
    await flush();

    const finished = sockets[1].last("game.finished");
    expect(finished.rankings[0].playerId).toBe(playerIds[0]);
    expect(finished.rankings[0].score).toBe(900);
    expect(finished.winnerId).toBe(playerIds[0]);
    expect(sockets[1].last("room.snapshot").snapshot.phase).toBe("game-over");

    await sockets[0].message({ type: "game.rematch" });
    const rematch = sockets[1].last("room.snapshot").snapshot;
    expect(rematch.phase).toBe("playing");
    expect(rematch.roundNumber).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { createAndJoin, flush, makeRoom } from "./helpers";

function allText(socket: { sent: any[] }): string {
  return JSON.stringify(socket.sent);
}

describe("GameRoom lifecycle", () => {
  it("creates a room, welcomes the host and starts in the lobby", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("skribbl", ["Alice"]);
    const snapshot = sockets[0].last("room.snapshot").snapshot;

    expect(playerIds).toHaveLength(1);
    expect(snapshot.code).toBe("abc123");
    expect(snapshot.game).toBe("skribbl");
    expect(snapshot.phase).toBe("lobby");
    expect(snapshot.hostId).toBe(playerIds[0]);
    expect(snapshot.players).toHaveLength(1);
    expect(harness.state.storage.map.has("room")).toBe(true);
  });

  it("joins a second player and broadcasts the updated snapshot", async () => {
    const { sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    const hostSnapshot = sockets[0].last("room.snapshot").snapshot;

    expect(playerIds).toHaveLength(2);
    expect(hostSnapshot.players).toHaveLength(2);
    expect(sockets[0].events("room.player.joined")).toHaveLength(1);
    expect(hostSnapshot.players.map((player: any) => player.nickname)).toEqual(["Alice", "Bob"]);
  });

  it("rejects a different game type on the same room code", async () => {
    const { harness } = await createAndJoin("skribbl", ["Alice"]);
    const socket = harness.connect();
    await socket.message({
      type: "room.join",
      protocolVersion: 1,
      game: "chain",
      code: "abc123",
      nickname: "Mallory",
    });
    expect(socket.last("room.error").code).toBe("GAME_MISMATCH");
  });

  it("rejects an outdated protocol version", async () => {
    const harness = await makeRoom("skribbl");
    const socket = harness.connect();
    await socket.message({
      type: "room.create",
      protocolVersion: 0,
      game: "skribbl",
      nickname: "Alice",
    });
    expect(socket.last("room.error").code).toBe("PROTOCOL_MISMATCH");
  });

  it("refuses room state before the socket has joined", async () => {
    const { harness } = await createAndJoin("skribbl", ["Alice"]);
    const outsider = harness.connect();
    await outsider.message({ type: "room.sync" });

    expect(outsider.last("room.error").code).toBe("NOT_IN_ROOM");
    expect(outsider.events("room.snapshot")).toHaveLength(0);
  });

  it("enforces room capacity", async () => {
    const harness = await makeRoom("skribbl");
    const host = harness.connect();
    await host.message({
      type: "room.create",
      protocolVersion: 1,
      game: "skribbl",
      nickname: "Alice",
      settings: { maxPlayers: 2 },
    });
    const bob = harness.connect();
    await bob.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Bob",
    });
    const mallory = harness.connect();
    await mallory.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Mallory",
    });

    expect(mallory.last("room.error").code).toBe("ROOM_FULL");
    expect(host.last("room.snapshot").snapshot.players).toHaveLength(2);
  });

  it("reconnects with a resume token without creating a duplicate player", async () => {
    const { harness, sockets, playerIds, tokens } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    sockets[0].close(1001, "network");
    await flush();

    const replacement = harness.connect();
    await replacement.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Alice",
      resumeToken: tokens[0],
    });

    expect(replacement.last("room.welcome").playerId).toBe(playerIds[0]);
    const snapshot = replacement.last("room.snapshot").snapshot;
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.players.filter((player: any) => player.nickname === "Alice")).toHaveLength(1);
  });

  it("removes a player who leaves explicitly", async () => {
    const { sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[1].message({ type: "room.leave" });
    await flush();

    const snapshot = sockets[0].last("room.snapshot").snapshot;
    expect(snapshot.players.map((player: any) => player.id)).toEqual([playerIds[0]]);
  });

  it("expires an empty room and deletes its stored state", async () => {
    const { harness, sockets } = await createAndJoin("skribbl", ["Alice"]);
    await sockets[0].message({ type: "room.leave" });
    await flush();

    expect((harness.room as any).room.players).toHaveLength(0);
    (harness.room as any).room.lastActivity = Date.now() - 61_000;
    await harness.room.alarm();

    expect(harness.state.storage.map.has("room")).toBe(false);
    expect(harness.state.storage.alarm).toBeNull();
  });

  it("schedules an alarm for unjoined sockets and closes them at the join deadline", async () => {
    const harness = await makeRoom("skribbl");
    const socket = harness.connect();
    await flush();

    expect(harness.state.storage.alarm).not.toBeNull();

    const state = (harness.room as any).socketState.get(socket);
    state.createdAt = Date.now() - 31_000;
    await harness.room.alarm();

    expect(socket.closed?.code).toBe(1008);
  });

  it("rejects oversized and malformed frames", async () => {
    const { sockets } = await createAndJoin("skribbl", ["Alice"]);
    const socket = sockets[0];

    await socket.message("x".repeat(20_000));
    expect(socket.last("room.error").code).toBe("MESSAGE_TOO_LARGE");

    await socket.message("{not json");
    expect(socket.last("room.error").code).toBe("PARSE_ERROR");

    await socket.message({ type: "room.start", unexpected: true });
    expect(socket.last("room.error").code).toBe("INVALID_EVENT");
  });

  it("rate limits a flood of messages", async () => {
    const { sockets } = await createAndJoin("skribbl", ["Alice"]);
    const socket = sockets[0];
    for (let index = 0; index < 80; index += 1) {
      await socket.message({ type: "room.sync" });
    }
    expect(socket.events("room.error").some((event: any) => event.code === "RATE_LIMITED")).toBe(true);
  });
});

describe("Skribbl room rules", () => {
  it("only sends word choices and the selected word to the drawer", async () => {
    const { sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    const snapshot = sockets[0].last("room.snapshot").snapshot;
    expect(snapshot.phase).toBe("choosing");

    const drawerIndex = playerIds.indexOf(snapshot.drawerId);
    const guesserIndex = drawerIndex === 0 ? 1 : 0;
    const drawer = sockets[drawerIndex];
    const guesser = sockets[guesserIndex];

    const choices = drawer.last("game.word.choices").choices;
    expect(choices.length).toBeGreaterThanOrEqual(2);
    expect(guesser.events("game.word.choices")).toHaveLength(0);

    await drawer.message({ type: "game.word.choose", wordId: choices[0].id });
    const selected = drawer.last("game.word.selected");
    expect(selected.word).toBe(choices[0].display);
    expect(guesser.events("game.word.selected")).toHaveLength(0);

    const publicSnapshot = guesser.last("room.snapshot").snapshot;
    expect(publicSnapshot.phase).toBe("drawing");
    expect(publicSnapshot.maskedWord).not.toBe(selected.word);
    expect(allText(guesser)).not.toContain(selected.word);
  });

  it("scores a correct guess on the server and ends the round", async () => {
    const { sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = playerIds.indexOf(snapshot.drawerId);
    const guesserIndex = drawerIndex === 0 ? 1 : 0;
    const drawer = sockets[drawerIndex];
    const guesser = sockets[guesserIndex];

    const choices = drawer.last("game.word.choices").choices;
    await drawer.message({ type: "game.word.choose", wordId: choices[0].id });
    const word = drawer.last("game.word.selected").word;

    await guesser.message({ type: "chat.guess", text: word.toUpperCase() });

    const correct = guesser.last("game.correct-guess");
    expect(correct.points).toBeGreaterThan(0);
    expect(guesser.last("game.round.ended").reason).toBe("all-guessed");
    expect(guesser.last("game.round.ended").word).toBe(word);

    const finalSnapshot = guesser.last("room.snapshot").snapshot;
    const guesserPlayer = finalSnapshot.players.find((player: any) => player.id === playerIds[guesserIndex]);
    const drawerPlayer = finalSnapshot.players.find((player: any) => player.id === playerIds[drawerIndex]);
    expect(guesserPlayer.score).toBeGreaterThan(0);
    expect(drawerPlayer.score).toBeGreaterThan(0);
  });

  it("ignores drawing events from a guessing player", async () => {
    const { sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = playerIds.indexOf(snapshot.drawerId);
    const guesserIndex = drawerIndex === 0 ? 1 : 0;
    const drawer = sockets[drawerIndex];
    const guesser = sockets[guesserIndex];

    const choices = drawer.last("game.word.choices").choices;
    await drawer.message({ type: "game.word.choose", wordId: choices[0].id });

    const before = drawer.events("drawing.stroke").length;
    await guesser.message({
      type: "drawing.stroke",
      strokeId: "forged",
      color: "#ff0000",
      width: 4,
      points: [{ x: 0.5, y: 0.5 }],
      done: true,
    });
    expect(drawer.events("drawing.stroke")).toHaveLength(before);
    expect(guesser.last("room.snapshot").snapshot.strokes).toHaveLength(0);
  });

  it("rejects a forged word choice id", async () => {
    const { sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const drawer = sockets[playerIds.indexOf(snapshot.drawerId)];

    await drawer.message({ type: "game.word.choose", wordId: "not-a-choice" });
    expect(drawer.last("room.error").code).toBe("INVALID_WORD");
  });

  it("only lets the host start the game", async () => {
    const { sockets } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[1].message({ type: "room.start" });
    expect(sockets[1].last("room.error").code).toBe("NOT_HOST");
  });
});

describe("Chain Reaction room rules", () => {
  async function startedChain() {
    const joined = await createAndJoin("chain", ["Alice", "Bob"]);
    await joined.sockets[0].message({ type: "room.start" });
    return joined;
  }

  it("starts with a server-built board and the first turn", async () => {
    const { sockets } = await startedChain();
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.chain.rows).toBe(6);
    expect(snapshot.chain.cols).toBe(9);
    expect(snapshot.chain.cells).toHaveLength(54);
    expect(snapshot.chain.turnPlayerId).toBeTruthy();
  });

  it("rejects a move from the player whose turn it is not", async () => {
    const { sockets, playerIds } = await startedChain();
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const turnIndex = playerIds.indexOf(snapshot.chain.turnPlayerId);
    const otherIndex = turnIndex === 0 ? 1 : 0;
    await sockets[otherIndex].message({ type: "chain.place", row: 2, col: 4 });
    expect(sockets[otherIndex].last("room.error").code).toBe("INVALID_MOVE");
  });

  it("applies a legal move and advances the turn", async () => {
    const { sockets, playerIds } = await startedChain();
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const turnIndex = playerIds.indexOf(snapshot.chain.turnPlayerId);
    await sockets[turnIndex].message({ type: "chain.place", row: 2, col: 4 });

    const move = sockets[0].last("chain.move");
    expect(move.move.playerId).toBe(playerIds[turnIndex]);
    expect(move.snapshot.chain.turnPlayerId).not.toBe(playerIds[turnIndex]);
    const cell = move.snapshot.chain.cells[2 * 9 + 4];
    expect(cell).toEqual({ ownerId: playerIds[turnIndex], orbs: 1 });
  });

  it("rejects out-of-bounds moves", async () => {
    const { sockets, playerIds } = await startedChain();
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const turnIndex = playerIds.indexOf(snapshot.chain.turnPlayerId);
    await sockets[turnIndex].message({ type: "chain.place", row: 99, col: 0 });
    expect(sockets[turnIndex].last("room.error").code).toBe("INVALID_EVENT");
  });

  it("ends the game when a player surrenders", async () => {
    const { sockets, playerIds } = await startedChain();
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const turnIndex = playerIds.indexOf(snapshot.chain.turnPlayerId);
    await sockets[turnIndex].message({ type: "chain.surrender" });

    const finished = sockets[0].last("game.finished");
    expect(finished.winnerId).toBe(playerIds[turnIndex === 0 ? 1 : 0]);
    expect(sockets[0].last("room.snapshot").snapshot.phase).toBe("game-over");
  });
});

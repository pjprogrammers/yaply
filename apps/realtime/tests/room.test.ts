import { describe, expect, it } from "vitest";
import { MAX_STROKE_POINTS_PER_ROUND } from "@yaply/shared/constants";
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

  it("does not broadcast room events to a socket that has not joined", async () => {
    const { harness, sockets } = await createAndJoin("skribbl", ["Alice"]);
    const outsider = harness.connect();
    await sockets[0].message({ type: "chat.guess", text: "hello" });

    const bob = harness.connect();
    await bob.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Bob",
    });

    expect(outsider.events()).toHaveLength(0);
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

  it("enforces capacity when multiple joins arrive at the same time", async () => {
    const harness = await makeRoom("skribbl");
    const host = harness.connect();
    await host.message({
      type: "room.create",
      protocolVersion: 1,
      game: "skribbl",
      nickname: "Alice",
      settings: { maxPlayers: 2 },
    });

    const first = harness.connect();
    const second = harness.connect();
    await Promise.all([
      first.message({
        type: "room.join",
        protocolVersion: 1,
        game: "skribbl",
        code: "abc123",
        nickname: "Bob",
      }),
      second.message({
        type: "room.join",
        protocolVersion: 1,
        game: "skribbl",
        code: "abc123",
        nickname: "Mallory",
      }),
    ]);

    const errors = [...first.events("room.error"), ...second.events("room.error")];
    expect(errors.map((event: any) => event.code)).toEqual(["ROOM_FULL"]);
    expect((harness.room as any).room.players).toHaveLength(2);
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

  it("handles simultaneous reconnects without duplicating players", async () => {
    const { harness, sockets, playerIds, tokens } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    sockets[0].close(1001, "network");
    sockets[1].close(1001, "network");
    await flush();

    const replacements = [harness.connect(), harness.connect()];
    await Promise.all(
      replacements.map((socket, index) =>
        socket.message({
          type: "room.join",
          protocolVersion: 1,
          game: "skribbl",
          code: "abc123",
          nickname: index === 0 ? "Alice" : "Bob",
          resumeToken: tokens[index],
        }),
      ),
    );

    const snapshot = replacements[0].last("room.snapshot").snapshot;
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.players.map((player: any) => player.id).sort()).toEqual([...playerIds].sort());
    expect(snapshot.players.every((player: any) => player.connected)).toBe(true);
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

  it("does not let a player rejoin an expired room", async () => {
    const { harness, sockets } = await createAndJoin("skribbl", ["Alice"]);
    await sockets[0].message({ type: "room.leave" });
    await flush();
    (harness.room as any).room.lastActivity = Date.now() - 61_000;
    await harness.room.alarm();

    const late = harness.connect();
    await late.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Bob",
    });

    expect(late.last("room.error").code).toBe("ROOM_NOT_FOUND");
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

  it("does not serialize a full snapshot for every room sync request", async () => {
    const { sockets } = await createAndJoin("skribbl", ["Alice"]);
    const socket = sockets[0];
    const before = socket.events("room.snapshot").length;

    await socket.message({ type: "room.sync" });
    await socket.message({ type: "room.sync" });
    await socket.message({ type: "room.sync" });

    expect(socket.events("room.snapshot")).toHaveLength(before + 1);
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
    expect(allText(guesser)).not.toContain(`"${selected.word}"`);
  });

  it("offers exactly the configured number of word choices", async () => {
    for (const wordCount of [2, 3, 4, 5]) {
      const harness = await makeRoom("skribbl");
      const alice = harness.connect();
      await alice.message({
        type: "room.create",
        protocolVersion: 1,
        game: "skribbl",
        nickname: "Alice",
        settings: { wordCount },
      });
      const bob = harness.connect();
      await bob.message({
        type: "room.join",
        protocolVersion: 1,
        game: "skribbl",
        code: "abc123",
        nickname: "Bob",
      });
      await alice.message({ type: "room.start" });

      const snapshot = alice.last("room.snapshot").snapshot;
      const drawer = snapshot.drawerId === alice.last("room.welcome").playerId ? alice : bob;
      const choices = drawer.last("game.word.choices").choices;

      expect(choices).toHaveLength(wordCount);
      expect(new Set(choices.map((choice: any) => choice.display)).size).toBe(wordCount);
    }
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

describe("Room code reservation", () => {
  const TTL = 2 * 60_000;

  function reserve(room: any, game: string, code: string): Promise<Response> {
    return room.fetch(
      new Request("https://room.internal/internal/reserve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game, code }),
      }),
    );
  }

  it("rejects room.create when the code was never reserved", async () => {
    const harness = await makeRoom("skribbl", "abc123", { reserve: false });
    const socket = harness.connect();
    await socket.message({
      type: "room.create",
      protocolVersion: 1,
      game: "skribbl",
      nickname: "Alice",
    });

    expect(socket.last("room.error").code).toBe("ROOM_NOT_RESERVED");
    expect(harness.state.storage.map.has("room")).toBe(false);
  });

  it("refuses to reserve a code twice while the first reservation is live", async () => {
    const harness = await makeRoom("skribbl", "abc123");
    const second = await reserve(harness.room, "skribbl", "abc123");
    const body = (await second.json()) as any;

    expect(second.status).toBe(200);
    expect(body).toEqual({ reserved: false, reason: "reserved" });
  });

  it("refuses to reserve a code that already has room state", async () => {
    const { harness } = await createAndJoin("skribbl", ["Alice"]);
    const response = await reserve(harness.room, "skribbl", "abc123");
    const body = (await response.json()) as any;

    expect(body.reserved).toBe(false);
    expect(body.reason).toBe("exists");
  });

  it("reports a reserved room as existing for allocation", async () => {
    const harness = await makeRoom("skribbl", "abc123");
    const response = await harness.room.fetch(
      new Request("https://room.internal/internal/exists"),
    );
    expect(((await response.json()) as any).exists).toBe(true);
  });

  it("rejects invalid reservation payloads", async () => {
    const harness = await makeRoom("skribbl", "abc123");

    const badMethod = await harness.room.fetch(
      new Request("https://room.internal/internal/reserve"),
    );
    expect(badMethod.status).toBe(405);

    const badGame = await reserve(harness.room, "ludo", "abc123");
    expect(badGame.status).toBe(400);

    const badCode = await reserve(harness.room, "skribbl", "no");
    expect(badCode.status).toBe(400);

    const badBody = await harness.room.fetch(
      new Request("https://room.internal/internal/reserve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{nope",
      }),
    );
    expect(badBody.status).toBe(400);
  });

  it("expires a reservation after the TTL and allows reallocation", async () => {
    const harness = await makeRoom("skribbl", "abc123");
    (harness.room as any).room.reservedAt = Date.now() - TTL - 1;

    const socket = harness.connect();
    await socket.message({
      type: "room.create",
      protocolVersion: 1,
      game: "skribbl",
      nickname: "Alice",
    });
    expect(socket.last("room.error").code).toBe("ROOM_NOT_RESERVED");

    const again = await reserve(harness.room, "skribbl", "abc123");
    expect(again.status).toBe(201);
  });

  it("clears an expired reservation on alarm without deleting the room early", async () => {
    const harness = await makeRoom("skribbl", "abc123");
    (harness.room as any).room.reservedAt = Date.now() - TTL - 1;
    (harness.room as any).room.lastActivity = Date.now() - 61_000;

    await harness.room.alarm();

    expect((harness.room as any).room.reservedAt).toBeNull();
    expect(harness.state.storage.map.has("room")).toBe(true);

    (harness.room as any).room.lastActivity = Date.now() - 61_000;
    await harness.room.alarm();
    expect(harness.state.storage.map.has("room")).toBe(false);
  });

  it("keeps a live reservation past the empty-room TTL", async () => {
    const harness = await makeRoom("skribbl", "abc123");
    (harness.room as any).room.lastActivity = Date.now() - 61_000;

    await harness.room.alarm();

    expect(harness.state.storage.map.has("room")).toBe(true);
    expect((harness.room as any).room.reservedAt).not.toBeNull();
  });

  it("does not reallocate a used code before the empty-room TTL", async () => {
    const { harness, sockets } = await createAndJoin("skribbl", ["Alice"]);
    await sockets[0].message({ type: "room.leave" });
    await flush();

    const blocked = await reserve(harness.room, "skribbl", "abc123");
    expect(((await blocked.json()) as any).reason).toBe("exists");

    (harness.room as any).room.lastActivity = Date.now() - 61_000;
    await harness.room.alarm();
    expect(harness.state.storage.map.has("room")).toBe(false);

    const reused = await reserve(harness.room, "skribbl", "abc123");
    expect(reused.status).toBe(201);
  });

  it("does not let a different game consume a reservation", async () => {
    const harness = await makeRoom("chain", "abc123", { reserve: false });
    await reserve(harness.room, "skribbl", "abc123");

    const socket = harness.connect();
    await socket.message({
      type: "room.create",
      protocolVersion: 1,
      game: "chain",
      nickname: "Alice",
    });
    expect(socket.last("room.error").code).toBe("GAME_MISMATCH");
  });
});

describe("Security and abuse controls", () => {
  it("rejects client-supplied score, winner and host fields", async () => {
    const { sockets } = await createAndJoin("skribbl", ["Alice"]);
    const socket = sockets[0];

    await socket.message({
      type: "room.create",
      protocolVersion: 1,
      game: "skribbl",
      nickname: "Mallory",
      score: 9999,
      isHost: true,
    });
    expect(socket.last("room.error").code).toBe("INVALID_EVENT");

    await socket.message({
      type: "chat.guess",
      text: "hello",
      playerId: "someone-else",
    });
    expect(socket.last("room.error").code).toBe("INVALID_EVENT");
  });

  it("only lets the host change lobby settings", async () => {
    const { sockets } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[1].message({
      type: "room.settings.update",
      settings: { rounds: 9 },
    });
    expect(sockets[1].last("room.error").code).toBe("NOT_HOST");
    expect(sockets[1].last("room.snapshot").snapshot.settings.rounds).toBe(3);

    await sockets[0].message({
      type: "room.settings.update",
      settings: { rounds: 9 },
    });
    expect(sockets[0].last("room.snapshot").snapshot.settings.rounds).toBe(9);
  });

  it("ignores a word choice from a player who is not the drawer", async () => {
    const { sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = playerIds.indexOf(snapshot.drawerId);
    const guesser = sockets[drawerIndex === 0 ? 1 : 0];

    await guesser.message({ type: "game.word.choose", wordId: "anything" });

    expect(guesser.events("game.word.selected")).toHaveLength(0);
    expect(guesser.last("room.snapshot").snapshot.phase).toBe("choosing");
  });

  it("does not restart a running game when start is sent twice", async () => {
    const { sockets } = await createAndJoin("chain", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const first = sockets[0].last("room.snapshot").snapshot;

    await sockets[0].message({ type: "room.start" });
    const second = sockets[0].last("room.snapshot").snapshot;

    expect(second.chain.moveCount).toBe(first.chain.moveCount);
    expect(second.chain.turnPlayerId).toBe(first.chain.turnPlayerId);
    expect(
      sockets[0]
        .events("chat.message")
        .filter((event: any) => event.text === "The game started."),
    ).toHaveLength(1);
  });

  it("replaces an older socket when a resume token is reused", async () => {
    const { harness, sockets, playerIds, tokens } = await createAndJoin("skribbl", ["Alice", "Bob"]);

    const replacement = harness.connect();
    await replacement.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Alice",
      resumeToken: tokens[0],
    });

    expect(sockets[0].closed?.code).toBe(4000);
    expect(replacement.last("room.welcome").playerId).toBe(playerIds[0]);
    expect(replacement.last("room.snapshot").snapshot.players).toHaveLength(2);

    // The replaced socket has no session state left, so any late frame is
    // ignored instead of acting on the player's new connection.
    const staleSnapshots = sockets[0].events("room.snapshot").length;
    await sockets[0].message({ type: "room.sync" });
    expect(sockets[0].events("room.snapshot")).toHaveLength(staleSnapshots);
  });

  it("refuses a resume token from a different room while a game is running", async () => {
    const { sockets, tokens } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    const other = await createAndJoin("skribbl", ["Carol", "Dave"], "def456");
    await other.sockets[0].message({ type: "room.start" });
    const socket = other.harness.connect();
    await socket.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "def456",
      nickname: "Mallory",
      resumeToken: tokens[0],
    });

    expect(socket.last("room.error").code).toBe("RESUME_FAILED");
  });

  it("closes a socket after too many invalid messages", async () => {
    const { sockets } = await createAndJoin("skribbl", ["Alice"]);
    const socket = sockets[0];

    for (let index = 0; index < 20; index += 1) {
      await socket.message("{not json");
    }

    expect(socket.closed?.code).toBe(1008);
    expect(socket.last("room.error").code).toBe("PARSE_ERROR");
  });

  it("caps the number of sockets per room", async () => {
    const harness = await makeRoom("skribbl", "abc123");
    for (let index = 0; index < 32; index += 1) {
      (harness.room as any).sockets.set({}, null);
    }

    const response = await harness.room.fetch(
      new Request("https://room.internal/room/abc123?game=skribbl", {
        headers: { Upgrade: "websocket" },
      }),
    );
    expect(response.status).toBe(429);
  });

  it("rejects chat from a player who has not joined", async () => {
    const { harness } = await createAndJoin("skribbl", ["Alice"]);
    const outsider = harness.connect();
    await outsider.message({ type: "chat.guess", text: "hello" });

    expect(outsider.last("room.error").code).toBe("NOT_IN_ROOM");
    expect(outsider.events("chat.message")).toHaveLength(0);
  });
});

describe("Persistence and lifecycle", () => {
  async function restart(state: any, game: "skribbl" | "chain", code: string): Promise<any> {
    const { GameRoom } = await import("../src/Room");
    const room = new GameRoom(state as any, {});
    await state.ready;
    (room as any).requestedCode = code;
    (room as any).requestedGame = game;
    return room;
  }

  it("restores room state after a Durable Object restart", async () => {
    const { harness, sockets, playerIds, tokens } = await createAndJoin("chain", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const before = sockets[0].last("room.snapshot").snapshot;

    const restarted = await restart(harness.state, "chain", "abc123");
    const socket = new (await import("./helpers")).FakeWebSocket();
    (restarted as any).handleSession(socket);
    await socket.message({
      type: "room.join",
      protocolVersion: 1,
      game: "chain",
      code: "abc123",
      nickname: "Alice",
      resumeToken: tokens[0],
    });

    const snapshot = socket.last("room.snapshot").snapshot;
    expect(socket.last("room.welcome").playerId).toBe(playerIds[0]);
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.chain.turnPlayerId).toBe(before.chain.turnPlayerId);
    expect(snapshot.chain.cells).toEqual(before.chain.cells);
  });

  it("restores the private word for the drawer after a restart", async () => {
    const { harness, sockets, playerIds, tokens } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = playerIds.indexOf(snapshot.drawerId);
    const drawer = sockets[drawerIndex];
    const choices = drawer.last("game.word.choices").choices;
    await drawer.message({ type: "game.word.choose", wordId: choices[0].id });
    const word = drawer.last("game.word.selected").word;

    const restarted = await restart(harness.state, "skribbl", "abc123");
    const socket = new (await import("./helpers")).FakeWebSocket();
    (restarted as any).handleSession(socket);
    await socket.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Alice",
      resumeToken: tokens[drawerIndex],
    });

    expect(socket.last("room.snapshot").snapshot.phase).toBe("drawing");
    expect(socket.last("game.word.selected").word).toBe(word);
  });

  it("restores word choices for the drawer after a restart while choosing", async () => {
    const { harness, sockets, playerIds, tokens } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = playerIds.indexOf(snapshot.drawerId);
    const choices = sockets[drawerIndex].last("game.word.choices").choices;

    const restarted = await restart(harness.state, "skribbl", "abc123");
    const socket = new (await import("./helpers")).FakeWebSocket();
    (restarted as any).handleSession(socket);
    await socket.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Alice",
      resumeToken: tokens[drawerIndex],
    });

    expect(socket.last("room.snapshot").snapshot.phase).toBe("choosing");
    expect(socket.last("game.word.choices").choices.map((choice: any) => choice.id)).toEqual(
      choices.map((choice: any) => choice.id),
    );
  });

  it("advances a round-result phase after a restart and reconnects", async () => {
    const { harness, sockets, playerIds, tokens } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = playerIds.indexOf(snapshot.drawerId);
    const drawer = sockets[drawerIndex];
    const choices = drawer.last("game.word.choices").choices;
    await drawer.message({ type: "game.word.choose", wordId: choices[0].id });

    (harness.room as any).room.endsAt = Date.now() - 1;
    await harness.room.alarm();
    expect((harness.room as any).room.phase).toBe("round-result");

    const restarted = await restart(harness.state, "skribbl", "abc123");
    for (let index = 0; index < 2; index += 1) {
      const socket = new (await import("./helpers")).FakeWebSocket();
      (restarted as any).handleSession(socket);
      await socket.message({
        type: "room.join",
        protocolVersion: 1,
        game: "skribbl",
        code: "abc123",
        nickname: index === 0 ? "Alice" : "Bob",
        resumeToken: tokens[index],
      });
    }

    (restarted as any).room.roundEndsAt = Date.now() - 1;
    await restarted.alarm();
    expect((restarted as any).room.phase).toBe("choosing");
  });

  it("restores a live reservation after a restart", async () => {
    const harness = await makeRoom("chain", "abc123");
    const restarted = await restart(harness.state, "chain", "abc123");
    const response = await restarted.fetch(
      new Request("https://room.internal/internal/exists"),
    );
    expect(((await response.json()) as any).exists).toBe(true);
  });

  it("transfers host when the host leaves", async () => {
    const { sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.leave" });
    await flush();

    expect(sockets[1].last("room.snapshot").snapshot.hostId).toBe(playerIds[1]);
  });

  it("expires a fully inactive room", async () => {
    const { harness, sockets } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    sockets[0].close(1001, "gone");
    sockets[1].close(1001, "gone");
    await flush();

    (harness.room as any).sockets.clear();
    (harness.room as any).playerSockets.clear();
    (harness.room as any).room.lastActivity = Date.now() - 601_000;
    for (const player of (harness.room as any).room.players) {
      player.connected = false;
      player.lastSeen = Date.now() - 601_000;
    }
    await harness.room.alarm();
    // The alarm first removes stale players; the empty-room TTL then starts
    // from that removal, so expiry happens on the next scheduled alarm.
    expect((harness.room as any).room.players).toHaveLength(0);
    (harness.room as any).room.lastActivity = Date.now() - 61_000;
    await harness.room.alarm();

    expect(harness.state.storage.map.has("room")).toBe(false);
    expect(harness.state.storage.alarm).toBeNull();
  });

  it("reschedules the alarm for an active round", async () => {
    const { harness, sockets } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    await harness.room.alarm();

    expect(harness.state.storage.alarm).not.toBeNull();
    expect(harness.state.storage.alarm!).toBeGreaterThan(Date.now());
  });

  it("keeps the room alive while at least one player is connected", async () => {
    const { harness, sockets } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    sockets[1].close(1001, "gone");
    await flush();

    (harness.room as any).room.lastActivity = Date.now() - 601_000;
    const bob = (harness.room as any).room.players[1];
    bob.connected = false;
    bob.lastSeen = Date.now() - 601_000;
    await harness.room.alarm();

    expect(harness.state.storage.map.has("room")).toBe(true);
    expect((harness.room as any).room.players).toHaveLength(1);
    expect((harness.room as any).room.players[0].nickname).toBe("Alice");
  });
});

describe("Skribbl edge cases", () => {
  async function startedRound(names: string[]) {
    const joined = await createAndJoin("skribbl", names);
    await joined.sockets[0].message({ type: "room.start" });
    const snapshot = joined.sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = joined.playerIds.indexOf(snapshot.drawerId);
    const drawer = joined.sockets[drawerIndex];
    const choices = drawer.last("game.word.choices").choices;
    await drawer.message({ type: "game.word.choose", wordId: choices[0].id });
    const word = drawer.last("game.word.selected").word;
    return { ...joined, drawerIndex, drawer, word };
  }

  it("does not score the same player twice for a repeated correct guess", async () => {
    const { sockets, playerIds, drawerIndex, word } = await startedRound(["Alice", "Bob", "Carol"]);
    const guesserIndex = drawerIndex === 0 ? 1 : 0;
    const guesser = sockets[guesserIndex];

    await guesser.message({ type: "chat.guess", text: word });
    const score = guesser
      .last("room.snapshot")
      .snapshot.players.find((player: any) => player.id === playerIds[guesserIndex]).score;

    await guesser.message({ type: "chat.guess", text: word });

    const repeated = guesser
      .last("room.snapshot")
      .snapshot.players.find((player: any) => player.id === playerIds[guesserIndex]).score;
    expect(repeated).toBe(score);
    expect(guesser.events("game.correct-guess")).toHaveLength(1);
    expect(guesser.last("room.snapshot").snapshot.phase).toBe("drawing");
  });

  it("scores near-simultaneous correct guesses and ends the round once", async () => {
    const { sockets, playerIds, drawerIndex, word } = await startedRound(["Alice", "Bob", "Carol"]);
    const guesserIndexes = playerIds.map((_, index) => index).filter((index) => index !== drawerIndex);

    await Promise.all(
      guesserIndexes.map((index) => sockets[index].message({ type: "chat.guess", text: word })),
    );

    const snapshot = sockets[0].last("room.snapshot").snapshot;
    for (const index of guesserIndexes) {
      const player = snapshot.players.find((entry: any) => entry.id === playerIds[index]);
      expect(player.score).toBeGreaterThan(0);
      expect(player.guessedCorrectly).toBe(true);
    }
    expect(sockets[0].events("game.round.ended")).toHaveLength(1);
    expect(sockets[0].last("game.round.ended").reason).toBe("all-guessed");
  });

  it("hides a secret word typed by the drawer without hiding their normal chat", async () => {
    const { sockets, playerIds, drawerIndex, drawer, word } = await startedRound([
      "Alice",
      "Bob",
      "Carol",
    ]);
    const others = sockets.filter((_, index) => index !== drawerIndex);
    const secretSentence = `I think it is ${word} but maybe not`;

    await drawer.message({ type: "chat.guess", text: secretSentence });

    const ownMessage = drawer
      .events("chat.message")
      .find((event: any) => event.playerId === playerIds[drawerIndex] && event.text === secretSentence);
    expect(ownMessage).toBeTruthy();
    expect(ownMessage.private).toBe(true);

    for (const socket of others) {
      const messages = socket
        .events("chat.message")
        .filter((event: any) => event.playerId === playerIds[drawerIndex]);
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("Secret message hidden.");
      expect(messages[0].private).toBe(true);
      expect(
        socket
          .events("chat.message")
          .filter((event: any) => !event.system)
          .some((event: any) => event.text.toLowerCase().includes(word.toLowerCase())),
      ).toBe(false);
    }

    await drawer.message({ type: "chat.guess", text: "haha" });

    for (const socket of sockets) {
      expect(
        socket
          .events("chat.message")
          .some((event: any) => event.playerId === playerIds[drawerIndex] && event.text === "haha"),
      ).toBe(true);
    }
  });

  it("hides a guessed player's secret word inside a sentence but keeps normal chat public", async () => {
    const { sockets, playerIds, drawerIndex, word } = await startedRound(["Alice", "Bob", "Carol"]);
    const guesserIndex = playerIds.findIndex((_, index) => index !== drawerIndex);
    const observerIndex = playerIds.findIndex(
      (_, index) => index !== drawerIndex && index !== guesserIndex,
    );
    const guesser = sockets[guesserIndex];
    const observer = sockets[observerIndex];
    const secretSentence = `I knew it was ${word} all along`;

    await guesser.message({ type: "chat.guess", text: word });
    expect(guesser.last("room.snapshot").snapshot.players.find(
      (player: any) => player.id === playerIds[guesserIndex],
    ).guessedCorrectly).toBe(true);

    await guesser.message({ type: "chat.guess", text: secretSentence });
    await guesser.message({ type: "chat.guess", text: "nice drawing" });

    const ownSecret = guesser
      .events("chat.message")
      .find((event: any) => event.playerId === playerIds[guesserIndex] && event.text === secretSentence);
    expect(ownSecret).toBeTruthy();

    const observerMessages = observer
      .events("chat.message")
      .filter((event: any) => event.playerId === playerIds[guesserIndex]);
    expect(observerMessages.map((event: any) => event.text)).toEqual([
      "Secret message hidden.",
      "nice drawing",
    ]);
    expect(
      observer
        .events("chat.message")
        .filter((event: any) => !event.system)
        .some((event: any) => event.text.toLowerCase().includes(word.toLowerCase())),
    ).toBe(false);

    const drawerMessages = sockets[drawerIndex]
      .events("chat.message")
      .filter((event: any) => event.playerId === playerIds[guesserIndex]);
    expect(drawerMessages.map((event: any) => event.text)).toEqual([
      "Secret message hidden.",
      "nice drawing",
    ]);
  });

  it("hides a secret word typed by a player who has not guessed yet", async () => {
    const { harness, sockets, playerIds, drawerIndex, word } = await startedRound([
      "Alice",
      "Bob",
      "Carol",
    ]);
    const senderIndex = playerIds.findIndex((_, index) => index !== drawerIndex);
    const observerIndex = playerIds.findIndex(
      (_, index) => index !== drawerIndex && index !== senderIndex,
    );
    const sender = sockets[senderIndex];
    const observer = sockets[observerIndex];
    const secretSentence = `I think the answer is ${word}`;

    await sender.message({ type: "chat.guess", text: secretSentence });

    const ownMessage = sender
      .events("chat.message")
      .find((event: any) => event.playerId === playerIds[senderIndex] && event.text === secretSentence);
    expect(ownMessage).toBeTruthy();
    expect(ownMessage.private).toBe(true);

    const observerMessages = observer
      .events("chat.message")
      .filter((event: any) => event.playerId === playerIds[senderIndex]);
    expect(observerMessages.map((event: any) => event.text)).toEqual(["Secret message hidden."]);
    expect(observerMessages[0].private).toBe(true);

    // A word inside a sentence is not an exact guess: no points are awarded and
    // the player stays a non-guesser.
    const senderState = sender
      .last("room.snapshot")
      .snapshot.players.find((player: any) => player.id === playerIds[senderIndex]);
    expect(senderState.score).toBe(0);
    expect(senderState.guessedCorrectly).toBe(false);
    expect(sockets[0].events("game.correct-guess")).toHaveLength(0);
    expect((harness.room as any).room.guessedPlayerIds).toHaveLength(0);

    await sender.message({ type: "chat.guess", text: "nice drawing" });
    expect(
      observer
        .events("chat.message")
        .some((event: any) => event.playerId === playerIds[senderIndex] && event.text === "nice drawing"),
    ).toBe(true);
  });

  it("hides a spaced-out secret word from every other player", async () => {
    const { sockets, playerIds, drawerIndex, drawer, word } = await startedRound([
      "Alice",
      "Bob",
      "Carol",
    ]);
    const spaced = [...word].join(" ");
    const message = `maybe ${spaced}?`;

    await drawer.message({ type: "chat.guess", text: message });

    for (const socket of sockets.filter((_, index) => index !== drawerIndex)) {
      const messages = socket
        .events("chat.message")
        .filter((event: any) => event.playerId === playerIds[drawerIndex]);
      expect(messages.map((event: any) => event.text)).toEqual(["Secret message hidden."]);
    }

    const ownMessage = drawer
      .events("chat.message")
      .find((event: any) => event.playerId === playerIds[drawerIndex]);
    expect(ownMessage.text).toBe(message);
  });

  it("resets correct-guess status when the next round begins", async () => {
    const { harness, sockets, playerIds, drawerIndex, word } = await startedRound([
      "Alice",
      "Bob",
      "Carol",
    ]);
    const guesserIndex = playerIds.findIndex((_, index) => index !== drawerIndex);
    await sockets[guesserIndex].message({ type: "chat.guess", text: word });

    expect(
      sockets[0]
        .last("room.snapshot")
        .snapshot.players.find((player: any) => player.id === playerIds[guesserIndex])
        .guessedCorrectly,
    ).toBe(true);

    (harness.room as any).room.endsAt = Date.now() - 1;
    await harness.room.alarm();
    (harness.room as any).room.roundEndsAt = Date.now() - 1;
    await harness.room.alarm();

    const nextRound = sockets[0].last("room.snapshot").snapshot;
    expect(nextRound.phase).toBe("choosing");
    expect(nextRound.players.every((player: any) => player.guessedCorrectly === false)).toBe(true);
    expect((harness.room as any).room.guessedPlayerIds).toHaveLength(0);
  });

  it("ignores a correct guess after the round has ended", async () => {
    const { sockets, playerIds, drawerIndex, word } = await startedRound(["Alice", "Bob"]);
    const guesserIndex = drawerIndex === 0 ? 1 : 0;
    const guesser = sockets[guesserIndex];

    await guesser.message({ type: "chat.guess", text: word });
    expect(guesser.last("room.snapshot").snapshot.phase).toBe("round-result");
    const score = guesser
      .last("room.snapshot")
      .snapshot.players.find((player: any) => player.id === playerIds[guesserIndex]).score;

    await guesser.message({ type: "chat.guess", text: word });

    const repeated = guesser
      .last("room.snapshot")
      .snapshot.players.find((player: any) => player.id === playerIds[guesserIndex]).score;
    expect(repeated).toBe(score);
    expect(guesser.events("game.correct-guess")).toHaveLength(1);
  });

  it("skips a drawer who disconnects while choosing after the grace period", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const before = sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = playerIds.indexOf(before.drawerId);
    const otherIndex = drawerIndex === 0 ? 1 : 0;

    sockets[drawerIndex].close(1001, "gone");
    await flush();
    const drawer = (harness.room as any).room.players.find(
      (player: any) => player.id === before.drawerId,
    );
    drawer.lastSeen = Date.now() - 16_000;

    await harness.room.alarm();

    const after = sockets[otherIndex].last("room.snapshot").snapshot;
    expect(after.phase).toBe("choosing");
    expect(after.drawerId).toBe(playerIds[otherIndex]);
    expect(after.drawerId).not.toBe(before.drawerId);
  });

  it("ends the round when the drawer disconnects while drawing", async () => {
    const { harness, sockets, playerIds } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const drawerIndex = playerIds.indexOf(snapshot.drawerId);
    const drawer = sockets[drawerIndex];
    await drawer.message({
      type: "game.word.choose",
      wordId: drawer.last("game.word.choices").choices[0].id,
    });

    drawer.close(1001, "gone");
    await flush();
    const record = (harness.room as any).room.players.find(
      (player: any) => player.id === snapshot.drawerId,
    );
    record.lastSeen = Date.now() - 16_000;

    await harness.room.alarm();

    expect(sockets[drawerIndex === 0 ? 1 : 0].last("room.snapshot").snapshot.phase).toBe(
      "round-result",
    );
    expect(
      sockets[drawerIndex === 0 ? 1 : 0].last("game.round.ended").reason,
    ).toBe("drawer-disconnected");
  });

  it("keeps a correct guesser's score through a reconnect", async () => {
    const { harness, sockets, playerIds, drawerIndex, word } = await startedRound([
      "Alice",
      "Bob",
      "Carol",
    ]);
    const guesserIndex = drawerIndex === 0 ? 1 : 0;
    const guesser = sockets[guesserIndex];
    const token = (harness.room as any).room.players.find(
      (player: any) => player.id === playerIds[guesserIndex],
    ).resumeToken;

    await guesser.message({ type: "chat.guess", text: word });
    const scored = guesser
      .last("room.snapshot")
      .snapshot.players.find((player: any) => player.id === playerIds[guesserIndex]).score;
    expect(scored).toBeGreaterThan(0);

    guesser.close(1001, "refresh");
    await flush();

    const replacement = harness.connect();
    await replacement.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Bob",
      resumeToken: token,
    });

    const restored = replacement
      .last("room.snapshot")
      .snapshot.players.find((player: any) => player.id === playerIds[guesserIndex]);
    expect(restored.score).toBe(scored);
    expect(restored.connected).toBe(true);
    expect(replacement.last("room.welcome").playerId).toBe(playerIds[guesserIndex]);
  });

  it("rejects an expired resume token after the reconnect grace period", async () => {
    const { harness, sockets, playerIds, drawerIndex, word } = await startedRound([
      "Alice",
      "Bob",
      "Carol",
    ]);
    const guesserIndex = drawerIndex === 0 ? 1 : 0;
    const guesser = sockets[guesserIndex];
    const token = (harness.room as any).room.players.find(
      (player: any) => player.id === playerIds[guesserIndex],
    ).resumeToken;

    await guesser.message({ type: "chat.guess", text: word });
    guesser.close(1001, "gone");
    await flush();
    const record = (harness.room as any).room.players.find(
      (player: any) => player.id === playerIds[guesserIndex],
    );
    record.lastSeen = Date.now() - 31_000;

    await harness.room.alarm();
    expect((harness.room as any).room.players).toHaveLength(2);

    const replacement = harness.connect();
    await replacement.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Bob",
      resumeToken: token,
    });
    expect(replacement.last("room.error").code).toBe("RESUME_FAILED");
  });

  it("ignores undo and clear commands from players who are not drawing", async () => {
    const { harness, sockets, playerIds, drawerIndex, drawer } = await startedRound([
      "Alice",
      "Bob",
      "Carol",
    ]);
    const guesserIndex = playerIds.findIndex((_, index) => index !== drawerIndex);

    await drawer.message({
      type: "drawing.stroke",
      strokeId: "stroke-1",
      color: "#111111",
      width: 4,
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
    });
    expect((harness.room as any).room.strokes).toHaveLength(1);

    await sockets[guesserIndex].message({ type: "drawing.clear" });
    await sockets[guesserIndex].message({ type: "drawing.undo" });
    expect((harness.room as any).room.strokes).toHaveLength(1);

    await drawer.message({ type: "drawing.clear" });
    expect((harness.room as any).room.strokes).toHaveLength(0);
  });

  it("does not rebroadcast full snapshots for redundant undo or clear", async () => {
    const { harness, sockets, drawer } = await startedRound(["Alice", "Bob", "Carol"]);

    await drawer.message({
      type: "drawing.stroke",
      strokeId: "stroke-1",
      color: "#111111",
      width: 4,
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
    });
    const snapshots = sockets[0].events("room.snapshot").length;

    // One undo removes the stroke; extra undos and clears on an empty canvas
    // must not turn into free full-canvas broadcasts for a hostile drawer.
    await drawer.message({ type: "drawing.undo" });
    await drawer.message({ type: "drawing.undo" });
    await drawer.message({ type: "drawing.clear" });

    expect((harness.room as any).room.strokes).toHaveLength(0);
    expect(sockets[0].events("room.snapshot")).toHaveLength(snapshots);
    expect(drawer.events("drawing.undo")).toHaveLength(1);
    expect(drawer.events("drawing.clear")).toHaveLength(0);
  });

  it("accepts the trailing done frame the canvas sends after its last flush", async () => {
    const { harness, drawer } = await startedRound(["Alice", "Bob", "Carol"]);

    await drawer.message({
      type: "drawing.stroke",
      strokeId: "stroke-1",
      color: "#111111",
      width: 4,
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
    });

    // The canvas flushes every 40ms, so lifting the pointer after a pause emits
    // a final frame with no new points. Breaking after 20 of those would
    // disconnect an ordinary player mid-round.
    for (let index = 0; index < 25; index += 1) {
      await drawer.message({
        type: "drawing.stroke",
        strokeId: "stroke-1",
        color: "#111111",
        width: 4,
        points: [],
        done: true,
      });
    }

    expect(drawer.closed).toBeNull();
    expect(drawer.events("room.error")).toHaveLength(0);
    const strokes = (harness.room as any).room.strokes;
    expect(strokes).toHaveLength(1);
    expect(strokes[0].points).toHaveLength(2);
  });

  it("caps total drawing points so a round stays within storage and snapshot limits", async () => {
    const { harness, drawer } = await startedRound(["Alice", "Bob", "Carol"]);
    const point = { x: 0.25, y: 0.75 };

    for (let index = 0; index < 200; index += 1) {
      await (harness.room as any).handleStroke(drawer, {
        type: "drawing.stroke",
        strokeId: `stroke-${index}`,
        color: "#111111",
        width: 4,
        points: Array.from({ length: 128 }, () => ({ ...point })),
        done: true,
      });
    }

    const strokes = (harness.room as any).room.strokes;
    const total = strokes.reduce(
      (sum: number, stroke: any) => sum + stroke.points.length,
      0,
    );
    expect(total).toBe(MAX_STROKE_POINTS_PER_ROUND);

    const snapshot = (harness.room as any).createSnapshot();
    expect(JSON.stringify(snapshot).length).toBeLessThan(1_000_000);
  });
});

describe("Chain Reaction edge cases", () => {
  async function startedChain() {
    const joined = await createAndJoin("chain", ["Alice", "Bob"]);
    await joined.sockets[0].message({ type: "room.start" });
    return joined;
  }

  it("rejects a replayed move after the turn has advanced", async () => {
    const { sockets, playerIds } = await startedChain();
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const turnIndex = playerIds.indexOf(snapshot.chain.turnPlayerId);

    await sockets[turnIndex].message({ type: "chain.place", row: 2, col: 4 });
    const after = sockets[0].last("room.snapshot").snapshot;

    await sockets[turnIndex].message({ type: "chain.place", row: 2, col: 4 });
    expect(sockets[turnIndex].last("room.error").code).toBe("INVALID_MOVE");
    expect(sockets[0].last("room.snapshot").snapshot.chain.cells).toEqual(after.chain.cells);
  });

  it("plays an automatic legal move when the turn clock expires", async () => {
    const { harness, sockets, playerIds } = await startedChain();
    const before = sockets[0].last("room.snapshot").snapshot;
    const currentId = before.chain.turnPlayerId;

    (harness.room as any).room.chain.turnEndsAt = Date.now() - 1;
    await harness.room.alarm();

    const after = sockets[0].last("room.snapshot").snapshot;
    expect(after.chain.moveCount).toBe(before.chain.moveCount + 1);
    expect(after.chain.turnPlayerId).not.toBe(currentId);
    expect(after.chain.lastMove.playerId).toBe(currentId);
    expect(sockets[0].events("chain.turn.timeout")).toHaveLength(1);
    expect(after.chain.turnPlayerId).toBe(playerIds.find((id) => id !== currentId));
  });

  it("finishes the game when the player on turn disconnects for good", async () => {
    const { harness, sockets, playerIds } = await startedChain();
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const turnIndex = playerIds.indexOf(snapshot.chain.turnPlayerId);

    sockets[turnIndex].close(1001, "gone");
    await flush();
    const player = (harness.room as any).room.players.find(
      (record: any) => record.id === snapshot.chain.turnPlayerId,
    );
    player.lastSeen = Date.now() - 31_000;

    await harness.room.alarm();

    const after = sockets[turnIndex === 0 ? 1 : 0].last("room.snapshot").snapshot;
    expect(after.phase).toBe("game-over");
    expect(after.chain.winnerId).toBe(playerIds[turnIndex === 0 ? 1 : 0]);
  });

  it("rejects forged outcome fields on a move", async () => {
    const { sockets, playerIds } = await startedChain();
    const snapshot = sockets[0].last("room.snapshot").snapshot;
    const turnIndex = playerIds.indexOf(snapshot.chain.turnPlayerId);

    await sockets[turnIndex].message({
      type: "chain.place",
      row: 2,
      col: 4,
      winnerId: playerIds[turnIndex],
      score: 9999,
    });

    expect(sockets[turnIndex].last("room.error").code).toBe("INVALID_EVENT");
    expect(sockets[0].last("room.snapshot").snapshot.chain.moveCount).toBe(0);
  });
});

describe("Additional security and persistence", () => {
  it("rejects unknown event types", async () => {
    const { sockets } = await createAndJoin("skribbl", ["Alice"]);
    await sockets[0].message({ type: "game.win", playerId: "me" });
    expect(sockets[0].last("room.error").code).toBe("INVALID_EVENT");
  });

  it("rejects an invalid resume token during an active game", async () => {
    const { harness, sockets } = await createAndJoin("skribbl", ["Alice", "Bob"]);
    await sockets[0].message({ type: "room.start" });

    const outsider = harness.connect();
    await outsider.message({
      type: "room.join",
      protocolVersion: 1,
      game: "skribbl",
      code: "abc123",
      nickname: "Mallory",
      resumeToken: "not-a-real-token",
    });
    expect(outsider.last("room.error").code).toBe("RESUME_FAILED");
  });

  it("caps multiple sockets from one client in the same room", async () => {
    const harness = await makeRoom("skribbl", "abc123");
    const room = harness.room as any;
    for (let index = 0; index < 8; index += 1) {
      room.socketState.set({}, {
        tokens: 60,
        lastRefill: Date.now(),
        invalid: 0,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        client: "203.0.113.7",
      });
    }

    const response = await harness.room.fetch(
      new Request("https://room.internal/room/abc123?game=skribbl", {
        headers: { Upgrade: "websocket", "cf-connecting-ip": "203.0.113.7" },
      }),
    );
    expect(response.status).toBe(429);
  });

  it("resets persisted connected flags and reschedules alarms after a restart", async () => {
    const { harness } = await createAndJoin("chain", ["Alice", "Bob"]);
    const stored = harness.state.storage.map.get("room") as any;
    expect(stored.players.every((player: any) => player.connected)).toBe(true);

    const { GameRoom } = await import("../src/Room");
    const restarted = new GameRoom(harness.state as any, {});
    await harness.state.ready;

    const room = (restarted as any).room;
    expect(room.players.every((player: any) => !player.connected)).toBe(true);
    const persisted = harness.state.storage.map.get("room") as any;
    expect(persisted.players.every((player: any) => !player.connected)).toBe(true);
    expect(harness.state.storage.alarm).not.toBeNull();
  });

  it("wakes a dormant empty room so its expiry deadline is not lost", async () => {
    const harness = await makeRoom("skribbl", "abc123", { reserve: false });
    const roomState = (harness.room as any).room;
    roomState.code = "abc123";
    roomState.game = "skribbl";
    roomState.version = 3;
    roomState.lastActivity = Date.now() - 15 * 60 * 1000;
    await harness.state.storage.put("room", roomState);

    const { GameRoom } = await import("../src/Room");
    const restarted = new GameRoom(harness.state as any, {});
    await harness.state.ready;

    expect(harness.state.storage.alarm).not.toBeNull();
    await restarted.alarm();
    expect(harness.state.storage.map.has("room")).toBe(false);
    expect(harness.state.storage.alarm).toBeNull();
  });
});

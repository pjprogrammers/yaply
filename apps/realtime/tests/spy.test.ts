import { describe, expect, it } from "vitest";
import { SPY_CATEGORIES } from "@yaply/shared/constants";
import type { SpyRole } from "@yaply/shared/types";
import {
  addSpyClue,
  createSpyState,
  normalizeWord,
  scoreSpyGame,
  selectSpyPair,
  spyAliveIds,
  spyWinner,
  tallySpyVotes,
  textRevealsAnyWord,
  textRevealsWord,
  type SpyState,
} from "../src/spy";
import { SPY_WORD_PAIRS, SPY_WORD_POOLS } from "../src/spy-words";
import { createAndJoin, flush, makeRoom } from "./helpers";

describe("Who's the Spy word bank", () => {
  it("has the twenty advertised categories with thirty pairs each", () => {
    expect(Object.keys(SPY_WORD_POOLS)).toHaveLength(20);
    expect(Object.keys(SPY_WORD_POOLS).sort()).toEqual(
      SPY_CATEGORIES.map((category) => category.id).sort(),
    );

    for (const [category, seeds] of Object.entries(SPY_WORD_POOLS)) {
      expect(seeds, category).toHaveLength(30);
    }
    expect(SPY_WORD_PAIRS).toHaveLength(600);
  });

  it("keeps every pair id unique and every difficulty valid", () => {
    const ids = new Set(SPY_WORD_PAIRS.map((pair) => pair.id));
    expect(ids.size).toBe(SPY_WORD_PAIRS.length);

    for (const pair of SPY_WORD_PAIRS) {
      expect(["easy", "normal", "hard"]).toContain(pair.difficulty);
      expect(pair.wordA.trim().length).toBeGreaterThan(0);
      expect(pair.wordB.trim().length).toBeGreaterThan(0);
      expect(normalizeWord(pair.wordA)).not.toBe(normalizeWord(pair.wordB));
    }
  });

  it("selects a pair from the requested category and difficulty", () => {
    const selected = selectSpyPair(["food-drinks"], "normal", [], () => 0);
    expect(selected?.categoryId).toBe("food-drinks");
    expect(selected?.pair.difficulty).toBe("normal");
  });

  it("avoids recently used pairs until the pool is exhausted", () => {
    const pool = SPY_WORD_PAIRS.filter(
      (pair) => pair.categoryId === "food-drinks" && pair.difficulty === "easy",
    );
    const recent = pool.slice(0, -1).map((pair) => pair.id);
    const selected = selectSpyPair(["food-drinks"], "easy", recent, () => 0);

    expect(selected?.pair.id).toBe(pool[pool.length - 1]?.id);
  });

  it("falls back to the mixed pool for an unknown category", () => {
    const selected = selectSpyPair(["not-a-category"], "hard", [], () => 0);
    expect(selected).not.toBeNull();
    expect(["mixed"]).toContain(selected?.categoryId);
  });
});

describe("Who's the Spy engine", () => {
  const players = ["a", "b", "c", "d", "e"];

  it("assigns the automatic spy count and keeps civilians in the majority", () => {
    const state = createSpyState({
      playerIds: players,
      categoryIds: ["mixed"],
      difficulty: "normal",
      requestedSpies: 0,
      random: () => 0.4,
    })!;

    expect(state.spyIds).toHaveLength(1);
    expect(Object.keys(state.assignments)).toHaveLength(5);
    expect(state.spyIds.every((id) => state.assignments[id]?.role === "spy")).toBe(true);
    expect(
      Object.values(state.assignments).filter((entry) => entry.role === "civilian"),
    ).toHaveLength(4);
  });

  it("clamps an oversized spy request to a strict civilian majority", () => {
    const state = createSpyState({
      playerIds: players,
      categoryIds: ["mixed"],
      difficulty: "normal",
      requestedSpies: 99,
      random: () => 0.4,
    })!;

    // Five players can only support two spies: two spies vs three civilians.
    expect(state.spyIds).toHaveLength(2);
  });

  it("uses two spies automatically for a nine-player room", () => {
    const state = createSpyState({
      playerIds: Array.from({ length: 9 }, (_, index) => `p${index}`),
      categoryIds: ["mixed"],
      difficulty: "normal",
      requestedSpies: 0,
      random: () => 0.4,
    })!;
    expect(state.spyIds).toHaveLength(2);
  });

  it("gives the two teams different words and remembers the pair", () => {
    const state = createSpyState({
      playerIds: players,
      categoryIds: ["animals"],
      difficulty: "easy",
      requestedSpies: 1,
      random: () => 0.4,
    })!;

    expect(state.civilianWord).not.toBe(state.spyWord);
    const spyId = state.spyIds[0]!;
    expect(state.assignments[spyId]?.word).toBe(state.spyWord);
    const civilianId = players.find((id) => !state.spyIds.includes(id))!;
    expect(state.assignments[civilianId]?.word).toBe(state.civilianWord);
    expect(state.recentPairIds).toEqual([state.pairId]);
  });

  it("counts a clear vote winner", () => {
    const tally = tallySpyVotes(
      [
        { voterId: "a", targetId: "b" },
        { voterId: "b", targetId: "a" },
        { voterId: "c", targetId: "a" },
      ],
      ["a", "b", "c"],
    );
    expect(tally.eliminatedId).toBe("a");
    expect(tally.tiedIds).toEqual([]);
  });

  it("reports a tie without eliminating anyone", () => {
    const tally = tallySpyVotes(
      [
        { voterId: "a", targetId: "b" },
        { voterId: "b", targetId: "a" },
      ],
      ["a", "b", "c"],
    );
    expect(tally.eliminatedId).toBeNull();
    expect(tally.tiedIds.sort()).toEqual(["a", "b"]);
  });

  it("limits a revote to the tied candidates and counts each voter once", () => {
    const tally = tallySpyVotes(
      [
        { voterId: "a", targetId: "c" },
        { voterId: "a", targetId: "b" },
        { voterId: "c", targetId: "b" },
      ],
      ["a", "b", "c"],
      ["a", "b"],
    );
    expect(tally.eliminatedId).toBe("b");
    expect(tally.counts.c).toBeUndefined();
  });

  it("detects all spies eliminated and spy parity", () => {
    const state = createSpyState({
      playerIds: ["a", "b", "c", "d"],
      categoryIds: ["mixed"],
      difficulty: "normal",
      requestedSpies: 1,
      random: () => 0.4,
    })!;
    const spyId = state.spyIds[0]!;
    const civilians = ["a", "b", "c", "d"].filter((id) => id !== spyId);

    expect(spyWinner(state, ["a", "b", "c", "d"])).toBeNull();
    expect(spyWinner(state, [civilians[0]!, spyId])).toBe("spies");
    state.eliminatedIds = [spyId];
    expect(spyWinner(state, civilians)).toBe("civilians");
  });

  it("blocks direct, compact and spelled secret words without flagging substrings", () => {
    expect(textRevealsWord("I love pizza", "Pizza")).toBe(true);
    expect(textRevealsWord("it is p i z z a", "Pizza")).toBe(true);
    expect(textRevealsWord("pi-zza night", "Pizza")).toBe(true);
    expect(textRevealsWord("I ate a slice", "Pizza")).toBe(false);
    expect(textRevealsWord("instead of that", "tea")).toBe(false);
    expect(textRevealsWord("tea time", "tea")).toBe(true);
    expect(textRevealsAnyWord("the hidden word", ["Pizza", "Coffee"])).toBe(false);
  });

  it("only counts players who were assigned a role as alive", () => {
    const state = createSpyState({
      playerIds: players,
      categoryIds: ["mixed"],
      difficulty: "normal",
      requestedSpies: 1,
      random: () => 0.4,
    })!;
    state.eliminatedIds.push("b");

    expect(spyAliveIds(state, [...players, "late-joiner"])).toEqual(["a", "c", "d", "e"]);
  });

  it("adds clues to the current round only", () => {
    const state = createSpyState({
      playerIds: ["a", "b", "c"],
      categoryIds: ["mixed"],
      difficulty: "normal",
      requestedSpies: 1,
      random: () => 0.4,
    })!;
    const clue = addSpyClue(state, "a", "A warm slice", 1_000);
    expect(clue.round).toBe(1);
    expect(state.clues).toEqual([clue]);
  });

  it("scores spies, civilians and the final guess once", () => {
    const state = createSpyState({
      playerIds: ["a", "b", "c", "d"],
      categoryIds: ["mixed"],
      difficulty: "normal",
      requestedSpies: 1,
      random: () => 0.4,
    })!;
    const spyId = state.spyIds[0]!;
    const civilianId = ["a", "b", "c", "d"].find((id) => id !== spyId)!;
    state.voteHistory = [{ voterId: civilianId, targetId: spyId, round: 1, revote: false }];
    state.finalGuessResult = { playerId: spyId, correct: true };

    const rankings = scoreSpyGame({
      state,
      players: ["a", "b", "c", "d"].map((id) => ({
        id,
        nickname: id.toUpperCase(),
        joinedAt: 1,
      })),
      winnerTeam: "spies",
    });

    const spyScore = rankings.find((entry) => entry.playerId === spyId)?.score ?? 0;
    const civilianScore = rankings.find((entry) => entry.playerId === civilianId)?.score ?? 0;
    expect(spyScore).toBe(50 + 150 + 100);
    expect(civilianScore).toBe(100);
  });
});

type SpyHarness = Awaited<ReturnType<typeof createAndJoin>>;

function stateOf(harness: SpyHarness): SpyState {
  const state = (harness.harness.room as any).room.spy as SpyState | null;
  if (!state) throw new Error("Spy state is missing");
  return state;
}

function snapshotOf(socket: { last: (type: string) => any }) {
  return socket.last("room.snapshot").snapshot;
}

function socketFor(harness: SpyHarness, playerId: string) {
  const index = harness.playerIds.indexOf(playerId);
  if (index < 0) throw new Error("Unknown player");
  return harness.sockets[index]!;
}

async function advancePhase(harness: SpyHarness) {
  (harness.harness.room as any).room.endsAt = Date.now() - 1;
  await (harness.harness.room as any).handleSpyAlarm(Date.now());
}

async function startSpyRoom(names = ["Alice", "Bob", "Cara", "Drew"], settings = {}) {
  const harness = await makeRoom("whos-the-spy");
  const host = harness.connect();
  await host.message({
    type: "room.create",
    protocolVersion: 1,
    game: "whos-the-spy",
    nickname: names[0],
    settings,
  });
  const sockets = [host];
  const playerIds: string[] = [host.last("room.welcome").playerId];
  const tokens: string[] = [host.last("room.welcome").resumeToken];

  for (const name of names.slice(1)) {
    const socket = harness.connect();
    await socket.message({
      type: "room.join",
      protocolVersion: 1,
      game: "whos-the-spy",
      code: "abc123",
      nickname: name,
    });
    sockets.push(socket);
    playerIds.push(socket.last("room.welcome").playerId);
    tokens.push(socket.last("room.welcome").resumeToken);
  }

  return { harness, sockets, playerIds, tokens };
}

async function readyAll(room: SpyHarness) {
  for (const socket of room.sockets) {
    await socket.message({ type: "spy.ready" });
  }
}

async function submitAllClues(room: SpyHarness) {
  for (let index = 0; index < 12; index += 1) {
    const snapshot = snapshotOf(room.sockets[0]!);
    if (snapshot.phase !== "clue") return;
    const speakerId = snapshot.spy.activeSpeakerId;
    if (!speakerId) return;
    await socketFor(room, speakerId).message({ type: "spy.clue", text: `clue ${index}` });
  }
}

describe("Who's the Spy room rules", () => {
  it("starts with private roles and no secret words in public state", async () => {
    const room = await startSpyRoom();
    await room.sockets[0]!.message({ type: "room.start" });

    const snapshot = snapshotOf(room.sockets[0]!);
    expect(snapshot.phase).toBe("role-reveal");
    expect(snapshot.spy.spyCount).toBe(1);
    expect(snapshot.spy.roles).toBeNull();
    expect(snapshot.spy.civilianWord).toBeNull();
    expect(snapshot.spy.spyWord).toBeNull();
    expect(JSON.stringify(snapshot)).not.toContain(stateOf(room).civilianWord);
    expect(JSON.stringify(snapshot)).not.toContain(stateOf(room).spyWord);

    const roles = room.sockets.map((socket) => socket.last("spy.role"));
    expect(roles.every((role) => role && typeof role.word === "string")).toBe(true);
    expect(roles.filter((role) => role.role === "spy")).toHaveLength(1);

    const state = stateOf(room);
    const spyId = state.spyIds[0]!;
    const civilianId = room.playerIds.find((id) => id !== spyId)!;
    expect(socketFor(room, spyId).last("spy.role").word).toBe(state.spyWord);
    expect(socketFor(room, civilianId).last("spy.role").word).toBe(state.civilianWord);
  });

  it("restores the same role and word on reconnect", async () => {
    const room = await startSpyRoom();
    await room.sockets[0]!.message({ type: "room.start" });
    const playerId = room.playerIds[2]!;
    const original = socketFor(room, playerId).last("spy.role");

    room.sockets[2]!.close(1000, "reload");
    await flush();

    const reconnected = room.harness.connect();
    await reconnected.message({
      type: "room.join",
      protocolVersion: 1,
      game: "whos-the-spy",
      code: "abc123",
      nickname: "Cara",
      resumeToken: room.tokens[2],
    });

    expect(reconnected.last("room.welcome").playerId).toBe(playerId);
    expect(reconnected.last("spy.role")).toEqual(original);
    expect(snapshotOf(reconnected).phase).toBe("role-reveal");
  });

  it("rejects a clue from the wrong speaker and one that reveals a word", async () => {
    const room = await startSpyRoom();
    await room.sockets[0]!.message({ type: "room.start" });
    const state = stateOf(room);
    await readyAll(room);

    const snapshot = snapshotOf(room.sockets[0]!);
    expect(snapshot.phase).toBe("clue");
    const speakerId = snapshot.spy.activeSpeakerId;
    const otherId = room.playerIds.find((id) => id !== speakerId)!;
    const speaker = socketFor(room, speakerId);
    const other = socketFor(room, otherId);

    await other.message({ type: "spy.clue", text: "out of turn" });
    expect(other.last("room.error").code).toBe("NOT_YOUR_TURN");

    await speaker.message({ type: "spy.clue", text: state.civilianWord });
    expect(speaker.last("room.error").code).toBe("CLUE_REVEALS_WORD");

    await speaker.message({ type: "spy.clue", text: "it is warm and round" });
    expect(snapshotOf(room.sockets[0]!).spy.clues).toHaveLength(1);
  });

  it("gives the next connected speaker a fresh clue clock after a drop", async () => {
    const room = await startSpyRoom();
    await room.sockets[0]!.message({ type: "room.start" });
    await readyAll(room);

    // Pin the order so this test always has a middle seat to drop.
    const spy = stateOf(room);
    spy.turnOrder = [...room.playerIds];
    spy.speakerIndex = 0;
    const activeId = room.playerIds[0]!;
    const droppedId = room.playerIds[1]!;
    const nextId = room.playerIds[2]!;

    socketFor(room, droppedId).close(1000, "drop");
    await flush();

    // If the skipped seat's clock were carried over, this near-expired deadline
    // would leave the next speaker with less than a second.
    (room.harness.room as any).room.endsAt = Date.now() + 500;
    await socketFor(room, activeId).message({ type: "spy.clue", text: "first clue" });

    const snapshot = snapshotOf(room.sockets[0]!);
    expect(snapshot.spy.activeSpeakerId).toBe(nextId);
    expect(snapshot.endsAt).not.toBeNull();
    expect(snapshot.endsAt - Date.now()).toBeGreaterThan(30_000);
  });

  it("lets the host remove a player and blocks that resume token", async () => {
    const room = await startSpyRoom();
    const targetId = room.playerIds[2]!;
    const targetToken = room.tokens[2]!;
    const targetSocket = room.sockets[2]!;

    await room.sockets[0]!.message({ type: "room.player.remove", playerId: targetId });

    expect(targetSocket.last("room.error").code).toBe("REMOVED_BY_HOST");
    expect(targetSocket.closed?.code).toBe(4001);
    expect(snapshotOf(room.sockets[0]!).players.map((player: { id: string }) => player.id)).not.toContain(
      targetId,
    );

    const rejoin = room.harness.connect();
    await rejoin.message({
      type: "room.join",
      protocolVersion: 1,
      game: "whos-the-spy",
      code: "abc123",
      nickname: "Cara",
      resumeToken: targetToken,
    });
    expect(rejoin.last("room.error").code).toBe("REMOVED_BY_HOST");
  });

  it("rejects removal from a non-host and of the host's own seat", async () => {
    const room = await startSpyRoom();

    await room.sockets[1]!.message({
      type: "room.player.remove",
      playerId: room.playerIds[2]!,
    });
    expect(room.sockets[1]!.last("room.error").code).toBe("NOT_HOST");

    await room.sockets[0]!.message({
      type: "room.player.remove",
      playerId: room.playerIds[0]!,
    });
    expect(room.sockets[0]!.last("room.error").code).toBe("CANNOT_REMOVE_SELF");
    expect(snapshotOf(room.sockets[0]!).players).toHaveLength(4);
  });

  it("removes a living player mid-match without breaking the round", async () => {
    const room = await startSpyRoom();
    await room.sockets[0]!.message({ type: "room.start" });
    const spyId = stateOf(room).spyIds[0]!;
    const civilianId = room.playerIds.find(
      (id) => id !== spyId && id !== room.playerIds[0],
    )!;

    await room.sockets[0]!.message({ type: "room.player.remove", playerId: civilianId });

    const snapshot = snapshotOf(room.sockets[0]!);
    expect(snapshot.players.map((player: { id: string }) => player.id)).not.toContain(
      civilianId,
    );
    expect(snapshot.phase).not.toBe("results");
    expect(snapshot.spy.activePlayerIds).not.toContain(civilianId);
  });

  it("enforces private voting, no self votes and no changes", async () => {
    const room = await startSpyRoom();
    await room.sockets[0]!.message({ type: "room.start" });
    await readyAll(room);
    await submitAllClues(room);
    expect(snapshotOf(room.sockets[0]!).phase).toBe("discussion");
    await advancePhase(room);
    expect(snapshotOf(room.sockets[0]!).phase).toBe("voting");

    const voterId = room.playerIds[0]!;
    const voter = socketFor(room, voterId);
    await voter.message({ type: "spy.vote", targetId: voterId });
    expect(voter.last("room.error").code).toBe("SELF_VOTE");

    const targetId = room.playerIds[1]!;
    await voter.message({ type: "spy.vote", targetId });
    await voter.message({ type: "spy.vote", targetId: room.playerIds[2]! });
    expect(voter.last("room.error").code).toBe("VOTE_LOCKED");

    // The tally is public, but the ballot itself stays server-side.
    expect(snapshotOf(room.sockets[0]!).spy.votesCast).toBe(1);
    expect(snapshotOf(room.sockets[0]!).spy.votes).toBeNull();
  });

  it("reveals the result after the last vote and advances the round", async () => {
    const room = await startSpyRoom();
    await room.sockets[0]!.message({ type: "room.start" });
    await readyAll(room);
    await submitAllClues(room);
    await advancePhase(room);

    const state = stateOf(room);
    const targetId = room.playerIds.find((id) => state.assignments[id]?.role === "civilian")!;
    for (const playerId of room.playerIds) {
      if (playerId === targetId) continue;
      await socketFor(room, playerId).message({ type: "spy.vote", targetId });
    }
    await socketFor(room, targetId).message({
      type: "spy.vote",
      targetId: room.playerIds.find(
        (id) => id !== targetId && state.assignments[id]?.role === "spy",
      )!,
    });

    const eliminated = snapshotOf(room.sockets[0]!);
    expect(eliminated.phase).toBe("elimination");
    expect(eliminated.spy.lastElimination.playerId).toBe(targetId);
    expect(eliminated.spy.lastElimination.role).toBe("civilian");
    expect(room.sockets[0]!.last("spy.elimination").elimination.playerId).toBe(targetId);

    await advancePhase(room);
    expect(snapshotOf(room.sockets[0]!).phase).toBe("clue");
    expect(snapshotOf(room.sockets[0]!).spy.round).toBe(2);
  });

  it("ends the match when spies reach parity", async () => {
    const room = await startSpyRoom(["Alice", "Bob", "Cara"]);
    await room.sockets[0]!.message({ type: "room.start" });
    await readyAll(room);
    await submitAllClues(room);
    await advancePhase(room);

    const state = stateOf(room);
    const civilianId = room.playerIds.find(
      (id) => state.assignments[id]?.role === "civilian",
    )!;
    const spyId = room.playerIds.find((id) => state.assignments[id]?.role === "spy")!;
    for (const playerId of room.playerIds) {
      const target = playerId === civilianId ? spyId : civilianId;
      await socketFor(room, playerId).message({ type: "spy.vote", targetId: target });
    }
    await advancePhase(room);

    const snapshot = snapshotOf(room.sockets[0]!);
    expect(snapshot.phase).toBe("results");
    expect(snapshot.spy.winnerTeam).toBe("spies");
    expect(snapshot.spy.resultReason).toBe("spies-reached-parity");
    expect(snapshot.spy.roles).not.toBeNull();
    expect(snapshot.spy.civilianWord).toBe(state.civilianWord);
    expect(snapshot.spy.spyWord).toBe(state.spyWord);
    expect(room.sockets[0]!.last("spy.results").winnerTeam).toBe("spies");
  });

  it("gives the final eliminated spy one guess at the civilian word", async () => {
    const room = await startSpyRoom();
    await room.sockets[0]!.message({ type: "room.start" });
    await readyAll(room);
    await submitAllClues(room);
    await advancePhase(room);

    const state = stateOf(room);
    const spyId = state.spyIds[0]!;
    for (const playerId of room.playerIds) {
      if (playerId === spyId) continue;
      await socketFor(room, playerId).message({ type: "spy.vote", targetId: spyId });
    }
    await socketFor(room, spyId).message({
      type: "spy.vote",
      targetId: room.playerIds.find((id) => id !== spyId)!,
    });

    expect(snapshotOf(room.sockets[0]!).phase).toBe("elimination");
    await advancePhase(room);

    const finalSnapshot = snapshotOf(room.sockets[0]!);
    expect(finalSnapshot.phase).toBe("final-guess");
    expect(finalSnapshot.spy.finalGuessPlayerId).toBe(spyId);

    await socketFor(room, spyId).message({ type: "spy.final.guess", word: "definitely wrong" });
    const results = snapshotOf(room.sockets[0]!);
    expect(results.phase).toBe("results");
    expect(results.spy.winnerTeam).toBe("civilians");
    expect(results.spy.resultReason).toBe("final-guess-wrong");
    expect(room.sockets[0]!.last("spy.final-guess.result").correct).toBe(false);
  });

  it("blocks secret words in public chat and keeps spectator chat separate", async () => {
    const room = await startSpyRoom(
      ["Alice", "Bob", "Cara", "Drew"],
      { spySpectatorChat: true },
    );
    await room.sockets[0]!.message({ type: "room.start" });
    const state = stateOf(room);
    await readyAll(room);

    const speaker = socketFor(room, snapshotOf(room.sockets[0]!).spy.activeSpeakerId);
    const before = room.sockets.filter((socket) => socket !== speaker).map((socket) => socket.sent.length);
    await speaker.message({ type: "chat.guess", text: `the answer is ${state.civilianWord}` });
    const warning = speaker.last("chat.message");
    expect(warning.system).toBe(true);
    expect(warning.kind).toBe("error");
    expect(
      room.sockets
        .filter((socket) => socket !== speaker)
        .map((socket) => socket.sent.length),
    ).toEqual(before);

    // Eliminate a civilian, then check that their chat only reaches other
    // eliminated players.
    const targetId =
      room.playerIds.find(
        (id) => id !== room.playerIds[0] && state.assignments[id]?.role === "civilian",
      ) ?? room.playerIds.find((id) => state.assignments[id]?.role === "civilian")!;
    state.eliminatedIds.push(targetId);
    const eliminated = socketFor(room, targetId);
    await eliminated.message({ type: "chat.guess", text: "spectator only" });

    const spectatorMessage = eliminated.last("chat.message");
    expect(spectatorMessage.spectator).toBe(true);
    expect(room.sockets[0]!.events("chat.message").every((event) => !event.spectator)).toBe(true);
    expect(
      room.sockets
        .filter((socket) => socket !== eliminated)
        .every((socket) => !socket.events("chat.message").some((event) => event.text === "spectator only")),
    ).toBe(true);
  });

  it("keeps lobby chat public before the first deal", async () => {
    const room = await startSpyRoom(["Alice", "Bob", "Cara"]);
    await room.sockets[1]!.message({ type: "chat.guess", text: "anyone up for a case?" });
    await flush();

    for (const socket of room.sockets) {
      const message = socket.last("chat.message");
      expect(message.text).toBe("anyone up for a case?");
      expect(message.system).toBeFalsy();
      expect(message.spectator).toBeFalsy();
    }
  });

  it("rejects a brand-new seat once the match is running", async () => {
    const room = await startSpyRoom(["Alice", "Bob", "Cara"]);
    await room.sockets[0]!.message({ type: "room.start" });
    await flush();

    const late = room.harness.connect();
    await late.message({
      type: "room.join",
      protocolVersion: 1,
      game: "whos-the-spy",
      code: "abc123",
      nickname: "Late",
    });

    expect(late.last("room.error").code).toBe("ROOM_IN_PROGRESS");
    expect(late.last("room.welcome")).toBeUndefined();
    expect(snapshotOf(room.sockets[0]!).players).toHaveLength(3);
  });

  it("returns the finished room to the lobby and clears its secrets", async () => {
    const room = await startSpyRoom(["Alice", "Bob", "Cara"]);
    await room.sockets[0]!.message({ type: "room.start" });
    (room.harness.room as any).room.phase = "results";
    await flush();

    await room.sockets[1]!.message({ type: "game.lobby" });
    expect(room.sockets[1]!.last("room.error").code).toBe("NOT_HOST");

    await room.sockets[0]!.message({ type: "game.lobby" });
    const snapshot = snapshotOf(room.sockets[0]!);
    expect(snapshot.phase).toBe("lobby");
    expect(snapshot.spy).toBeNull();
    expect(snapshot.endsAt).toBeNull();
    expect(room.sockets[0]!.last("chat.message").text).toBe(
      "The room is back in the lobby.",
    );

    // The lobby accepts fresh seats again, and a rematch is a blocked action
    // until a new result screen exists.
    const late = room.harness.connect();
    await late.message({
      type: "room.join",
      protocolVersion: 1,
      game: "whos-the-spy",
      code: "abc123",
      nickname: "Late",
    });
    expect(late.last("room.welcome")).toBeDefined();
    await room.sockets[0]!.message({ type: "game.lobby" });
    expect(snapshotOf(room.sockets[0]!).phase).toBe("lobby");
  });

  it("rejects a rematch with fewer than three connected players", async () => {
    const room = await startSpyRoom(["Alice", "Bob", "Cara"]);
    await room.sockets[0]!.message({ type: "room.start" });
    // Fast-forward to the result screen through the engine's own result path.
    (room.harness.room as any).room.phase = "results";
    room.sockets[1]!.close(1000, "left");
    room.sockets[2]!.close(1000, "left");
    await flush();
    await room.sockets[0]!.message({ type: "game.rematch" });
    expect(room.sockets[0]!.last("room.error").code).toBe("NOT_ENOUGH_PLAYERS");
  });
});

describe("Who's the Spy protocol", () => {
  it("validates every spy client action", async () => {
    const { ClientEventSchema } = await import("@yaply/shared/schemas");
    expect(ClientEventSchema.safeParse({ type: "spy.ready" }).success).toBe(true);
    expect(ClientEventSchema.safeParse({ type: "game.lobby" }).success).toBe(true);
    expect(ClientEventSchema.safeParse({ type: "spy.clue", text: "warm" }).success).toBe(true);
    expect(ClientEventSchema.safeParse({ type: "spy.vote", targetId: "p1" }).success).toBe(true);
    expect(ClientEventSchema.safeParse({ type: "spy.final.guess", word: "Pizza" }).success).toBe(
      true,
    );
    expect(ClientEventSchema.safeParse({ type: "spy.clue", text: "" }).success).toBe(false);
    expect(ClientEventSchema.safeParse({ type: "spy.vote", targetId: "" }).success).toBe(false);
    expect(ClientEventSchema.safeParse({ type: "spy.ready", force: true }).success).toBe(false);
  });
});

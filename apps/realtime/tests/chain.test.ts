import { describe, expect, it } from "vitest";
import {
  applyChainMove,
  canPlace,
  countOrbs,
  createChainState,
  criticalMass,
  neighbors,
  nextActivePlayer,
  pickAutoMove,
  rankChainPlayers,
  removeChainPlayer,
} from "../src/chain";

const ORDER = ["a", "b", "c"];

function fresh(players = ["a", "b"]) {
  return createChainState(players, 1_000, 45);
}

describe("chain engine", () => {
  it("sets critical mass by position", () => {
    expect(criticalMass(0, 0)).toBe(2);
    expect(criticalMass(0, 4)).toBe(3);
    expect(criticalMass(2, 4)).toBe(4);
  });

  it("returns orthogonal neighbours only", () => {
    expect(neighbors(0, 0)).toEqual([
      { row: 1, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(neighbors(2, 4)).toHaveLength(4);
  });

  it("places an orb and hands the turn to the next player", () => {
    const state = fresh();
    const result = applyChainMove(state, "a", 2, 4, ["a", "b"], 1_000, 45);
    expect(result).not.toBeNull();
    expect(result?.state.cells[2 * 9 + 4]).toEqual({ ownerId: "a", orbs: 1 });
    expect(result?.state.turnPlayerId).toBe("b");
    expect(result?.state.moveCount).toBe(1);
    expect(result?.state.turnEndsAt).toBe(46_000);
  });

  it("explodes a corner into its two neighbours", () => {
    let state = fresh();
    state = applyChainMove(state, "a", 0, 0, ["a", "b"], 1_000, 45)!.state;
    state = { ...state, turnPlayerId: "a" };
    const result = applyChainMove(state, "a", 0, 0, ["a", "b"], 2_000, 45)!;

    expect(result.move.explosions).toEqual([{ row: 0, col: 0, ownerId: "a" }]);
    expect(result.state.cells[0]).toEqual({ ownerId: "a", orbs: 0 });
    expect(result.state.cells[1]).toEqual({ ownerId: "a", orbs: 1 });
    expect(result.state.cells[9]).toEqual({ ownerId: "a", orbs: 1 });
  });

  it("captures opponent orbs in a cascade", () => {
    let state = fresh();
    state = applyChainMove(state, "a", 0, 0, ["a", "b"], 1_000, 45)!.state;
    state = { ...state, turnPlayerId: "b" };
    state = applyChainMove(state, "b", 1, 0, ["a", "b"], 2_000, 45)!.state;
    state = { ...state, turnPlayerId: "a" };
    const result = applyChainMove(state, "a", 0, 0, ["a", "b"], 3_000, 45)!;

    expect(result.move.captured).toBe(1);
    expect(result.state.cells[1 * 9 + 0].ownerId).toBe("a");
    expect(result.eliminated).toEqual(["b"]);
    expect(result.winnerId).toBe("a");
  });

  it("rejects a move on an opponent cell", () => {
    let state = fresh();
    state = applyChainMove(state, "a", 3, 4, ["a", "b"], 1_000, 45)!.state;
    state = { ...state, turnPlayerId: "b" };
    expect(canPlace(state, "b", 3, 4)).toBe(false);
    expect(applyChainMove(state, "b", 3, 4, ["a", "b"], 2_000, 45)).toBeNull();
  });

  it("eliminates a player whose last orb is captured and names a winner", () => {
    let state = fresh();
    // a takes the corner and one neighbour; b holds a single orb in the other neighbour.
    state = applyChainMove(state, "a", 0, 0, ["a", "b"], 1_000, 45)!.state;
    state = { ...state, turnPlayerId: "b" };
    state = applyChainMove(state, "b", 0, 1, ["a", "b"], 2_000, 45)!.state;
    state = { ...state, turnPlayerId: "a" };
    const result = applyChainMove(state, "a", 0, 0, ["a", "b"], 3_000, 45)!;

    expect(result.eliminated).toEqual(["b"]);
    expect(result.winnerId).toBe("a");
    expect(result.state.winnerId).toBe("a");
    expect(result.state.turnPlayerId).toBeNull();
    expect(result.state.turnEndsAt).toBeNull();
  });

  it("removes a surrendering player's orbs and advances the turn", () => {
    let state = fresh(ORDER);
    state = applyChainMove(state, "a", 2, 4, ORDER, 1_000, 45)!.state;
    const next = removeChainPlayer(state, "a", ORDER, 2_000, 45)!;

    expect(next.eliminatedPlayerIds).toContain("a");
    expect(countOrbs(next.cells, "a")).toBe(0);
    expect(next.turnPlayerId).toBe("b");
  });

  it("picks a legal auto move for the current player", () => {
    const state = fresh();
    const move = pickAutoMove(state, "a");
    expect(move).not.toBeNull();
    expect(canPlace(state, "a", move!.row, move!.col)).toBe(true);
    expect(pickAutoMove(state, "b")).toBeNull();
  });

  it("ranks the winner first and eliminated players last", () => {
    const state = {
      ...fresh(ORDER),
      winnerId: "b",
      eliminatedPlayerIds: ["c"],
    };
    const ranked = rankChainPlayers(state, ORDER);
    expect(ranked[0]).toBe("b");
    expect(ranked[ranked.length - 1]).toBe("c");
  });

  it("does not mutate the original state when a move is illegal", () => {
    const state = fresh();
    const before = JSON.stringify(state);
    expect(applyChainMove(state, "b", 2, 4, ["a", "b"], 1_000, 45)).toBeNull();
    expect(JSON.stringify(state)).toBe(before);
  });

  it("terminates a long cascade and leaves a valid board", () => {
    let state = fresh(["a", "b"]);
    // Fill the centre with a large stack, then trigger it. The queue-based
    // engine must finish with finite orbs and no negative counts.
    state.cells[2 * 9 + 4] = { ownerId: "a", orbs: 20 };
    state = { ...state, turnPlayerId: "a" };
    const result = applyChainMove(state, "a", 2, 4, ["a", "b"], 1_000, 45);
    expect(result).not.toBeNull();
    expect(result!.state.cells.every((cell) => cell.orbs >= 0)).toBe(true);
    expect(result!.state.moveCount).toBe(1);
  });

  it("starts the next seat at index zero when the previous player left", () => {
    const state = { ...fresh(["a", "b", "c"]), turnPlayerId: "a" };
    const next = nextActivePlayer(state, ["b", "c"], "a");
    expect(next).toBe("b");
  });
});

describe("chain explosions and determinism", () => {
  it("explodes an edge cell into three neighbours", () => {
    const state = fresh();
    state.cells[4] = { ownerId: "a", orbs: 2 };
    state.turnPlayerId = "a";

    const result = applyChainMove(state, "a", 0, 4, ["a", "b"], 1_000, 45)!;

    expect(result.move.explosions).toEqual([{ row: 0, col: 4, ownerId: "a" }]);
    expect(result.state.cells[4]).toEqual({ ownerId: "a", orbs: 0 });
    for (const index of [3, 5, 1 * 9 + 4]) {
      expect(result.state.cells[index]).toMatchObject({ ownerId: "a", orbs: 1 });
    }
  });

  it("explodes a centre cell into four neighbours", () => {
    const state = fresh();
    state.cells[2 * 9 + 4] = { ownerId: "a", orbs: 3 };
    state.turnPlayerId = "a";

    const result = applyChainMove(state, "a", 2, 4, ["a", "b"], 1_000, 45)!;

    expect(result.move.explosions).toEqual([{ row: 2, col: 4, ownerId: "a" }]);
    expect(result.state.cells[2 * 9 + 4]).toEqual({ ownerId: "a", orbs: 0 });
    for (const index of [1 * 9 + 4, 3 * 9 + 4, 2 * 9 + 3, 2 * 9 + 5]) {
      expect(result.state.cells[index]).toMatchObject({ ownerId: "a", orbs: 1 });
    }
  });

  it("explodes multiple cells in the same cascade", () => {
    const state = fresh();
    // Corner (0,0) is one orb from critical mass; the neighbouring edge (0,1)
    // reaches critical mass only after the corner sends an orb into it.
    state.cells[0] = { ownerId: "a", orbs: 1 };
    state.cells[1] = { ownerId: "a", orbs: 2 };
    state.turnPlayerId = "a";

    const result = applyChainMove(state, "a", 0, 0, ["a", "b"], 1_000, 45)!;

    expect(result.move.explosions.map((entry) => `${entry.row}:${entry.col}`)).toEqual([
      "0:0",
      "0:1",
    ]);
    expect(result.state.cells.every((cell) => cell.orbs >= 0)).toBe(true);
  });

  it("is deterministic and never mutates the input state", () => {
    const state = fresh(["a", "b"]);
    state.cells[2 * 9 + 4] = { ownerId: "a", orbs: 3 };
    state.turnPlayerId = "a";
    const snapshot = JSON.stringify(state);

    const first = applyChainMove(state, "a", 2, 4, ["a", "b"], 5_000, 45)!;
    const second = applyChainMove(state, "a", 2, 4, ["a", "b"], 5_000, 45)!;

    expect(first.state).toEqual(second.state);
    expect(first.move).toEqual(second.move);
    expect(first.eliminated).toEqual(second.eliminated);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("skips eliminated seats when choosing the next turn", () => {
    const state = {
      ...fresh(["a", "b", "c"]),
      turnPlayerId: "a",
      eliminatedPlayerIds: ["b"],
    };
    expect(nextActivePlayer(state, ["a", "b", "c"], "a")).toBe("c");
  });

  it("rejects out-of-bounds coordinates without changing the board", () => {
    const state = fresh();
    const before = JSON.stringify(state);
    expect(canPlace(state, "a", -1, 0)).toBe(false);
    expect(canPlace(state, "a", 0, -1)).toBe(false);
    expect(canPlace(state, "a", state.rows, 0)).toBe(false);
    expect(canPlace(state, "a", 0, state.cols)).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });
});

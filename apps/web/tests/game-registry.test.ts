import { describe, expect, it } from "vitest";
import { GAMES, getGameBySlug } from "../lib/game-registry";

describe("game registry", () => {
  it("has five games", () => {
    expect(GAMES).toHaveLength(5);
  });

  it("includes skribbl as implemented", () => {
    const skribbl = getGameBySlug("skribbl");
    expect(skribbl?.status).toBe("implemented");
    expect(skribbl?.route).toBe("/games/skribbl/create");
  });

  it("marks others as coming soon", () => {
    const others = GAMES.filter((g) => g.slug !== "skribbl");
    for (const game of others) {
      expect(game.status).toBe("coming-soon");
    }
  });
});

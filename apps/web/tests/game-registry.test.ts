import { describe, expect, it } from "vitest";
import { gameHref, games } from "../data/games";

describe("game directory", () => {
  it("lists six games", () => {
    expect(games).toHaveLength(6);
  });

  it("marks the four live games as available with external URLs", () => {
    const live = games.filter((game) => game.status === "available");
    expect(live.map((game) => game.slug).sort()).toEqual([
      "chain-reaction",
      "holeio",
      "skribbl",
      "smash-karts",
    ]);
    for (const game of live) {
      expect(game.url).toMatch(/^https:\/\//);
      expect(gameHref(game)).toBe(game.url);
    }
  });

  it("keeps coming-soon games on internal preview pages", () => {
    const upcoming = games.filter((game) => game.status === "coming-soon");
    expect(upcoming).toHaveLength(2);
    for (const game of upcoming) {
      expect(game.url).toBeNull();
      expect(gameHref(game)).toBe(`/games/${game.slug}`);
    }
  });

  it("gives every game a unique slug and a poster", () => {
    const slugs = new Set(games.map((game) => game.slug));
    expect(slugs.size).toBe(games.length);
    for (const game of games) {
      expect(game.poster).toMatch(/^\/games\/.+\.png$/);
    }
  });
});

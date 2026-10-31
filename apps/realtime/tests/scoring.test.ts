import { describe, expect, it } from "vitest";
import { calculateDrawerPoints, calculateGuessPoints } from "../src/scoring";
import { normalizeGuess, pickWords } from "../src/words-util";

describe("scoring", () => {
  it("rewards a fast correct guess more than a slow one", () => {
    const fast = calculateGuessPoints(80, 80, 1);
    const slow = calculateGuessPoints(5, 80, 1);
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThanOrEqual(10);
  });

  it("never returns a negative score", () => {
    expect(calculateGuessPoints(-10, 80, 12)).toBeGreaterThanOrEqual(10);
  });

  it("awards drawer points in proportion to correct guessers", () => {
    expect(calculateDrawerPoints(0, 3)).toBe(0);
    expect(calculateDrawerPoints(3, 3)).toBe(100);
    expect(calculateDrawerPoints(1, 4)).toBe(25);
    expect(calculateDrawerPoints(1, 0)).toBe(0);
  });
});

describe("word helpers", () => {
  it("normalizes case, spacing and unicode forms", () => {
    expect(normalizeGuess("  Ice   CREAM ")).toBe("ice cream");
    expect(normalizeGuess("ＣＡＴ")).toBe("cat");
  });

  it("returns the requested number of unique words", () => {
    const words = pickWords(5);
    expect(words).toHaveLength(5);
    expect(new Set(words).size).toBe(5);
  });
});

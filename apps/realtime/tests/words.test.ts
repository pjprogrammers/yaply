import { describe, expect, it } from "vitest";
import { WORD_CATEGORIES, WORDS } from "../src/words";
import { containsSecretWord, maskWord, pickWordChoices, pickWords } from "../src/words-util";

const EN = WORDS.en;
const ENTRY = /^[a-z0-9'" -]+$/;

describe("word directory", () => {
  it("is wide and varied enough for long matches", () => {
    expect(EN.length).toBeGreaterThanOrEqual(1500);
    expect(new Set(EN).size).toBe(EN.length);
    expect(EN.filter((word) => word.includes(" ")).length).toBeGreaterThanOrEqual(400);
    expect(EN.filter((word) => word.length >= 10).length).toBeGreaterThanOrEqual(400);
    expect(EN.filter((word) => word.length >= 14).length).toBeGreaterThanOrEqual(100);
  });

  it("contains only clean, drawable entries", () => {
    for (const word of EN) {
      expect(word, word).toBe(word.trim().toLowerCase());
      expect(word, word).toMatch(ENTRY);
      expect(word.split(" ").length, word).toBeLessThanOrEqual(3);
      expect(word.length, word).toBeGreaterThanOrEqual(3);
      expect(word.length, word).toBeLessThanOrEqual(24);
    }
  });

  it("keeps every curated category populated", () => {
    for (const [name, words] of Object.entries(WORD_CATEGORIES)) {
      expect(words.length, name).toBeGreaterThan(0);
    }
  });
});

describe("word picking", () => {
  it("returns the requested number of unique words", () => {
    const words = pickWords(5);
    expect(words).toHaveLength(5);
    expect(new Set(words).size).toBe(5);
  });

  it("honours the exclusion list", () => {
    const first = pickWords(30);
    const second = pickWords(30, "en", first);
    expect(second.some((word) => first.includes(word))).toBe(false);
  });

  it("does not repeat a word across a match", () => {
    let used: string[] = [];
    const seen = new Set<string>();

    for (let turn = 0; turn < 80; turn += 1) {
      const pick = pickWordChoices(3, "en", used);
      used = pick.used;
      for (const word of pick.words) {
        expect(seen.has(word), word).toBe(false);
        seen.add(word);
      }
    }

    expect(seen.size).toBe(240);
    expect(used).toHaveLength(240);
  });

  it("refills the bag after the directory is exhausted", () => {
    const lastWord = EN[EN.length - 1];
    const almostEverything = EN.slice(0, EN.length - 1);
    const pick = pickWordChoices(5, "en", almostEverything);

    expect(pick.words).toHaveLength(5);
    expect(new Set(pick.words).size).toBe(5);
    expect(pick.words).toContain(lastWord);
    // Only the refilled words remain in the new cycle.
    expect(pick.used).toHaveLength(4);
  });

  it("handles a zero-word request", () => {
    expect(pickWords(0)).toEqual([]);
    expect(pickWordChoices(0, "en", ["cat"])).toEqual({ words: [], used: ["cat"] });
  });
});

describe("multi-word masks", () => {
  it("keeps spaces visible in the mask", () => {
    expect(maskWord("hot air balloon")).toBe("___ ___ _______");
  });

  it("matches a spaced phrase inside a message", () => {
    expect(containsSecretWord("I saw a hot air balloon", "hot air balloon")).toBe(true);
    expect(containsSecretWord("hotairballoon", "hot air balloon")).toBe(true);
    expect(containsSecretWord("hot air", "hot air balloon")).toBe(false);
  });
});

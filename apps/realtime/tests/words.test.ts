import { describe, expect, it } from "vitest";
import type { WordLanguage } from "@yaply/shared/types";
import { WORD_ALIASES, WORD_CATEGORIES_BY_LANGUAGE, WORDS } from "../src/words";
import {
  acceptedAnswers,
  containsSecretWord,
  isExactGuess,
  maskWord,
  matchesWord,
  pickWordChoices,
  pickWords,
} from "../src/words-util";

const EN = WORDS.en;
const ENTRY = /^[a-z0-9'" -]+$/;
const LANGUAGES: WordLanguage[] = ["tl", "ja", "ko"];

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
    for (const [language, categories] of Object.entries(WORD_CATEGORIES_BY_LANGUAGE)) {
      for (const [name, words] of Object.entries(categories)) {
        expect(words.length, `${language}/${name}`).toBeGreaterThan(0);
      }
    }
  });

  it.each(LANGUAGES)("ships a broad %s pool with no duplicates", (language) => {
    const words = WORDS[language];
    expect(words.length).toBeGreaterThanOrEqual(800);
    expect(new Set(words).size).toBe(words.length);

    const flattened = Object.values(WORD_CATEGORIES_BY_LANGUAGE[language]).flat();
    expect(new Set(flattened).size).toBe(flattened.length);
  });

  it.each(LANGUAGES)("keeps every %s entry in the expected script", (language) => {
    const patterns: Record<Exclude<WordLanguage, "en">, RegExp> = {
      tl: /^[a-z' -]+$/,
      ja: /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー・]+$/u,
      ko: /^[\p{Script=Hangul} ]+$/u,
    };

    for (const word of WORDS[language]) {
      expect(word, word).toBe(word.trim());
      expect(word, word).toMatch(patterns[language]);
      expect(word, word).not.toContain("  ");
      expect([...word].length, word).toBeGreaterThanOrEqual(1);
      expect([...word].length, word).toBeLessThanOrEqual(24);
      expect(word.split(" ").length, word).toBeLessThanOrEqual(3);
    }
  });

  it("only maps aliases for words that exist in the Japanese pool", () => {
    const japanese = new Set(WORDS.ja);
    for (const [word, readings] of Object.entries(WORD_ALIASES)) {
      expect(japanese.has(word), word).toBe(true);
      expect(readings.length, word).toBeGreaterThan(0);
      expect(readings).not.toContain(word);
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

  it.each(LANGUAGES)("draws %s choices only from that language", (language) => {
    const pool = new Set(WORDS[language]);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const words = pickWords(5, language);
      expect(words).toHaveLength(5);
      expect(new Set(words).size).toBe(5);
      for (const word of words) expect(pool.has(word), word).toBe(true);
    }
  });

  it.each(LANGUAGES)("does not repeat a %s word across a match", (language) => {
    let used: string[] = [];
    const seen = new Set<string>();

    for (let turn = 0; turn < 60; turn += 1) {
      const pick = pickWordChoices(3, language, used);
      used = pick.used;
      for (const word of pick.words) {
        expect(seen.has(word), word).toBe(false);
        seen.add(word);
      }
    }

    expect(seen.size).toBe(180);
    expect(used).toHaveLength(180);
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

  it("masks CJK characters one code point at a time", () => {
    expect(maskWord("ねこ")).toBe("__");
    expect(maskWord("銀行")).toBe("__");
    expect(maskWord("김치")).toBe("__");
  });

  it("matches a spaced phrase inside a message", () => {
    expect(containsSecretWord("I saw a hot air balloon", "hot air balloon")).toBe(true);
    expect(containsSecretWord("hotairballoon", "hot air balloon")).toBe(true);
    expect(containsSecretWord("hot air", "hot air balloon")).toBe(false);
  });
});

describe("multilingual guesses", () => {
  it("accepts hiragana and katakana spellings of the same word", () => {
    expect(isExactGuess("ラーメン", "らーめん")).toBe(true);
    expect(isExactGuess("らあめん", "らーめん")).toBe(false);
    expect(matchesWord("ラーメンがすき", "らーめん")).toBe(true);
  });

  it("accepts kanji readings through the alias map", () => {
    expect(acceptedAnswers("病院")).toContain("びょういん");
    expect(isExactGuess("びょういん", "病院")).toBe(true);
    expect(isExactGuess("ビョウイン", "病院")).toBe(true);
    expect(matchesWord("病院にいく", "病院")).toBe(true);
    expect(matchesWord("びょういんにいく", "病院")).toBe(true);
    expect(isExactGuess("びょう", "病院")).toBe(false);
  });

  it("requires a full match for an exact guess", () => {
    expect(isExactGuess("kimchi", "kimchi")).toBe(true);
    expect(isExactGuess("kimchi soup", "kimchi")).toBe(false);
    expect(matchesWord("kimchi soup", "kimchi")).toBe(true);
  });
});

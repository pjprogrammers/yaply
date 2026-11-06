import type { WordLanguage } from "@yaply/shared/types";
import { WORD_ALIASES, WORDS } from "./words";

export type WordPick = {
  /** The words offered to the drawer, in order. */
  words: string[];
  /** The updated used-word list for the room. */
  used: string[];
};

/**
 * Japanese players may type a loanword in hiragana or katakana. Folding
 * hiragana into katakana before comparing makes both spellings count without
 * needing an alias for every entry.
 */
function foldKana(value: string): string {
  return value.replace(/[\u3041-\u3096]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) + 0x60),
  );
}

function sampleWords(pool: readonly string[], count: number): string[] {
  const remaining = [...pool];
  const picked: string[] = [];
  while (picked.length < count && remaining.length > 0) {
    const index = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(index, 1)[0]);
  }
  return picked;
}

/**
 * Returns `n` distinct words from the language pool, optionally excluding
 * words the room has already seen.
 */
export function pickWords(
  n: number,
  lang: WordLanguage = "en",
  exclude: Iterable<string> = [],
): string[] {
  const count = Math.max(0, Math.floor(n));
  if (count === 0) return [];
  const excluded = new Set(exclude);
  const pool = WORDS[lang].filter((word) => !excluded.has(word));
  return sampleWords(pool, count);
}

/**
 * Draws a fresh set of choices for one turn and returns the room's new
 * "already used" list. When fewer than `n` unseen words remain, the cycle
 * restarts: the leftovers are used first, then the bag is refilled. This keeps
 * the same word from coming up twice in a row while still working forever.
 */
export function pickWordChoices(
  n: number,
  lang: WordLanguage = "en",
  used: readonly string[] = [],
): WordPick {
  const count = Math.max(0, Math.floor(n));
  const all = WORDS[lang];
  if (count === 0) return { words: [], used: [...used] };

  const usedSet = new Set(used);
  const fresh = all.filter((word) => !usedSet.has(word));

  if (fresh.length >= count) {
    const words = sampleWords(fresh, count);
    return { words, used: [...new Set([...used, ...words])] };
  }

  // Finish the current cycle with the last unseen words, then refill the bag
  // with words from the previous cycle (the current picks are excluded).
  const carried = sampleWords(fresh, fresh.length);
  const recycled = sampleWords(
    all.filter((word) => !carried.includes(word)),
    count - carried.length,
  );
  const words = [...carried, ...recycled];
  return { words, used: [...new Set(recycled)] };
}

export function maskWord(word: string): string {
  return [...word]
    .map((character) => {
      if (character === " ") return " ";
      return "_";
    })
    .join("");
}

export function normalizeGuess(value: string): string {
  return foldKana(
    value
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("en"),
  );
}

function normalizeForWordMatch(value: string): string {
  return normalizeGuess(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Separator-free form used as a second pass so spellings such as "s t a r",
 * "s-t-a-r" or "s.t.a.r" cannot slip a word past the spaced comparison.
 */
function compactForWordMatch(value: string): string {
  return normalizeGuess(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Returns true when `text` contains `word` anywhere in the message.
 *
 * The comparison ignores case, Unicode compatibility differences, punctuation,
 * repeated whitespace and inserted separators, so "The answer is Daughter!",
 * "daughter-in-law", "mydaughter" and "d a u g h t e r" all count for the word
 * "daughter". Matching the raw sequence is intentional: over-hiding a harmless
 * message is preferable to leaking a word.
 */
export function containsSecretWord(text: string, word: string): boolean {
  const needle = normalizeForWordMatch(word);
  if (needle.length === 0) return false;
  if (normalizeForWordMatch(text).includes(needle)) return true;

  const compactNeedle = compactForWordMatch(word);
  return compactNeedle.length > 0 && compactForWordMatch(text).includes(compactNeedle);
}

/** The canonical word plus any accepted alternate spellings (e.g. kana readings). */
export function acceptedAnswers(word: string): string[] {
  return [word, ...(WORD_ALIASES[word] ?? [])];
}

/** True when `text` contains the word or one of its accepted spellings. */
export function matchesWord(text: string, word: string): boolean {
  return acceptedAnswers(word).some((answer) => containsSecretWord(text, answer));
}

/**
 * True when the whole message is the word or an accepted spelling. Punctuation,
 * spacing and separator differences are ignored, matching the behaviour of the
 * in-message matcher.
 */
export function isExactGuess(text: string, word: string): boolean {
  const guess = normalizeGuess(text);
  const compactGuess = compactForWordMatch(text);
  return acceptedAnswers(word).some((answer) => {
    if (normalizeGuess(answer) === guess) return true;
    return compactForWordMatch(answer) === compactGuess;
  });
}

/** Levenshtein distance, used only for the friendly "very close" hint. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const insert = current[j - 1] + 1;
      const remove = previous[j] + 1;
      const replace = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(insert, remove, replace);
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * True when a wrong guess is a near miss for the answer. Longer words get a
 * little more room, while whole sentences are never treated as close.
 */
export function isCloseGuess(text: string, word: string): boolean {
  const guess = normalizeForWordMatch(text).replace(/\s+/g, " ").trim();
  if (!guess) return false;

  return acceptedAnswers(word).some((answer) => {
    const target = normalizeForWordMatch(answer).replace(/\s+/g, " ").trim();
    if (!target) return false;
    const tolerance = target.length <= 4 ? 1 : target.length <= 8 ? 2 : 3;
    if (Math.abs(guess.length - target.length) > tolerance) return false;
    return editDistance(guess, target) <= tolerance;
  });
}

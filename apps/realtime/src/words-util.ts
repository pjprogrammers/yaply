import { WORDS } from "./words";

export type WordPick = {
  /** The words offered to the drawer, in order. */
  words: string[];
  /** The updated used-word list for the room. */
  used: string[];
};

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
  lang: string = "en",
  exclude: Iterable<string> = [],
): string[] {
  const count = Math.max(0, Math.floor(n));
  if (count === 0) return [];
  const excluded = new Set(exclude);
  const pool = (WORDS[lang] || WORDS.en).filter((word) => !excluded.has(word));
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
  lang: string = "en",
  used: readonly string[] = [],
): WordPick {
  const count = Math.max(0, Math.floor(n));
  const all = WORDS[lang] || WORDS.en;
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
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
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

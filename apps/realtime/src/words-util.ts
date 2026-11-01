import { WORDS } from "./words";

export function pickWords(n: number, lang: string = "en"): string[] {
  const pool = [...(WORDS[lang] || WORDS.en)];
  const arr: string[] = [];
  while (arr.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    arr.push(pool.splice(i, 1)[0]);
  }
  return arr;
}

export function maskWord(word: string): string {
  return [...word]
    .map((character) => {
      if (character === " ") return " ";
      return "_";
    })
    .join(" ");
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

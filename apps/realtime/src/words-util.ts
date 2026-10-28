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

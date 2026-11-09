export const NAME_MAX = 14;
export const DEFAULT_NAME = "You";

const NAME_KEY = "holeio:name";
const MUTE_KEY = "holeio:muted";

export function readName(): string {
  if (typeof window === "undefined") return DEFAULT_NAME;
  try {
    const value = window.localStorage.getItem(NAME_KEY);
    return value ? value.slice(0, NAME_MAX) : DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

export function writeName(name: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name.trim().slice(0, NAME_MAX) || DEFAULT_NAME);
  } catch {
    // private browsing
  }
}

export function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // private browsing
  }
}

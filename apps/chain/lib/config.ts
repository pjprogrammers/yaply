import { MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import {
  normalizeHttpUrl,
  requestRoomCode,
  resolveRealtimeBaseUrl,
} from "@yaply/shared/config";

/**
 * Canonical origin of this Chain Reaction deployment. `NEXT_PUBLIC_CHAIN_URL`
 * wins; Vercel's system variables provide a host when the project has not set
 * it, so metadata and Open Graph images do not fall back to localhost on a
 * deployment.
 */
export const SITE_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_CHAIN_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
  "http://localhost:3002",
);

export const MAIN_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_MAIN_URL,
  "http://localhost:3000",
);

export const REALTIME_URL = resolveRealtimeBaseUrl(
  process.env.NEXT_PUBLIC_REALTIME_URL,
  typeof window !== "undefined" ? window.location : undefined,
);

export const NICKNAME_KEY = "yaply:nickname";

/**
 * Room codes are allocated by the Worker so availability is checked and the
 * code is reserved atomically before the browser opens a WebSocket.
 */
export async function createRoomCode(): Promise<string> {
  const { code } = await requestRoomCode(REALTIME_URL, "chain");
  return code;
}

export function cleanRoomCode(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
}

export function roomPath(code: string): string {
  return `/room/${code.toLowerCase()}`;
}

export function inviteUrl(code: string): string {
  if (typeof window === "undefined") return roomPath(code);
  return `${window.location.origin}${roomPath(code)}`;
}

export function readStoredNickname(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function storeNickname(nickname: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // Storage is optional.
  }
}

/** Names entered for a shared-device pass-and-play table. */
export const PASS_PLAYER_NAMES_KEY = "yaply:chain:pass-players";

function sanitizeStoredPlayerNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((name): name is string => typeof name === "string")
    .slice(0, 8)
    .map((name) => name.trim().slice(0, MAX_NICKNAME_LENGTH));
}

export function readStoredPassPlayerNames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PASS_PLAYER_NAMES_KEY);
    if (!raw) return [];
    return sanitizeStoredPlayerNames(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function storePassPlayerNames(names: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PASS_PLAYER_NAMES_KEY,
      JSON.stringify(sanitizeStoredPlayerNames(names)),
    );
  } catch {
    // Storage is optional.
  }
}

export function numberParam(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

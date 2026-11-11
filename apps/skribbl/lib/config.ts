import {
  normalizeHttpUrl,
  requestOpenRoom,
  requestRoomCode,
  resolveRealtimeBaseUrl,
} from "@yaply/shared/config";

/**
 * Canonical origin of this Skribbl deployment. `NEXT_PUBLIC_SKRIBBL_URL` wins;
 * Vercel's system variables provide a host when the project has not set it, so
 * metadata and Open Graph images do not fall back to localhost on a deployment.
 */
export const SITE_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_SKRIBBL_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
  "http://localhost:3001",
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
  const { code } = await requestRoomCode(REALTIME_URL, "skribbl");
  return code;
}

/**
 * Matchmaking for the Play button. The Worker returns the current open public
 * room, or reserves the next one when it is full or empty.
 */
export async function findOpenRoom() {
  return requestOpenRoom(REALTIME_URL, "skribbl");
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

export function numberParam(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

import {
  normalizeHttpUrl,
  requestRoomCode,
  resolveRealtimeBaseUrl,
} from "@yaply/shared/config";

/**
 * Canonical origin of this Smash Karts deployment. `NEXT_PUBLIC_SMASHKARTS_URL`
 * wins; Vercel's system variables provide a host when the project has not set
 * it, so Open Graph images do not fall back to localhost on a deployment.
 */
export const SITE_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_SMASHKARTS_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
  "http://localhost:3003",
);

/** Main Yaply site used by the "Back to Yaply" link. */
export const MAIN_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_MAIN_URL,
  "http://localhost:3000",
);

/**
 * Shared realtime WebSocket base. The arena uses the same Worker as Skribbl
 * and Chain Reaction for online rooms; bot matches stay entirely local.
 */
export const REALTIME_URL = resolveRealtimeBaseUrl(
  process.env.NEXT_PUBLIC_REALTIME_URL,
  typeof window !== "undefined" ? window.location : undefined,
);

export const NICKNAME_KEY = "yaply:nickname";

/** Room codes are reserved atomically by the Worker before the socket opens. */
export async function createRoomCode(): Promise<string> {
  const { code } = await requestRoomCode(REALTIME_URL, "smashkarts");
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

export function numberParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

import {
  normalizeHttpUrl,
  requestRoomCode,
  resolveRealtimeBaseUrl,
} from "@yaply/shared/config";

export const SITE_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_HOLEIO_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
  "http://localhost:3004",
);

export const MAIN_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_MAIN_URL,
  "http://localhost:3000",
);

/** Shared realtime Worker. Bot matches stay entirely local. */
export const REALTIME_URL = resolveRealtimeBaseUrl(
  process.env.NEXT_PUBLIC_REALTIME_URL,
  typeof window !== "undefined" ? window.location : undefined,
);

/** A room code is reserved by the Worker before the socket opens. */
export async function createRoomCode(): Promise<string> {
  const { code } = await requestRoomCode(REALTIME_URL, "holeio");
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

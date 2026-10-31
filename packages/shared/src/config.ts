import type { GameKind } from "./types";

/**
 * Returns an absolute http(s) URL with no trailing slash, or the fallback when
 * the configured value is empty, relative, or uses another protocol.
 */
export function normalizeHttpUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

/** Converts an http(s) base to ws(s) and makes sure the /room path is present. */
export function normalizeRealtimeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "";
  }

  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:") return "";

  const path = url.pathname.replace(/\/+$/, "");
  if (!path) url.pathname = "/room";
  else if (!path.endsWith("/room")) url.pathname = `${path}/room`;

  return url.toString().replace(/\/+$/, "");
}

/**
 * Resolves the realtime URL for a browser. `NEXT_PUBLIC_REALTIME_URL` is the
 * only production source of truth; localhost gets a development fallback so
 * `wrangler dev` works without any environment file.
 */
export function resolveRealtimeBaseUrl(
  configured: string | undefined,
  location?: { hostname: string },
): string {
  const fromEnv = normalizeRealtimeBaseUrl(configured ?? "");
  if (fromEnv) return fromEnv;

  const hostname = location?.hostname ?? "";
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return `ws://${hostname === "::1" ? "[::1]" : hostname}:8787/room`;
  }

  return "";
}

export function realtimeHttpOrigin(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (url.protocol === "wss:") url.protocol = "https:";
    if (url.protocol === "ws:") url.protocol = "http:";
    return url.origin;
  } catch {
    return "";
  }
}

export type RoomCodeResponse = {
  code: string;
  game: GameKind;
};

/**
 * Asks the Worker for a fresh room code. The Worker checks the Durable Object
 * namespace for collisions before returning, so clients never invent a code
 * that already belongs to another room.
 */
export async function requestRoomCode(
  baseUrl: string,
  game: GameKind,
  fetchImpl: typeof fetch = fetch,
): Promise<RoomCodeResponse> {
  const origin = realtimeHttpOrigin(baseUrl);
  if (!origin) throw new Error("The realtime server URL is not configured.");

  const response = await fetchImpl(`${origin}/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ game }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { code?: unknown; game?: unknown; error?: unknown }
    | null;

  if (!response.ok || typeof payload?.code !== "string") {
    const message =
      typeof payload?.error === "string" ? payload.error : "Could not create a room right now.";
    throw new Error(message);
  }

  return { code: payload.code, game };
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Browser-side fallback used only if the Worker's room endpoint is unavailable. */
export function generateRoomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

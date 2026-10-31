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

/**
 * Converts an http(s) base to ws(s) and makes sure exactly one `/room` path is
 * present. Query strings and fragments are discarded because the room route is
 * built by `buildRoomUrl`; keeping them would produce malformed URLs such as
 * `/room?token=x/abc123?game=skribbl`.
 */
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

  url.search = "";
  url.hash = "";

  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = !path || path === "/room"
    ? "/room"
    : path.endsWith("/room")
      ? path
      : `${path}/room`;

  return url.toString().replace(/\/+$/, "");
}

/**
 * Builds the exact room WebSocket URL used by the browser:
 * `wss://host/room/abc123?game=skribbl`.
 */
export function buildRoomUrl(baseUrl: string, code: string, game: GameKind): string {
  const base = normalizeRealtimeBaseUrl(baseUrl);
  if (!base) return "";
  const safeCode = encodeURIComponent(code.trim().toLowerCase());
  return `${base}/${safeCode}?game=${encodeURIComponent(game)}`;
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

export type RequestRoomCodeOptions = {
  /** Total attempts, including the first one. */
  attempts?: number;
  /** Base delay between retries; the actual delay grows linearly. */
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
};

const RETRYABLE_ROOM_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

/**
 * Asks the Worker for a fresh room code. The Worker reserves the code in the
 * Durable Object namespace before returning it, so clients never invent a code
 * that already belongs to another room. Retryable failures (collisions,
 * throttling and transient 5xx responses) are retried automatically.
 */
export async function requestRoomCode(
  baseUrl: string,
  game: GameKind,
  options: RequestRoomCodeOptions | typeof fetch = {},
): Promise<RoomCodeResponse> {
  const opts: RequestRoomCodeOptions =
    typeof options === "function" ? { fetchImpl: options } : options;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleepImpl = opts.sleepImpl ?? defaultSleep;
  const attempts = Math.max(1, opts.attempts ?? 3);
  const retryDelayMs = Math.max(0, opts.retryDelayMs ?? 250);

  const origin = realtimeHttpOrigin(baseUrl);
  if (!origin) throw new Error("The realtime server URL is not configured.");

  let lastMessage = "Could not create a room right now.";
  let lastRetryable = false;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(`${origin}/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game }),
        cache: "no-store",
        credentials: "omit",
      });
    } catch {
      lastMessage = "The realtime server could not be reached.";
      lastRetryable = true;
      if (attempt + 1 < attempts) await sleepImpl(retryDelayMs * (attempt + 1));
      continue;
    }

    const payload = (await response.json().catch(() => null)) as
      | { code?: unknown; game?: unknown; error?: unknown }
      | null;

    if (response.ok && typeof payload?.code === "string") {
      if (payload.game !== undefined && payload.game !== game) {
        throw new Error("The realtime server returned a room for a different game.");
      }
      return { code: payload.code, game };
    }

    lastMessage =
      typeof payload?.error === "string" ? payload.error : "Could not create a room right now.";
    lastRetryable = RETRYABLE_ROOM_STATUS.has(response.status);
    if (!lastRetryable) break;
    if (attempt + 1 < attempts) await sleepImpl(retryDelayMs * (attempt + 1));
  }

  const error = new Error(lastMessage);
  (error as Error & { retryable?: boolean }).retryable = lastRetryable;
  throw error;
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

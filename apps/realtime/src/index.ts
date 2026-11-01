import { GameRoom } from "./Room";
import {
  PROTOCOL_VERSION,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_CODE_PATTERN,
} from "@yaply/shared/constants";
import { GameKindSchema } from "@yaply/shared/schemas";

export { GameRoom };

type Env = {
  GAME_ROOMS: DurableObjectNamespace;
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  APP_ORIGIN?: string;
};

const CREATE_ROOMS_PER_MINUTE = 30;
const WS_UPGRADES_PER_MINUTE = 60;
const MAX_RATE_BUCKETS = 5_000;
/** Room creation only needs `{"game":"skribbl"}`; reject anything larger. */
const MAX_ROOM_CREATE_BODY_BYTES = 1_024;
const createBuckets = new Map<string, { count: number; resetAt: number }>();
const upgradeBuckets = new Map<string, { count: number; resetAt: number }>();

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function isProduction(env: Env): boolean {
  return (env.ENVIRONMENT ?? "development").toLowerCase() === "production";
}

function configuredOrigins(env: Env): string[] {
  const raw = [env.ALLOWED_ORIGINS, env.APP_ORIGIN]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(",");
  return raw
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function isLocalhost(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return !isProduction(env);
  const normalized = origin.replace(/\/+$/, "");
  if (configuredOrigins(env).includes(normalized)) return true;
  return !isProduction(env) && isLocalhost(normalized);
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (!origin || !originAllowed(request, env)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

function clientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function pruneBuckets(map: Map<string, { count: number; resetAt: number }>, now: number): void {
  if (map.size <= MAX_RATE_BUCKETS) return;
  for (const [key, bucket] of map) {
    if (now >= bucket.resetAt) map.delete(key);
  }
  // A flood of unique client keys could still exceed the cap with unexpired
  // buckets, so drop the oldest entries as a last resort.
  for (const key of map.keys()) {
    if (map.size <= MAX_RATE_BUCKETS) break;
    map.delete(key);
  }
}

function takeFromBucket(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  limit: number,
): boolean {
  const now = Date.now();
  pruneBuckets(map, now);
  const bucket = map.get(key);
  if (!bucket || now >= bucket.resetAt) {
    map.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function allowRoomCreation(request: Request): boolean {
  return takeFromBucket(createBuckets, clientKey(request), CREATE_ROOMS_PER_MINUTE);
}

function allowSocketUpgrade(request: Request): boolean {
  return takeFromBucket(upgradeBuckets, clientKey(request), WS_UPGRADES_PER_MINUTE);
}

function roomKey(game: "skribbl" | "chain", code: string): string {
  return `${game}:${code}`;
}

function generateRoomCode(): string {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_ALPHABET[bytes[index] % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

async function reserveRoom(
  env: Env,
  game: "skribbl" | "chain",
  code: string,
): Promise<{ reserved: boolean; reason?: string }> {
  try {
    const stub = env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(roomKey(game, code)));
    const response = await stub.fetch("https://room.internal/internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game, code }),
    });
    const body = (await response.json().catch(() => null)) as
      | { reserved?: unknown; reason?: unknown }
      | null;
    return {
      reserved: response.ok && body?.reserved === true,
      reason: typeof body?.reason === "string" ? body.reason : undefined,
    };
  } catch {
    return { reserved: false, reason: "do_error" };
  }
}

function log(level: "info" | "warn" | "error", event: string, details: Record<string, unknown>): void {
  const line = JSON.stringify({ level, event, ...details, at: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const started = Date.now();

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === "/health") {
      return json(
        { ok: true, service: "yaply-realtime" },
        200,
        { "access-control-allow-origin": "*" },
      );
    }

    if (url.pathname === "/version") {
      return json(
        {
          ok: true,
          service: "yaply-realtime",
          protocolVersion: PROTOCOL_VERSION,
          environment: isProduction(env) ? "production" : "development",
          runtime: "cloudflare-workers",
          features: {
            serverAllocatedRooms: true,
            reservedRoomCodes: true,
            reconnectTokens: true,
            durableObjectAlarms: true,
          },
        },
        200,
        { "access-control-allow-origin": "*" },
      );
    }

    if (url.pathname === "/rooms") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405, corsHeaders(request, env));
      }
      if (!originAllowed(request, env)) {
        log("warn", "room.create.origin_rejected", { origin: request.headers.get("Origin") ?? null });
        return json({ error: "Origin is not allowed." }, 403, corsHeaders(request, env));
      }
      if (!allowRoomCreation(request)) {
        return json(
          { error: "Too many rooms created. Try again in a minute." },
          429,
          { ...corsHeaders(request, env), "retry-after": "60" },
        );
      }

      const declaredLength = Number(request.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_ROOM_CREATE_BODY_BYTES) {
        log("warn", "room.create.body_too_large", {
          bytes: declaredLength,
          origin: request.headers.get("Origin") ?? null,
        });
        return json({ error: "That request is too large." }, 413, corsHeaders(request, env));
      }

      let raw: string;
      try {
        raw = await request.text();
      } catch {
        return json({ error: "Expected a JSON body." }, 400, corsHeaders(request, env));
      }

      const bodyBytes = new TextEncoder().encode(raw).byteLength;
      if (bodyBytes > MAX_ROOM_CREATE_BODY_BYTES) {
        log("warn", "room.create.body_too_large", {
          bytes: bodyBytes,
          origin: request.headers.get("Origin") ?? null,
        });
        return json({ error: "That request is too large." }, 413, corsHeaders(request, env));
      }

      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "Expected a JSON body." }, 400, corsHeaders(request, env));
      }

      const gameResult = GameKindSchema.safeParse(
        typeof body === "object" && body !== null ? (body as { game?: unknown }).game : undefined,
      );
      if (!gameResult.success) {
        return json({ error: "Choose a valid game." }, 400, corsHeaders(request, env));
      }

      let lastReason = "collision";
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateRoomCode();
        const result = await reserveRoom(env, gameResult.data, code);
        if (result.reserved) {
          log("info", "room.code_issued", {
            game: gameResult.data,
            code: `${code.slice(0, 2)}***`,
            durationMs: Date.now() - started,
          });
          return json({ code, game: gameResult.data }, 201, corsHeaders(request, env));
        }
        lastReason = result.reason ?? "collision";
      }

      log("warn", "room.code_allocation_failed", {
        game: gameResult.data,
        reason: lastReason,
        durationMs: Date.now() - started,
      });
      return json(
        { error: "Could not allocate a room code. Try again." },
        503,
        { ...corsHeaders(request, env), "retry-after": "1" },
      );
    }

    if (url.pathname.startsWith("/room/")) {
      if (request.method !== "GET") {
        return json(
          { error: "Method not allowed." },
          405,
          { ...corsHeaders(request, env), allow: "GET" },
        );
      }

      const code = (url.pathname.split("/")[2] ?? "").toLowerCase();
      if (!ROOM_CODE_PATTERN.test(code)) {
        return json({ error: "Invalid room code." }, 400, corsHeaders(request, env));
      }

      const gameParam = url.searchParams.get("game");
      if (gameParam !== "chain" && gameParam !== "skribbl") {
        return json({ error: "A valid game is required." }, 400, corsHeaders(request, env));
      }

      if (!originAllowed(request, env)) {
        log("warn", "room.connect.origin_rejected", {
          game: gameParam,
          code: `${code.slice(0, 2)}***`,
          origin: request.headers.get("Origin") ?? null,
        });
        return json({ error: "Origin is not allowed." }, 403, corsHeaders(request, env));
      }

      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return json({ error: "Expected a WebSocket upgrade." }, 426, corsHeaders(request, env));
      }

      if (!allowSocketUpgrade(request)) {
        log("warn", "room.connect.rate_limited", {
          game: gameParam,
          code: `${code.slice(0, 2)}***`,
          origin: request.headers.get("Origin") ?? null,
        });
        return json(
          { error: "Too many connection attempts. Try again in a minute." },
          429,
          { ...corsHeaders(request, env), "retry-after": "60" },
        );
      }

      const id = env.GAME_ROOMS.idFromName(roomKey(gameParam, code));
      const stub = env.GAME_ROOMS.get(id);
      try {
        return await stub.fetch(request);
      } catch (error) {
        log("error", "room.connect.do_failed", {
          game: gameParam,
          code: `${code.slice(0, 2)}***`,
          category: error instanceof Error ? error.name : "unknown",
          durationMs: Date.now() - started,
        });
        return json({ error: "The room server is unavailable. Try again." }, 502);
      }
    }

    return json({ error: "Not found." }, 404);
  },
};

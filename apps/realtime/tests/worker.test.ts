import { describe, expect, it } from "vitest";
import worker from "../src/index";

function makeEnv(overrides: Record<string, unknown> = {}) {
  const names: string[] = [];
  const env = {
    ENVIRONMENT: "development",
    ALLOWED_ORIGINS: "http://localhost:3000",
    GAME_ROOMS: {
      idFromName: (name: string) => {
        names.push(name);
        return name;
      },
      get: () => ({
        fetch: async (url: string, init?: RequestInit) => {
          if (String(url).endsWith("/internal/reserve")) {
            const body = JSON.parse(String(init?.body ?? "{}"));
            return new Response(JSON.stringify({ reserved: true, game: body.game, code: body.code }), {
              status: 201,
              headers: { "content-type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ exists: false }), {
            headers: { "content-type": "application/json" },
          });
        },
      }),
    },
    ...overrides,
  };
  return { env: env as any, names };
}

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`https://realtime.test${path}`, init);
}

describe("Worker routing", () => {
  it("answers health checks", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(request("/health"), env);
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.ok).toBe(true);
    expect(body.service).toBe("yaply-realtime");
  });

  it("reports the protocol version", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(request("/version"), env);
    const body = (await response.json()) as any;
    expect(body.protocolVersion).toBe(1);
    expect(body.environment).toBe("development");
  });

  it("returns 404 for unknown routes", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(request("/nope"), env);
    expect(response.status).toBe(404);
  });

  it("rejects invalid room codes", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(request("/room/no?game=skribbl"), env);
    expect(response.status).toBe(400);
  });

  it("requires a game on the room route", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(request("/room/abc123"), env);
    expect(response.status).toBe(400);
  });

  it("requires a WebSocket upgrade", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/room/abc123?game=skribbl", { headers: { Origin: "http://localhost:3000" } }),
      env,
    );
    expect(response.status).toBe(426);
  });

  it("namespaces the Durable Object by game and room code", async () => {
    const { env, names } = makeEnv();
    const stub = {
      fetch: async () => new Response("upgraded"),
    };
    env.GAME_ROOMS.get = () => stub;

    await worker.fetch(
      request("/room/abc123?game=chain", {
        headers: { Upgrade: "websocket", Origin: "http://localhost:3000" },
      }),
      env,
    );
    await worker.fetch(
      request("/room/abc123?game=skribbl", {
        headers: { Upgrade: "websocket", Origin: "http://localhost:3000" },
      }),
      env,
    );

    expect(names).toEqual(["chain:abc123", "skribbl:abc123"]);
  });

  it("rejects an origin that is not allowlisted in production", async () => {
    const { env } = makeEnv({
      ENVIRONMENT: "production",
      ALLOWED_ORIGINS: "https://yaply-web.vercel.app",
    });
    const response = await worker.fetch(
      request("/room/abc123?game=skribbl", {
        headers: { Upgrade: "websocket", Origin: "https://evil.example" },
      }),
      env,
    );
    expect(response.status).toBe(403);
  });

  it("issues a room code through the HTTP endpoint", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost:3000",
          "cf-connecting-ip": "10.0.0.1",
        },
        body: JSON.stringify({ game: "chain" }),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as any;
    expect(body.game).toBe("chain");
    expect(body.code).toMatch(/^[a-z0-9]{6}$/);
  });

  it("rejects an invalid game when issuing a code", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: { "content-type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ game: "ludo" }),
      }),
      env,
    );
    expect(response.status).toBe(400);
  });

  it("rate limits room-code creation per client", async () => {
    const { env } = makeEnv();
    let last: Response | null = null;
    for (let index = 0; index < 31; index += 1) {
      last = await worker.fetch(
        request("/rooms", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Origin: "http://localhost:3000",
            "cf-connecting-ip": "10.0.0.99",
          },
          body: JSON.stringify({ game: "skribbl" }),
        }),
        env,
      );
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBe("60");
  });

  it("rejects a malformed JSON body when issuing a code", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost:3000",
          "cf-connecting-ip": "10.0.0.40",
        },
        body: "{not json",
      }),
      env,
    );
    expect(response.status).toBe(400);
    expect(((await response.json()) as any).error).toBe("Expected a JSON body.");
  });

  it("rejects room creation from an unknown origin in production", async () => {
    const { env } = makeEnv({
      ENVIRONMENT: "production",
      ALLOWED_ORIGINS: "https://yaply-web.vercel.app",
    });
    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "https://evil.example",
          "cf-connecting-ip": "10.0.0.41",
        },
        body: JSON.stringify({ game: "chain" }),
      }),
      env,
    );
    expect(response.status).toBe(403);
  });

  it("rejects a missing Origin in production (fail closed)", async () => {
    const { env } = makeEnv({
      ENVIRONMENT: "production",
      ALLOWED_ORIGINS: "https://yaply-web.vercel.app",
    });
    const create = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "10.0.0.42",
        },
        body: JSON.stringify({ game: "chain" }),
      }),
      env,
    );
    expect(create.status).toBe(403);

    const upgrade = await worker.fetch(
      request("/room/abc123?game=chain", { headers: { Upgrade: "websocket" } }),
      env,
    );
    expect(upgrade.status).toBe(403);
  });

  it("answers CORS preflight only for allowed origins", async () => {
    const { env } = makeEnv();
    const allowed = await worker.fetch(
      request("/rooms", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000" },
      }),
      env,
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");

    const blocked = await worker.fetch(
      request("/rooms", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example" },
      }),
      env,
    );
    expect(blocked.status).toBe(204);
    expect(blocked.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("reserves the generated code in the game-namespaced Durable Object", async () => {
    const { env, names } = makeEnv();
    const bodies: any[] = [];
    env.GAME_ROOMS.get = () => ({
      fetch: async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(JSON.stringify({ reserved: true }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost:3000",
          "cf-connecting-ip": "10.0.0.43",
        },
        body: JSON.stringify({ game: "chain" }),
      }),
      env,
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as any;
    expect(names).toEqual([`chain:${body.code}`]);
    expect(bodies).toEqual([{ game: "chain", code: body.code }]);
  });

  it("retries another code when the first reservation collides", async () => {
    const { env } = makeEnv();
    const attempted: string[] = [];
    let calls = 0;
    env.GAME_ROOMS.get = () => ({
      fetch: async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        attempted.push(body.code);
        calls += 1;
        const reserved = calls > 2;
        return new Response(JSON.stringify({ reserved, reason: reserved ? undefined : "reserved" }), {
          status: reserved ? 201 : 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost:3000",
          "cf-connecting-ip": "10.0.0.44",
        },
        body: JSON.stringify({ game: "skribbl" }),
      }),
      env,
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as any;
    expect(attempted).toHaveLength(3);
    expect(new Set(attempted).size).toBe(3);
    expect(body.code).toBe(attempted[2]);
  });

  it("returns 503 when every reservation attempt collides", async () => {
    const { env } = makeEnv();
    env.GAME_ROOMS.get = () => ({
      fetch: async () =>
        new Response(JSON.stringify({ reserved: false, reason: "reserved" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost:3000",
          "cf-connecting-ip": "10.0.0.45",
        },
        body: JSON.stringify({ game: "chain" }),
      }),
      env,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("1");
  });

  it("rate limits WebSocket upgrades per client", async () => {
    const { env } = makeEnv();
    env.GAME_ROOMS.get = () => ({
      fetch: async () => new Response("upgraded"),
    });

    let last: Response | null = null;
    for (let index = 0; index < 61; index += 1) {
      last = await worker.fetch(
        request("/room/abc123?game=chain", {
          headers: {
            Upgrade: "websocket",
            Origin: "http://localhost:3000",
            "cf-connecting-ip": "10.0.0.46",
          },
        }),
        env,
      );
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBe("60");
  });
});

describe("Worker hardening", () => {
  it("rejects an oversized room-creation body", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost:3000",
          "cf-connecting-ip": "10.1.0.1",
        },
        body: "x".repeat(2_000),
      }),
      env,
    );
    expect(response.status).toBe(413);
    expect(((await response.json()) as any).error).toBe("That request is too large.");
  });

  it("rejects non-GET requests on the room route", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/room/abc123?game=skribbl", {
        method: "POST",
        headers: { Origin: "http://localhost:3000" },
      }),
      env,
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });

  it("returns a generic 502 when the Durable Object throws", async () => {
    const { env } = makeEnv();
    env.GAME_ROOMS.get = () => ({
      fetch: async () => {
        throw new Error("internal sqlite failure at secret path");
      },
    });

    const response = await worker.fetch(
      request("/room/abc123?game=chain", {
        headers: {
          Upgrade: "websocket",
          Origin: "http://localhost:3000",
          "cf-connecting-ip": "10.1.0.2",
        },
      }),
      env,
    );

    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).toContain("The room server is unavailable");
    expect(text).not.toContain("sqlite");
    expect(text).not.toContain("secret");
  });

  it("returns 503 when room reservation throws in the Durable Object", async () => {
    const { env } = makeEnv();
    env.GAME_ROOMS.get = () => ({
      fetch: async () => {
        throw new Error("boom");
      },
    });

    const response = await worker.fetch(
      request("/rooms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost:3000",
          "cf-connecting-ip": "10.1.0.3",
        },
        body: JSON.stringify({ game: "chain" }),
      }),
      env,
    );
    expect(response.status).toBe(503);
  });

  it("never allocates the same code to concurrent create requests", async () => {
    const { env } = makeEnv();
    const reserved = new Set<string>();
    env.GAME_ROOMS.get = () => ({
      fetch: async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        if (reserved.has(body.code)) {
          return new Response(JSON.stringify({ reserved: false, reason: "reserved" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        reserved.add(body.code);
        return new Response(JSON.stringify({ reserved: true }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        worker.fetch(
          request("/rooms", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Origin: "http://localhost:3000",
              "cf-connecting-ip": `10.1.1.${index}`,
            },
            body: JSON.stringify({ game: index % 2 === 0 ? "chain" : "skribbl" }),
          }),
          env,
        ),
      ),
    );

    const codes: string[] = [];
    for (const response of responses) {
      expect(response.status).toBe(201);
      codes.push(((await response.json()) as any).code);
    }
    expect(new Set(codes).size).toBe(codes.length);
    expect(reserved.size).toBe(codes.length);
  });

  it("reports deployment features without leaking configuration", async () => {
    const { env } = makeEnv({ ENVIRONMENT: "production" });
    const response = await worker.fetch(request("/version"), env);
    const body = (await response.json()) as any;

    expect(body.runtime).toBe("cloudflare-workers");
    expect(body.features.serverAllocatedRooms).toBe(true);
    expect(body.features.reservedRoomCodes).toBe(true);
    expect(body.features.reconnectTokens).toBe(true);
    expect(JSON.stringify(body)).not.toContain("ALLOWED_ORIGINS");
    expect(JSON.stringify(body)).not.toContain("GAME_ROOMS");
  });
});

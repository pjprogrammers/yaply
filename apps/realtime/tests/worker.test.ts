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
        fetch: async () =>
          new Response(JSON.stringify({ exists: false }), {
            headers: { "content-type": "application/json" },
          }),
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
  });
});

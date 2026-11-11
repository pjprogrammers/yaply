import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildRoomUrl,
  normalizeHttpUrl,
  normalizeRealtimeBaseUrl,
  realtimeHttpOrigin,
  requestOpenRoom,
  requestRoomCode,
  resolveRealtimeBaseUrl,
} from "@yaply/shared/config";

describe("normalizeRealtimeBaseUrl", () => {
  it("converts https to wss and appends the room path", () => {
    expect(normalizeRealtimeBaseUrl("https://rt.example.com")).toBe("wss://rt.example.com/room");
  });

  it("keeps an existing room path without duplicating it", () => {
    expect(normalizeRealtimeBaseUrl("https://rt.example.com/room")).toBe(
      "wss://rt.example.com/room",
    );
    expect(normalizeRealtimeBaseUrl("wss://rt.example.com/room/")).toBe(
      "wss://rt.example.com/room",
    );
  });

  it("strips query strings and fragments so they cannot corrupt room URLs", () => {
    expect(normalizeRealtimeBaseUrl("https://rt.example.com/room?token=x#frag")).toBe(
      "wss://rt.example.com/room",
    );
    expect(normalizeRealtimeBaseUrl("https://rt.example.com/base?x=1")).toBe(
      "wss://rt.example.com/base/room",
    );
  });

  it("rejects unsupported protocols and malformed values", () => {
    expect(normalizeRealtimeBaseUrl("ftp://rt.example.com")).toBe("");
    expect(normalizeRealtimeBaseUrl("not a url")).toBe("");
    expect(normalizeRealtimeBaseUrl("   ")).toBe("");
  });

  it("preserves ws and wss input", () => {
    expect(normalizeRealtimeBaseUrl("ws://localhost:8787")).toBe("ws://localhost:8787/room");
    expect(normalizeRealtimeBaseUrl("wss://rt.example.com/room")).toBe(
      "wss://rt.example.com/room",
    );
  });
});

describe("buildRoomUrl", () => {
  it("builds the exact room URL with the game query", () => {
    expect(buildRoomUrl("https://rt.example.com/room", "ABC123", "skribbl")).toBe(
      "wss://rt.example.com/room/abc123?game=skribbl",
    );
    expect(buildRoomUrl("wss://rt.example.com/room/", "xyz789", "chain")).toBe(
      "wss://rt.example.com/room/xyz789?game=chain",
    );
  });

  it("normalises the base before appending the code", () => {
    expect(buildRoomUrl("https://rt.example.com?debug=1", "abc123", "chain")).toBe(
      "wss://rt.example.com/room/abc123?game=chain",
    );
  });

  it("returns an empty string when the base URL is unusable", () => {
    expect(buildRoomUrl("", "abc123", "chain")).toBe("");
    expect(buildRoomUrl("ftp://rt.example.com", "abc123", "chain")).toBe("");
  });
});

describe("resolveRealtimeBaseUrl", () => {
  it("prefers the configured value", () => {
    expect(resolveRealtimeBaseUrl("https://rt.example.com/room")).toBe(
      "wss://rt.example.com/room",
    );
  });

  it("falls back to localhost only on loopback hostnames", () => {
    expect(resolveRealtimeBaseUrl("", { hostname: "localhost" })).toBe(
      "ws://localhost:8787/room",
    );
    expect(resolveRealtimeBaseUrl("", { hostname: "127.0.0.1" })).toBe(
      "ws://127.0.0.1:8787/room",
    );
    expect(resolveRealtimeBaseUrl("", { hostname: "game.example.com" })).toBe("");
    expect(resolveRealtimeBaseUrl(undefined)).toBe("");
  });
});

describe("realtimeHttpOrigin", () => {
  it("maps ws and wss to http and https origins", () => {
    expect(realtimeHttpOrigin("wss://rt.example.com/room")).toBe("https://rt.example.com");
    expect(realtimeHttpOrigin("ws://localhost:8787/room")).toBe("http://localhost:8787");
  });

  it("returns an empty string for malformed input", () => {
    expect(realtimeHttpOrigin("")).toBe("");
    expect(realtimeHttpOrigin("nope")).toBe("");
  });
});

describe("normalizeHttpUrl", () => {
  it("strips trailing slashes and rejects unsafe protocols", () => {
    expect(normalizeHttpUrl("https://main.example.com/", "https://fallback")).toBe(
      "https://main.example.com",
    );
    expect(normalizeHttpUrl("javascript:alert(1)", "https://fallback")).toBe(
      "https://fallback",
    );
    expect(normalizeHttpUrl("", "https://fallback")).toBe("https://fallback");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("requestRoomCode", () => {
  it("returns the reserved code from the Worker", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ code: "abc123", game: "chain" }, 201));

    await expect(
      requestRoomCode("wss://rt.example.com/room", "chain", { fetchImpl: fetchMock }),
    ).resolves.toEqual({ code: "abc123", game: "chain" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://rt.example.com/rooms");
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      credentials: "omit",
    });
  });

  it("retries transient 5xx responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(jsonResponse({ code: "abc123", game: "chain" }, 201));
    const sleepImpl = vi.fn(async () => {});

    await expect(
      requestRoomCode("https://rt.example.com", "chain", {
        fetchImpl: fetchMock,
        sleepImpl,
        retryDelayMs: 1,
      }),
    ).resolves.toEqual({ code: "abc123", game: "chain" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it("retries network failures", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(jsonResponse({ code: "abc123", game: "chain" }, 201));

    await expect(
      requestRoomCode("https://rt.example.com", "chain", {
        fetchImpl: fetchMock,
        sleepImpl: async () => {},
      }),
    ).resolves.toEqual({ code: "abc123", game: "chain" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable client errors", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: "Room creation is disabled." }, 403),
    );

    await expect(
      requestRoomCode("https://rt.example.com", "chain", {
        fetchImpl: fetchMock,
        sleepImpl: async () => {},
      }),
    ).rejects.toThrow("Room creation is disabled.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("marks retryable failures with metadata", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: "busy" }, 503));

    await expect(
      requestRoomCode("https://rt.example.com", "chain", {
        fetchImpl: fetchMock,
        sleepImpl: async () => {},
        attempts: 2,
      }),
    ).rejects.toMatchObject({ message: "busy", retryable: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a response without a code", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ game: "chain" }, 201));

    await expect(
      requestRoomCode("https://rt.example.com", "chain", {
        fetchImpl: fetchMock,
        sleepImpl: async () => {},
        attempts: 1,
      }),
    ).rejects.toThrow("Could not create a room right now.");
  });

  it("rejects a code issued for a different game", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ code: "abc123", game: "skribbl" }, 201));

    await expect(
      requestRoomCode("https://rt.example.com", "chain", { fetchImpl: fetchMock }),
    ).rejects.toThrow("different game");
  });

  it("fails fast when the realtime URL is missing", async () => {
    const fetchMock = vi.fn();
    await expect(
      requestRoomCode("", "chain", { fetchImpl: fetchMock }),
    ).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("requestOpenRoom", () => {
  it("returns the current public room from matchmaking", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ code: "open01", game: "skribbl", host: false, created: false }, 200),
    );

    await expect(
      requestOpenRoom("wss://rt.example.com/room", "skribbl", { fetchImpl: fetchMock }),
    ).resolves.toEqual({
      code: "open01",
      game: "skribbl",
      host: false,
      created: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://rt.example.com/matchmake");
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      credentials: "omit",
    });
    expect(JSON.parse(String(init.body))).toEqual({ game: "skribbl" });
  });

  it("marks the first arrival as the room creator", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ code: "open02", game: "skribbl", host: true, created: true }, 201),
    );

    await expect(
      requestOpenRoom("https://rt.example.com", "skribbl", { fetchImpl: fetchMock }),
    ).resolves.toMatchObject({ host: true, created: true });
  });

  it("retries transient failures before giving up", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(
        jsonResponse({ code: "open03", game: "skribbl", host: false, created: false }, 200),
      );
    const sleepImpl = vi.fn(async () => {});

    await expect(
      requestOpenRoom("https://rt.example.com", "skribbl", {
        fetchImpl: fetchMock,
        sleepImpl,
        retryDelayMs: 1,
      }),
    ).resolves.toMatchObject({ code: "open03" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-retryable matchmaking error", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: "Origin is not allowed." }, 403));

    await expect(
      requestOpenRoom("https://rt.example.com", "skribbl", {
        fetchImpl: fetchMock,
        sleepImpl: async () => {},
      }),
    ).rejects.toThrow("Origin is not allowed.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a room issued for a different game", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ code: "open04", game: "chain", host: false, created: false }, 200),
    );

    await expect(
      requestOpenRoom("https://rt.example.com", "skribbl", {
        fetchImpl: fetchMock,
        sleepImpl: async () => {},
        attempts: 1,
      }),
    ).rejects.toThrow("Could not find a room right now.");
  });

  it("fails fast when the realtime URL is missing", async () => {
    const fetchMock = vi.fn();
    await expect(
      requestOpenRoom("", "skribbl", { fetchImpl: fetchMock }),
    ).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Worker production configuration", () => {
  const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  const productionBlock = toml.slice(toml.indexOf("[env.production.vars]"));
  const allowedOrigins =
    /ALLOWED_ORIGINS\s*=\s*"([^"]*)"/.exec(productionBlock)?.[1]
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  it("allows every deployed frontend origin", () => {
    // Keep this list in sync with the current Vercel project domains.
    expect(allowedOrigins).toEqual([
      "https://yaplygames.vercel.app",
      "https://skribbl.yaplygames.vercel.app",
      "https://chain.yaplygames.vercel.app",
      "https://holeio.yaplygames.vercel.app",
      "https://smashkarts.yaplygames.vercel.app",
      "https://spy.yaplygames.vercel.app",
      "https://yaply-skribbl.vercel.app",
      "https://yaply-chain.vercel.app",
      "https://yaply-smashkarts.vercel.app",
      "https://yaply-holeio.vercel.app",
      "https://yaply-whos-the-spy.vercel.app",
    ]);
  });

  it("does not allow localhost origins in production", () => {
    expect(allowedOrigins.every((origin) => !origin.includes("localhost"))).toBe(true);
  });

  it("binds the GameRoom Durable Object for production", () => {
    expect(productionBlock).toContain('name = "GAME_ROOMS"');
    expect(productionBlock).toContain('new_sqlite_classes = ["GameRoom"]');
  });

  it("binds the Play room directory for production", () => {
    expect(productionBlock).toContain('name = "ROOM_DIRECTORY"');
    expect(productionBlock).toContain('new_sqlite_classes = ["RoomDirectory"]');
  });
});

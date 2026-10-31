import { describe, expect, it, vi } from "vitest";
import {
  buildRoomUrl,
  normalizeHttpUrl,
  normalizeRealtimeBaseUrl,
  realtimeHttpOrigin,
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
    expect(resolveRealtimeBaseUrl("", { hostname: "yaply-skribbl.vercel.app" })).toBe("");
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

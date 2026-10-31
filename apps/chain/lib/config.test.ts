import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanRoomCode,
  createRoomCode,
  inviteUrl,
  numberParam,
  readStoredNickname,
  roomPath,
  storeNickname,
} from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("chain room config", () => {
  it("asks the Worker for a reserved chain room code", async () => {
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "https://rt.example.com/room");
    vi.resetModules();

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ code: "xyz789", game: "chain" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const config = await import("./config");
    await expect(config.createRoomCode()).resolves.toBe("xyz789");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://rt.example.com/rooms");
    expect(JSON.parse(String(init.body))).toEqual({ game: "chain" });
  });

  it("rejects a room issued for the wrong game", async () => {
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "https://rt.example.com/room");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ code: "xyz789", game: "skribbl" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const config = await import("./config");
    await expect(config.createRoomCode()).rejects.toThrow("different game");
  });

  it("normalises user-entered room codes", () => {
    expect(cleanRoomCode(" AB-C 12! ")).toBe("abc12");
    expect(cleanRoomCode("ABCDEFGHIJ")).toBe("abcdef");
    expect(cleanRoomCode("")).toBe("");
  });

  it("builds lower-case room paths", () => {
    expect(roomPath("ABC123")).toBe("/room/abc123");
  });

  it("returns a relative invite path during server rendering", () => {
    expect(inviteUrl("ABC123")).toBe("/room/abc123");
  });

  it("clamps numeric query parameters", () => {
    expect(numberParam("6", 4, 2, 8)).toBe(6);
    expect(numberParam("99", 4, 2, 8)).toBe(8);
    expect(numberParam("0", 4, 2, 8)).toBe(2);
    expect(numberParam("4.6", 4, 2, 8)).toBe(5);
    expect(numberParam("nope", 4, 2, 8)).toBe(4);
    expect(numberParam("", 4, 2, 8)).toBe(4);
    expect(numberParam(null, 4, 2, 8)).toBe(4);
  });

  it("treats storage as optional outside the browser", () => {
    expect(readStoredNickname()).toBe("");
    expect(() => storeNickname("Alice")).not.toThrow();
  });

  it("uses NEXT_PUBLIC_REALTIME_URL and NEXT_PUBLIC_MAIN_URL when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "https://rt.example.com/room/");
    vi.stubEnv("NEXT_PUBLIC_MAIN_URL", "https://main.example.com/");
    vi.resetModules();

    const config = await import("./config");

    expect(config.REALTIME_URL).toBe("wss://rt.example.com/room");
    expect(config.MAIN_URL).toBe("https://main.example.com");
  });

  it("does not invent a localhost realtime URL on a deployed origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "");
    vi.resetModules();

    const config = await import("./config");

    expect(config.REALTIME_URL).toBe("");
  });
});

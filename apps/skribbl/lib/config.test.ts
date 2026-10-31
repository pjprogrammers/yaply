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

describe("skribbl room config", () => {
  it("asks the Worker for a reserved skribbl room code", async () => {
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "https://rt.example.com/room");
    vi.resetModules();

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ code: "abc123", game: "skribbl" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const config = await import("./config");
    await expect(config.createRoomCode()).resolves.toBe("abc123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://rt.example.com/rooms");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ game: "skribbl" });
  });

  it("surfaces a Worker failure instead of inventing a code", async () => {
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "https://rt.example.com/room");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Room creation is disabled." }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const config = await import("./config");
    await expect(config.createRoomCode()).rejects.toThrow("Room creation is disabled.");
  });

  it("normalises user-entered room codes", () => {
    expect(cleanRoomCode(" AB-C 12! ")).toBe("abc12");
    expect(cleanRoomCode("ABCDEFGHIJ")).toBe("abcdef");
  });

  it("builds lower-case room paths and relative invites during SSR", () => {
    expect(roomPath("ABC123")).toBe("/room/abc123");
    expect(inviteUrl("ABC123")).toBe("/room/abc123");
  });

  it("uses the default for missing or blank numeric parameters", () => {
    expect(numberParam(null, 6, 2, 12)).toBe(6);
    expect(numberParam("", 6, 2, 12)).toBe(6);
    expect(numberParam("nope", 6, 2, 12)).toBe(6);
  });

  it("clamps and rounds numeric parameters", () => {
    expect(numberParam("8", 6, 2, 12)).toBe(8);
    expect(numberParam("99", 6, 2, 12)).toBe(12);
    expect(numberParam("0", 6, 2, 12)).toBe(2);
    expect(numberParam("4.6", 6, 2, 12)).toBe(5);
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

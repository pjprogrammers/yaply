import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanRoomCode,
  inviteUrl,
  makeRoomCode,
  numberParam,
  readStoredNickname,
  roomPath,
  storeNickname,
} from "./config";

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("skribbl room config", () => {
  it("generates six-character codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = makeRoomCode();
      expect(code).toHaveLength(6);
      for (const character of code) {
        expect(CODE_ALPHABET).toContain(character);
      }
    }
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
});

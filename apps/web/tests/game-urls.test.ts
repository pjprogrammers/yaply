import { afterEach, describe, expect, it, vi } from "vitest";

async function loadGameUrls() {
  vi.resetModules();
  return import("../lib/game-urls");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("game URL environment variables", () => {
  it("requires the game URL env values", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SKRIBBL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SMASHKARTS_URL", "");
    vi.stubEnv("NEXT_PUBLIC_HOLEIO_URL", "");

    await expect(loadGameUrls()).rejects.toThrow("NEXT_PUBLIC_CHAIN_URL");
  });

  it("uses the game URL env values when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN_URL", "https://chain.example.com");
    vi.stubEnv("NEXT_PUBLIC_SKRIBBL_URL", "https://draw.example.com/");
    vi.stubEnv("NEXT_PUBLIC_SMASHKARTS_URL", "https://karts.example.com/");
    vi.stubEnv("NEXT_PUBLIC_HOLEIO_URL", "https://hole.example.com/");

    const {
      CHAIN_REACTION_URL,
      SKRIBBL_URL,
      SMASHKARTS_URL,
      HOLEIO_URL,
      GAME_URL_SOURCES,
    } = await loadGameUrls();

    expect(CHAIN_REACTION_URL).toBe("https://chain.example.com");
    expect(SKRIBBL_URL).toBe("https://draw.example.com");
    expect(SMASHKARTS_URL).toBe("https://karts.example.com");
    expect(HOLEIO_URL).toBe("https://hole.example.com");
    expect(GAME_URL_SOURCES).toEqual({
      chain: "env",
      skribbl: "env",
      smashkarts: "env",
      holeio: "env",
    });
  });

  it("rejects a malformed env value instead of rendering a relative link", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN_URL", "https://chain.example.com");
    vi.stubEnv("NEXT_PUBLIC_SKRIBBL_URL", "skribbl.example.com");
    vi.stubEnv("NEXT_PUBLIC_SMASHKARTS_URL", "https://karts.example.com");
    vi.stubEnv("NEXT_PUBLIC_HOLEIO_URL", "https://hole.example.com");

    await expect(loadGameUrls()).rejects.toThrow("NEXT_PUBLIC_SKRIBBL_URL");
  });
});

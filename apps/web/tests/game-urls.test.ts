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
  it("falls back to the Vercel deployments when no env is set", async () => {
    const { CHAIN_REACTION_URL, SKRIBBL_URL, GAME_URL_SOURCES } =
      await loadGameUrls();

    expect(CHAIN_REACTION_URL).toBe("https://yaply-chain.vercel.app");
    expect(SKRIBBL_URL).toBe("https://yaply-skribbl.vercel.app");
    expect(GAME_URL_SOURCES).toEqual({ chain: "default", skribbl: "default" });
  });

  it("uses NEXT_PUBLIC_CHAIN_URL and NEXT_PUBLIC_SKRIBBL_URL when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN_URL", "https://chain.example.com");
    vi.stubEnv("NEXT_PUBLIC_SKRIBBL_URL", "https://draw.example.com/");

    const { CHAIN_REACTION_URL, SKRIBBL_URL, GAME_URL_SOURCES } =
      await loadGameUrls();

    expect(CHAIN_REACTION_URL).toBe("https://chain.example.com");
    expect(SKRIBBL_URL).toBe("https://draw.example.com");
    expect(GAME_URL_SOURCES).toEqual({ chain: "env", skribbl: "env" });
  });

  it("rejects a malformed env value instead of rendering a relative link", async () => {
    vi.stubEnv("NEXT_PUBLIC_SKRIBBL_URL", "skribbl.yaply.eu.org");

    const { SKRIBBL_URL } = await loadGameUrls();

    expect(SKRIBBL_URL).toBe("https://yaply-skribbl.vercel.app");
  });
});

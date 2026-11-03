import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfig() {
  vi.resetModules();
  return import("./config");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("kart riot config", () => {
  it("falls back to local development defaults when env is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SMASHKARTS_URL", "");
    vi.stubEnv("NEXT_PUBLIC_MAIN_URL", "");
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "");

    const { SITE_URL, MAIN_URL, REALTIME_URL } = await loadConfig();

    expect(SITE_URL).toBe("http://localhost:3003");
    expect(MAIN_URL).toBe("http://localhost:3000");
    expect(REALTIME_URL).toBe("");
  });

  it("normalises deployment URLs from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_SMASHKARTS_URL", "https://karts.example.com/");
    vi.stubEnv("NEXT_PUBLIC_MAIN_URL", "https://main.example.com/");
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "https://rt.example.com/room/");

    const { SITE_URL, MAIN_URL, REALTIME_URL } = await loadConfig();

    expect(SITE_URL).toBe("https://karts.example.com");
    expect(MAIN_URL).toBe("https://main.example.com");
    expect(REALTIME_URL).toBe("wss://rt.example.com/room");
  });

  it("uses the Vercel host when NEXT_PUBLIC_SMASHKARTS_URL is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SMASHKARTS_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "karts.example.com");
    vi.stubEnv("NEXT_PUBLIC_MAIN_URL", "");
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "");

    const { SITE_URL } = await loadConfig();

    expect(SITE_URL).toBe("https://karts.example.com");
  });

  it("rejects malformed values instead of returning relative links", async () => {
    vi.stubEnv("NEXT_PUBLIC_SMASHKARTS_URL", "not a url");
    vi.stubEnv("NEXT_PUBLIC_MAIN_URL", "main.example.com");
    vi.stubEnv("NEXT_PUBLIC_REALTIME_URL", "ftp://rt.example.com");

    const { SITE_URL, MAIN_URL, REALTIME_URL } = await loadConfig();

    expect(SITE_URL).toBe("http://localhost:3003");
    expect(MAIN_URL).toBe("http://localhost:3000");
    expect(REALTIME_URL).toBe("");
  });
});

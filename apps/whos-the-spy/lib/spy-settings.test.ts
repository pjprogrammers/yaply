import { describe, expect, it } from "vitest";
import {
  defaultLocalConfig,
  localConfigToPatch,
  localConfigToSettings,
  normalizeLocalConfig,
  settingsToLocalConfig,
} from "./spy-settings";

describe("local spy settings", () => {
  it("falls back to defaults for missing or malformed values", () => {
    const config = normalizeLocalConfig(null);
    expect(config).toEqual(defaultLocalConfig());
    expect(normalizeLocalConfig("nope").categories).toEqual(["mixed"]);
  });

  it("clamps timers and spy counts into supported ranges", () => {
    const config = normalizeLocalConfig({
      spyCount: 99,
      clueSeconds: 1,
      discussionSeconds: 9999,
      votingSeconds: 900,
    });

    expect(config.spyCount).toBe(3);
    expect(config.clueSeconds).toBe(30);
    expect(config.discussionSeconds).toBe(120);
    expect(config.votingSeconds).toBe(45);
  });

  it("drops unknown categories and collapses mixed selections", () => {
    expect(
      normalizeLocalConfig({ categories: ["food-drinks", "not-a-category"] }).categories,
    ).toEqual(["food-drinks"]);

    expect(
      normalizeLocalConfig({ categories: ["food-drinks", "mixed"] }).categories,
    ).toEqual(["mixed"]);

    expect(normalizeLocalConfig({ categories: [] }).categories).toEqual(["mixed"]);
  });

  it("ignores invalid enums and keeps valid booleans", () => {
    const config = normalizeLocalConfig({
      difficulty: "impossible",
      clueFormat: "telepathy",
      finalGuess: false,
      spectatorChat: true,
    });

    expect(config.difficulty).toBe("normal");
    expect(config.clueFormat).toBe("both");
    expect(config.finalGuess).toBe(false);
    expect(config.spectatorChat).toBe(true);
  });

  it("projects local config onto room settings and back", () => {
    const local = normalizeLocalConfig({
      nickname: "  Alice  ",
      categories: ["music"],
      difficulty: "hard",
      spyCount: 2,
      clueSeconds: 40,
      discussionSeconds: 120,
      votingSeconds: 45,
      finalGuess: false,
      roleReveal: false,
      textChat: false,
      voiceChat: false,
      spectatorChat: true,
      clueFormat: "text",
    });

    expect(local.nickname).toBe("Alice");

    const settings = localConfigToSettings(local);
    expect(settings.maxPlayers).toBe(12);
    expect(settings.spyCount).toBe(2);
    expect(settings.spyCategories).toEqual(["music"]);
    expect(settings.spyDifficulty).toBe("hard");
    expect(settings.spyFinalGuess).toBe(false);
    expect(settings.spySpectatorChat).toBe(true);

    const roundTrip = settingsToLocalConfig(settings, "Alice");
    expect(roundTrip).toEqual(local);

    expect(localConfigToPatch(local)).toMatchObject({
      spyCount: 2,
      spyCategories: ["music"],
      spyClueFormat: "text",
    });
  });
});

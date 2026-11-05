import { describe, expect, it } from "vitest";
import { isNewerInputSequence, STICK_SETTINGS } from "./input";

describe("multiplayer input sequencing", () => {
  it("accepts the first packet from a guest", () => {
    expect(isNewerInputSequence(undefined, 1)).toBe(true);
    expect(isNewerInputSequence(undefined, undefined)).toBe(true);
  });

  it("rejects stale and duplicate packets", () => {
    expect(isNewerInputSequence(12, 12)).toBe(false);
    expect(isNewerInputSequence(12, 11)).toBe(false);
    expect(isNewerInputSequence(12, 13)).toBe(true);
  });

  it("keeps the documented touch tuning", () => {
    expect(STICK_SETTINGS.deadzone).toBe(0.1);
    expect(STICK_SETTINGS.gamma).toBe(1.2);
    expect(STICK_SETTINGS.maxTravel).toBe(0.62);
  });
});

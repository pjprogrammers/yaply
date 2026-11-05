import { describe, expect, it } from "vitest";
import {
  applyDeadzone,
  applyResponse,
  movementFromAxes,
  movementFromStick,
  STICK_DEADZONE,
  STICK_GAMMA,
} from "./joystick";

describe("joystick math", () => {
  it("returns zero inside the deadzone", () => {
    expect(applyDeadzone(0, 0)).toEqual({ x: 0, y: 0, magnitude: 0 });
    expect(applyDeadzone(0.05, -0.04).magnitude).toBe(0);
    expect(movementFromStick(5, -4, 100).steer).toBe(0);
    expect(movementFromStick(5, -4, 100).throttle).toBe(0);
  });

  it("maps full up to forward throttle and full down to reverse", () => {
    const up = movementFromStick(0, -100, 100);
    expect(up.steer).toBeCloseTo(0);
    expect(up.throttle).toBeCloseTo(1);

    const down = movementFromStick(0, 100, 100);
    expect(down.throttle).toBeCloseTo(-1);
  });

  it("maps left and right to the correct screen-space steering sign", () => {
    expect(movementFromStick(-100, 0, 100).steer).toBeCloseTo(-1);
    expect(movementFromStick(100, 0, 100).steer).toBeCloseTo(1);
  });

  it("keeps diagonal input inside the unit circle after the response curve", () => {
    const diagonal = movementFromStick(100, -100, 100);
    const magnitude = Math.hypot(diagonal.steer, diagonal.throttle);
    expect(magnitude).toBeLessThanOrEqual(1);
    expect(magnitude).toBeGreaterThan(0.8);
    expect(diagonal.steer).toBeGreaterThan(0);
    expect(diagonal.throttle).toBeGreaterThan(0);
  });

  it("keeps the sensitivity curve symmetric and monotonic", () => {
    expect(applyResponse(0)).toBe(0);
    expect(applyResponse(-0.5)).toBeCloseTo(-applyResponse(0.5));
    expect(applyResponse(0.5)).toBeLessThan(0.5);
    expect(applyResponse(1)).toBe(1);
    expect(STICK_GAMMA).toBeGreaterThan(1);
  });

  it("re-normalizes the edge of the deadzone to zero", () => {
    const edge = applyDeadzone(STICK_DEADZONE, 0);
    expect(edge.magnitude).toBeCloseTo(0);

    const justOutside = applyDeadzone(STICK_DEADZONE + 0.05, 0);
    expect(justOutside.magnitude).toBeGreaterThan(0);
    expect(justOutside.magnitude).toBeLessThan(0.1);
  });

  it("applies the same pipeline to gamepad axes", () => {
    expect(movementFromAxes(0, 0)).toEqual({ steer: 0, throttle: 0 });
    const forward = movementFromAxes(0, -1);
    expect(forward.throttle).toBeCloseTo(1);
    expect(forward.steer).toBeCloseTo(0);
  });

  it("does not divide by zero when a stick reports a zero radius", () => {
    expect(movementFromStick(0, 0, 0)).toEqual({ steer: 0, throttle: 0 });
  });
});

/**
 * Joystick math shared by the touch controls and the gamepad sampler.
 *
 * Screen coordinates put +Y downward, so callers that want a throttle should
 * use `movementFromStick`, which flips the sign exactly once.
 */

export const STICK_DEADZONE = 0.1;
export const STICK_GAMMA = 1.2;

export interface StickOutput {
  /** Normalized horizontal input, +1 is right. */
  x: number;
  /** Normalized vertical input, +1 is down (screen space). */
  y: number;
  /** Post-deadzone magnitude in the 0..1 range. */
  magnitude: number;
}

export interface MovementOutput {
  /** +1 is right. */
  steer: number;
  /** +1 is forward. */
  throttle: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Radial deadzone. The direction is preserved, and the remaining travel is
 * re-normalized so the edge of the deadzone maps to 0 and the rim maps to 1.
 */
export function applyDeadzone(
  x: number,
  y: number,
  deadzone = STICK_DEADZONE,
): StickOutput {
  const distance = Math.hypot(x, y);
  if (distance <= deadzone || distance === 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }
  const magnitude = clamp((distance - deadzone) / (1 - deadzone), 0, 1);
  const scale = magnitude / distance;
  return { x: x * scale, y: y * scale, magnitude };
}

/** Symmetric sensitivity curve: sign(x) * |x|^gamma. */
export function applyResponse(value: number, gamma = STICK_GAMMA): number {
  if (value === 0) {
    return 0;
  }
  return Math.sign(value) * Math.pow(Math.abs(value), gamma);
}

/**
 * Turns a pointer offset from the stick centre into normalized steering and
 * throttle. The offset is clamped to `radius` before the deadzone is applied.
 */
export function movementFromStick(
  dx: number,
  dy: number,
  radius: number,
  deadzone = STICK_DEADZONE,
  gamma = STICK_GAMMA,
): MovementOutput {
  const safeRadius = Math.max(1, radius);
  let x = dx / safeRadius;
  let y = dy / safeRadius;
  const length = Math.hypot(x, y);
  if (length > 1) {
    x /= length;
    y /= length;
  }

  const dead = applyDeadzone(x, y, deadzone);
  if (dead.magnitude === 0) {
    return { steer: 0, throttle: 0 };
  }
  let steer = applyResponse(dead.x, gamma);
  let throttle = -applyResponse(dead.y, gamma);

  // Per-axis response can leave the vector slightly outside the unit circle
  // on diagonals. Clamp the magnitude without rotating the input direction.
  const magnitude = Math.hypot(steer, throttle);
  if (magnitude > 1) {
    steer /= magnitude;
    throttle /= magnitude;
  }

  return { steer, throttle };
}

/**
 * Gamepad sticks are already centred in the -1..1 range. This applies the same
 * radial deadzone and response curve without needing a pixel radius.
 */
export function movementFromAxes(
  x: number,
  y: number,
  deadzone = 0.16,
  gamma = 1.1,
): MovementOutput {
  const dead = applyDeadzone(clamp(x, -1, 1), clamp(y, -1, 1), deadzone);
  if (dead.magnitude === 0) {
    return { steer: 0, throttle: 0 };
  }
  let steer = applyResponse(dead.x, gamma);
  let throttle = -applyResponse(dead.y, gamma);
  const magnitude = Math.hypot(steer, throttle);
  if (magnitude > 1) {
    steer /= magnitude;
    throttle /= magnitude;
  }
  return { steer, throttle };
}

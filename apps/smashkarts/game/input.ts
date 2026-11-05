import { movementFromAxes, movementFromStick, STICK_DEADZONE, STICK_GAMMA } from "../lib/joystick";

export interface DriveInput {
  /** -1 reverse .. +1 forward. */
  throttle: number;
  /** Screen-space steering: -1 left .. +1 right. */
  steer: number;
  fire: boolean;
}

export interface GameInputOptions {
  /** Called on the first input after an idle period so audio can resume. */
  onActivity?: () => void;
}

const MOVEMENT_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

const GAMEPAD_FIRE_BUTTONS = [0, 5, 7] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFormField(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}

function isMenuControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, [role='button'], [data-fire-control]"))
  );
}

/**
 * A guest may reconnect without the host remounting. Sequences start at the
 * current wall clock, so a later connection is always newer than the frames
 * the host saw before. Missing sequences are accepted for older clients.
 */
export function isNewerInputSequence(
  previous: number | undefined,
  next: number | undefined,
): boolean {
  if (next === undefined) {
    return true;
  }
  return previous === undefined || next > previous;
}

/**
 * Single normalized input source for every device. Keyboard, gamepad, the
 * virtual joystick and the optional pedals all write into this object, and the
 * kart simulation reads it once per fixed step. No React state is involved in
 * pointer movement.
 */
export class GameInput {
  private readonly options: GameInputOptions;
  private readonly keys = new Set<string>();
  private enabled = true;

  private keyFire = false;
  private stickSteer = 0;
  private stickThrottle = 0;
  private pedalSteer = 0;
  private pedalThrottle = 0;
  private touchFire = false;
  private firePulse = 0;

  private gamepadIndex: number | null = null;
  private gamepadSteer = 0;
  private gamepadThrottle = 0;
  private gamepadFire = false;

  constructor(options: GameInputOptions = {}) {
    this.options = options;
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.clear();
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /** Joystick values are already normalized to -1..1. */
  setStick(steer: number, throttle: number) {
    this.stickSteer = clamp(steer, -1, 1);
    this.stickThrottle = clamp(throttle, -1, 1);
    this.activity();
  }

  /** Pedal values are already normalized to -1..1. */
  setPedals(steer: number, throttle: number) {
    this.pedalSteer = clamp(steer, -1, 1);
    this.pedalThrottle = clamp(throttle, -1, 1);
    this.activity();
  }

  setFire(firing: boolean) {
    this.touchFire = firing;
    if (firing) {
      this.activity();
    }
  }

  /**
   * Guarantees at least one fixed step sees the trigger, even when a tap starts
   * and ends between two animation frames.
   */
  pulseFire() {
    this.firePulse = Math.max(this.firePulse, 0.08);
    this.activity();
  }

  /** Releases touch controls without dropping a held keyboard or gamepad. */
  clearTouch() {
    this.stickSteer = 0;
    this.stickThrottle = 0;
    this.pedalSteer = 0;
    this.pedalThrottle = 0;
    this.touchFire = false;
    this.firePulse = 0;
  }

  /** Drops every held control. Used on pause, blur, tab hide and match end. */
  clear() {
    this.keys.clear();
    this.keyFire = false;
    this.clearTouch();
    this.gamepadSteer = 0;
    this.gamepadThrottle = 0;
    this.gamepadFire = false;
  }

  /** Samples the gamepad and decays the one-frame trigger pulse. */
  sample(dt: number) {
    if (this.firePulse > 0) {
      this.firePulse = Math.max(0, this.firePulse - dt);
    }
    if (this.enabled) {
      this.pollGamepad();
    }
  }

  read(): DriveInput {
    if (!this.enabled) {
      return { throttle: 0, steer: 0, fire: false };
    }

    const up = this.keys.has("KeyW") || this.keys.has("ArrowUp");
    const down = this.keys.has("KeyS") || this.keys.has("ArrowDown");
    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight");

    const keyboardThrottle = (up ? 1 : 0) - (down ? 1 : 0);
    const keyboardSteer = (right ? 1 : 0) - (left ? 1 : 0);

    return {
      throttle: clamp(
        keyboardThrottle + this.stickThrottle + this.pedalThrottle + this.gamepadThrottle,
        -1,
        1,
      ),
      steer: clamp(
        keyboardSteer + this.stickSteer + this.pedalSteer + this.gamepadSteer,
        -1,
        1,
      ),
      fire:
        this.keyFire ||
        this.touchFire ||
        this.gamepadFire ||
        this.firePulse > 0,
    };
  }

  private activity() {
    this.options.onActivity?.();
  }

  private pollGamepad() {
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
      return;
    }

    let pads: Array<Gamepad | null>;
    try {
      pads = Array.from(navigator.getGamepads());
    } catch {
      return;
    }

    let pad =
      this.gamepadIndex === null ? null : (pads[this.gamepadIndex] ?? null);
    if (!pad || !pad.connected) {
      pad = pads.find((entry) => entry?.connected) ?? null;
    }
    if (!pad) {
      this.gamepadIndex = null;
      this.gamepadSteer = 0;
      this.gamepadThrottle = 0;
      this.gamepadFire = false;
      return;
    }
    this.gamepadIndex = pad.index;

    const stick = movementFromAxes(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    let steer = stick.steer;
    let throttle = stick.throttle;
    if (pad.buttons[14]?.pressed) steer -= 1;
    if (pad.buttons[15]?.pressed) steer += 1;
    if (pad.buttons[12]?.pressed) throttle += 1;
    if (pad.buttons[13]?.pressed) throttle -= 1;

    this.gamepadSteer = clamp(steer, -1, 1);
    this.gamepadThrottle = clamp(throttle, -1, 1);

    const firing = GAMEPAD_FIRE_BUTTONS.some((index) => pad.buttons[index]?.pressed);
    if (firing && !this.gamepadFire) {
      this.activity();
    }
    this.gamepadFire = firing;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (isFormField(event.target) || !this.enabled) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const code = event.code;
    if (code === "Space") {
      // Space activates a focused menu button. The weapon button opts out so
      // it behaves exactly like the desktop Space shortcut.
      if (isMenuControl(event.target) && !(event.target as Element).closest("[data-fire-control]")) {
        return;
      }
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      this.keyFire = true;
      this.pulseFire();
      return;
    }

    if (!MOVEMENT_CODES.has(code)) {
      return;
    }
    event.preventDefault();
    if (event.repeat) {
      return;
    }
    this.keys.add(code);
    this.activity();
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    if (event.code === "Space") {
      this.keyFire = false;
    }
  };

  private onBlur = () => {
    this.clear();
  };

  private onVisibility = () => {
    if (document.hidden) {
      this.clear();
    }
  };
}

export const STICK_SETTINGS = {
  deadzone: STICK_DEADZONE,
  gamma: STICK_GAMMA,
  maxTravel: 0.62,
} as const;

export { movementFromStick };

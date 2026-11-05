"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GameEngine } from "@/game/engine";
import type { ControlScheme } from "@/lib/settings";
import { VirtualJoystick } from "./virtual-joystick";

interface TouchControlsProps {
  engineRef: { current: GameEngine | null };
  scheme: ControlScheme;
  disabled?: boolean;
}

type PedalKey = "left" | "right" | "forward" | "reverse";

interface PedalState {
  left: boolean;
  right: boolean;
  forward: boolean;
  reverse: boolean;
}

const EMPTY_PEDALS: PedalState = {
  left: false,
  right: false,
  forward: false,
  reverse: false,
};

/**
 * Touch movement layer. Joystick mode sends a normalized 360-degree vector;
 * pedal mode sends the same normalized steer/throttle pair from four
 * independent hold buttons. Firing stays in the weapon circle.
 */
export function TouchControls({ engineRef, scheme, disabled = false }: TouchControlsProps) {
  const setStick = useCallback(
    (steer: number, throttle: number) => {
      engineRef.current?.setTouchMovement(steer, throttle);
    },
    [engineRef],
  );

  useEffect(
    () => () => {
      engineRef.current?.clearTouchInput();
    },
    [engineRef],
  );

  return (
    <div
      className={`touch-controls touch-controls-${scheme}`}
      data-disabled={disabled ? "true" : "false"}
      aria-hidden={disabled ? "true" : undefined}
    >
      {scheme === "joystick" ? (
        <VirtualJoystick disabled={disabled} onChange={setStick} />
      ) : (
        <PedalControls engineRef={engineRef} disabled={disabled} />
      )}
    </div>
  );
}

function PedalControls({
  engineRef,
  disabled,
}: {
  engineRef: { current: GameEngine | null };
  disabled: boolean;
}) {
  const held = useRef<PedalState>({ ...EMPTY_PEDALS });

  const sync = useCallback(() => {
    const state = held.current;
    const steer = (state.right ? 1 : 0) - (state.left ? 1 : 0);
    const throttle = (state.forward ? 1 : 0) - (state.reverse ? 1 : 0);
    engineRef.current?.setTouchPedals(steer, throttle);
  }, [engineRef]);

  const setPedal = useCallback(
    (key: PedalKey, pressed: boolean) => {
      held.current = { ...held.current, [key]: pressed };
      sync();
    },
    [sync],
  );

  const releaseAll = useCallback(() => {
    held.current = { ...EMPTY_PEDALS };
    sync();
  }, [sync]);

  const holdLeft = useCallback((pressed: boolean) => setPedal("left", pressed), [setPedal]);
  const holdRight = useCallback((pressed: boolean) => setPedal("right", pressed), [setPedal]);
  const holdForward = useCallback(
    (pressed: boolean) => setPedal("forward", pressed),
    [setPedal],
  );
  const holdReverse = useCallback(
    (pressed: boolean) => setPedal("reverse", pressed),
    [setPedal],
  );

  useEffect(() => {
    if (disabled) {
      releaseAll();
    }
  }, [disabled, releaseAll]);

  useEffect(
    () => () => {
      releaseAll();
    },
    [releaseAll],
  );

  return (
    <div className="touch-pedals" aria-label="Pedal controls">
      <div className="pedal-cluster pedal-cluster-steer">
        <HoldPedal
          label="Steer left"
          glyph="◀"
          disabled={disabled}
          onHold={holdLeft}
          className="pedal-button pedal-button-steer"
        />
        <HoldPedal
          label="Steer right"
          glyph="▶"
          disabled={disabled}
          onHold={holdRight}
          className="pedal-button pedal-button-steer"
        />
      </div>
      <div className="pedal-cluster pedal-cluster-throttle">
        <HoldPedal
          label="Reverse"
          glyph="▼"
          disabled={disabled}
          onHold={holdReverse}
          className="pedal-button pedal-button-reverse"
        />
        <HoldPedal
          label="Accelerate"
          glyph="▲"
          disabled={disabled}
          onHold={holdForward}
          className="pedal-button pedal-button-forward"
        />
      </div>
    </div>
  );
}

function HoldPedal({
  label,
  glyph,
  disabled,
  onHold,
  className,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onHold: (pressed: boolean) => void;
  className: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activePointer = useRef<number | null>(null);

  const release = useCallback(() => {
    const button = buttonRef.current;
    const pointer = activePointer.current;
    activePointer.current = null;
    button?.removeAttribute("data-held");
    if (button && pointer !== null && button.hasPointerCapture(pointer)) {
      button.releasePointerCapture(pointer);
    }
    onHold(false);
  }, [onHold]);

  useEffect(() => {
    if (disabled) {
      release();
    }
  }, [disabled, release]);

  useEffect(() => {
    const onBlur = () => release();
    const onVisibility = () => {
      if (document.hidden) {
        release();
      }
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      if (activePointer.current !== null) {
        activePointer.current = null;
        onHold(false);
      }
    };
  }, [onHold, release]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || activePointer.current !== null) {
      return;
    }
    event.preventDefault();
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.setAttribute("data-held", "true");
    onHold(true);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== event.pointerId) {
      return;
    }
    release();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={className}
      disabled={disabled}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

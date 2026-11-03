"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { WEAPONS } from "@/game/constants";
import type { GameEngine } from "@/game/engine";
import type { WeaponId } from "@/game/types";
import { WeaponGlyph } from "./weapon-glyph";

interface TouchControlsProps {
  engineRef: { current: GameEngine | null };
  weapon: WeaponId;
  ammo: number;
}

/** Ignore tiny accidental drags so the kart does not creep in a straight line. */
const DEADZONE = 0.16;

function curve(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude <= DEADZONE) {
    return 0;
  }
  return (Math.sign(value) * (magnitude - DEADZONE)) / (1 - DEADZONE);
}

/**
 * On-screen driving controls for touch devices: an analog stick on the left
 * and a circular fire button on the right that shows the current weapon.
 * Both use pointer capture so they keep working when a thumb slides off.
 */
export function TouchControls({ engineRef, weapon, ammo }: TouchControlsProps) {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const fireRef = useRef<HTMLButtonElement>(null);
  const movePointer = useRef<number | null>(null);
  const firePointer = useRef<number | null>(null);
  const spec = WEAPONS[weapon];

  useEffect(() => {
    const engine = engineRef.current;
    const reset = () => {
      movePointer.current = null;
      firePointer.current = null;
      if (knobRef.current) {
        knobRef.current.style.transform = "";
      }
      stickRef.current?.classList.remove("is-active");
      fireRef.current?.classList.remove("is-firing");
      engine?.clearTouchInput();
    };
    const onVisibility = () => {
      if (document.hidden) {
        reset();
      }
    };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", onVisibility);
      engine?.clearTouchInput();
    };
  }, [engineRef]);

  const track = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stick = stickRef.current;
    const knob = knobRef.current;
    if (!stick || !knob) {
      return;
    }
    const rect = stick.getBoundingClientRect();
    const radius = rect.width / 2;
    const limit = radius * 0.62;
    let dx = event.clientX - rect.left - radius;
    let dy = event.clientY - rect.top - radius;
    const distance = Math.hypot(dx, dy);
    if (distance > limit) {
      dx = (dx / distance) * limit;
      dy = (dy / distance) * limit;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    engineRef.current?.setTouchMovement(curve(dx / limit), curve(-dy / limit));
  };

  const releaseMove = () => {
    movePointer.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = "";
    }
    stickRef.current?.classList.remove("is-active");
    engineRef.current?.setTouchMovement(0, 0);
  };

  const onMoveDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointer.current !== null) {
      return;
    }
    event.preventDefault();
    const stick = stickRef.current;
    if (!stick) {
      return;
    }
    movePointer.current = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    stick.classList.add("is-active");
    track(event);
  };

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointer.current !== event.pointerId) {
      return;
    }
    event.preventDefault();
    track(event);
  };

  const onMoveEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointer.current !== event.pointerId) {
      return;
    }
    releaseMove();
  };

  const releaseFire = () => {
    firePointer.current = null;
    engineRef.current?.setTouchFire(false);
  };

  const onFireDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (firePointer.current !== null) {
      return;
    }
    event.preventDefault();
    firePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("is-firing");
    engineRef.current?.setTouchFire(true);
  };

  const onFireEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (firePointer.current !== event.pointerId) {
      return;
    }
    event.currentTarget.classList.remove("is-firing");
    releaseFire();
  };

  return (
    <div className="touch-controls">
      <div
        ref={stickRef}
        className="touch-stick"
        role="group"
        aria-label="Movement joystick"
        onPointerDown={onMoveDown}
        onPointerMove={onMove}
        onPointerUp={onMoveEnd}
        onPointerCancel={onMoveEnd}
        onLostPointerCapture={onMoveEnd}
      >
        <span className="touch-stick-ring" aria-hidden="true" />
        <span className="touch-stick-knob" ref={knobRef} aria-hidden="true" />
        <span className="touch-stick-label" aria-hidden="true">
          Move
        </span>
      </div>

      <button
        ref={fireRef}
        type="button"
        className="touch-fire"
        style={{ color: spec.css }}
        aria-label={`Fire ${spec.name}`}
        onPointerDown={onFireDown}
        onPointerUp={onFireEnd}
        onPointerCancel={onFireEnd}
        onLostPointerCapture={onFireEnd}
        onContextMenu={(event) => event.preventDefault()}
      >
        <WeaponGlyph weapon={weapon} className="h-10 w-10" />
        <span className="touch-fire-ammo" aria-hidden="true">
          {weapon === "pulse" ? "∞" : ammo}
        </span>
        <span className="sr-only">
          Current weapon: {spec.name}. {weapon === "pulse" ? "Unlimited ammo." : `${ammo} rounds.`}
        </span>
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { GameEngine } from "@/game/engine";

interface TouchControlsProps {
  engineRef: { current: GameEngine | null };
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
 * On-screen movement stick for touch devices. Firing lives in the weapon
 * circle on the right side of the HUD so the same control works with a mouse,
 * a tap or a thumb.
 */
export function TouchControls({ engineRef }: TouchControlsProps) {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const movePointer = useRef<number | null>(null);

  useEffect(() => {
    const engine = engineRef.current;
    const reset = () => {
      movePointer.current = null;
      if (knobRef.current) {
        knobRef.current.style.transform = "";
      }
      stickRef.current?.classList.remove("is-active");
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
    </div>
  );
}

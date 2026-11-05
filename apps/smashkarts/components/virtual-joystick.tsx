"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  movementFromStick,
  STICK_DEADZONE,
  STICK_GAMMA,
} from "@/lib/joystick";

interface VirtualJoystickProps {
  disabled?: boolean;
  onChange: (steer: number, throttle: number) => void;
}

const MAX_TRAVEL = 0.62;

/**
 * Fixed-base, semi-transparent joystick. The base never moves; the thumbstick
 * follows one pointer and eases back to centre when it is released. Pointer
 * coordinates are written straight to the DOM so dragging does not trigger a
 * React render on every move.
 */
export function VirtualJoystick({ disabled = false, onChange }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLSpanElement>(null);
  const activePointer = useRef<number | null>(null);

  const release = useCallback(() => {
    const base = baseRef.current;
    const pointer = activePointer.current;
    activePointer.current = null;
    base?.classList.remove("is-active");
    base?.removeAttribute("data-active");
    if (base && pointer !== null && base.hasPointerCapture(pointer)) {
      base.releasePointerCapture(pointer);
    }
    if (knobRef.current) {
      knobRef.current.style.transform = "";
    }
    if (headingRef.current) {
      headingRef.current.style.opacity = "0";
      headingRef.current.style.transform = "translate(-50%, -50%)";
    }
    onChange(0, 0);
  }, [onChange]);

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
        onChange(0, 0);
      }
    };
  }, [onChange, release]);

  const track = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const base = baseRef.current;
      const knob = knobRef.current;
      const heading = headingRef.current;
      if (!base || !knob) {
        return;
      }
      const rect = base.getBoundingClientRect();
      const radius = rect.width / 2;
      const limit = radius * MAX_TRAVEL;
      let dx = event.clientX - rect.left - radius;
      let dy = event.clientY - rect.top - radius;
      const distance = Math.hypot(dx, dy);
      if (distance > limit) {
        dx = (dx / distance) * limit;
        dy = (dy / distance) * limit;
      }

      const movement = movementFromStick(dx, dy, limit, STICK_DEADZONE, STICK_GAMMA);
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      if (heading) {
        const magnitude = Math.min(1, Math.hypot(dx, dy) / Math.max(1, limit));
        const scale = magnitude > 0.04 ? 1 : 0;
        heading.style.opacity = scale ? String(0.25 + magnitude * 0.55) : "0";
        heading.style.transform = `translate(calc(-50% + ${dx * 1.18}px), calc(-50% + ${dy * 1.18}px))`;
      }
      onChange(movement.steer, movement.throttle);
    },
    [onChange],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || activePointer.current !== null) {
      return;
    }
    event.preventDefault();
    const base = baseRef.current;
    if (!base) {
      return;
    }
    activePointer.current = event.pointerId;
    base.setPointerCapture(event.pointerId);
    base.classList.add("is-active");
    base.setAttribute("data-active", "true");
    track(event);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) {
      return;
    }
    event.preventDefault();
    track(event);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) {
      return;
    }
    release();
  };

  return (
    <div
      ref={baseRef}
      className="virtual-stick"
      data-disabled={disabled ? "true" : "false"}
      role="group"
      aria-label="Movement joystick. Drag in any direction to steer and accelerate."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="virtual-stick-ring" aria-hidden="true" />
      <span ref={headingRef} className="virtual-stick-heading" aria-hidden="true" />
      <span ref={knobRef} className="virtual-stick-knob" aria-hidden="true" />
      <span className="virtual-stick-label" aria-hidden="true">
        Move
      </span>
    </div>
  );
}

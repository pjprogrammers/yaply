"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { WEAPONS } from "@/game/constants";
import type { WeaponSlot } from "@/game/types";
import { WeaponGlyph } from "./weapon-glyph";

interface WeaponCircleProps {
  weapon: WeaponSlot;
  ammo: number;
  disabled?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}

/**
 * The minimap used to live here. It is now the weapon slot: a big circular
 * button that shows what the crate gave you and fires it on click, tap or
 * thumb press. Holding it keeps automatic weapons running.
 */
export function WeaponCircle({
  weapon,
  ammo,
  disabled = false,
  onPressStart,
  onPressEnd,
}: WeaponCircleProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activePointer = useRef<number | null>(null);
  const spec = weapon === "none" ? null : WEAPONS[weapon];

  const release = useCallback(() => {
    if (activePointer.current === null) {
      return;
    }
    activePointer.current = null;
    buttonRef.current?.removeAttribute("data-firing");
    onPressEnd();
  }, [onPressEnd]);

  useEffect(() => {
    if (disabled) {
      activePointer.current = null;
      buttonRef.current?.removeAttribute("data-firing");
      onPressEnd();
    }
  }, [disabled, onPressEnd]);

  useEffect(
    () => () => {
      if (activePointer.current !== null) {
        activePointer.current = null;
        onPressEnd();
      }
    },
    [onPressEnd],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || !spec) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    event.currentTarget.setAttribute("data-firing", "true");
    onPressStart();
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    release();
  };

  const style = spec
    ? ({ "--weapon-color": spec.css } as CSSProperties)
    : undefined;

  return (
    <div className="hud-weapon-circle-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`weapon-circle${spec ? "" : " is-empty"}`}
        style={style}
        disabled={disabled || !spec}
        aria-label={
          spec
            ? `Fire ${spec.name}. ${ammo} ${spec.ammo === 1 ? "use" : "rounds"} left.`
            : "No weapon equipped. Drive through a mystery crate."
        }
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={release}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="weapon-circle-ring" aria-hidden="true" />
        <span className="weapon-circle-core">
          <WeaponGlyph weapon={weapon} className="weapon-circle-glyph" />
        </span>
        <span className="weapon-circle-ammo tabular-nums">{spec ? ammo : "—"}</span>
        {spec ? (
          <span className="weapon-circle-rarity">{spec.rarity}</span>
        ) : (
          <span className="weapon-circle-rarity">empty</span>
        )}
      </button>
      <span className="weapon-circle-name">
        {spec ? spec.name : "Mystery crate"}
      </span>
    </div>
  );
}

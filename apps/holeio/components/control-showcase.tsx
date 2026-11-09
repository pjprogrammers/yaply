"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const MAX = 118;

export function ControlShowcase() {
  const padRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [driving, setDriving] = useState(false);

  const update = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const length = Math.hypot(dx, dy);
    if (length > MAX) {
      dx = (dx / length) * MAX;
      dy = (dy / length) * MAX;
    }
    setKnob({ x: dx, y: dy });
    setDriving(Math.hypot(dx, dy) > 18);
  };

  const release = () => {
    pointerRef.current = null;
    setKnob({ x: 0, y: 0 });
    setDriving(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    update(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    update(event.clientX, event.clientY);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 30;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return;
    event.preventDefault();
    setKnob((current) => {
      const next = {
        x: Math.max(-MAX, Math.min(MAX, current.x + dx)),
        y: Math.max(-MAX, Math.min(MAX, current.y + dy)),
      };
      setDriving(Math.hypot(next.x, next.y) > 18);
      return next;
    });
  };

  const angle = Math.atan2(knob.y, knob.x);
  const magnitude = Math.min(1, Math.hypot(knob.x, knob.y) / MAX);

  return (
    <section
      id="control"
      className={`showcase ${driving ? "is-driving" : ""}`}
      aria-labelledby="control-title"
    >
      <div className="showcase-copy margins">
        <p className="eyebrow eyebrow--ink">
          <span aria-hidden />
          One thumb, the whole game
        </p>
        <h2 id="control-title" className="showcase-title display">
          Drag.
          <br />
          {driving ? "Swallow." : "Move."}
        </h2>
        <p className="showcase-lede">
          No jump button, no weapon wheel, no inventory. Pull the stick and the
          hole follows your thumb. That is the entire control scheme.
        </p>
        <p className="showcase-readout" aria-hidden>
          <span>SPEED</span>
          <strong>{Math.round(magnitude * 100).toString().padStart(2, "0")}</strong>
          <span>HEADING</span>
          <strong>{Math.round(((angle * 180) / Math.PI + 360) % 360)}°</strong>
        </p>
      </div>

      <div className="showcase-rig">
        <div
          className="showcase-stick"
          ref={padRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onKeyDown={onKeyDown}
          role="application"
          aria-label="Demo joystick. Drag it or use the arrow keys."
          tabIndex={0}
        >
          <span className="showcase-stick__base" aria-hidden />
          <span className="showcase-stick__ticks" aria-hidden />
          <span
            className="showcase-stick__knob"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
            aria-hidden
          >
            <span />
          </span>
          <span className="showcase-stick__label" aria-hidden>
            {driving ? "Swallowing" : "Pull to move"}
          </span>
        </div>
        <span className="showcase-crop" aria-hidden />
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { KART_COLORS } from "@/game/constants";
import { savePaint } from "@/lib/settings";

export function ColorLab() {
  const [color, setColor] = useState<string>(KART_COLORS[0].hex);
  const active = KART_COLORS.find((entry) => entry.hex === color) ?? KART_COLORS[0];

  function choose(hex: string) {
    setColor(hex);
    savePaint(hex);
  }

  return (
    <div className="colorlab">
      <div className="colorlab-stage" aria-live="polite">
        <svg viewBox="0 0 720 380" role="img" aria-label={`Side view of a kart painted ${active.name}`}>
          <g stroke="#0b0b0a" strokeWidth="9" strokeLinejoin="round">
            <path d="M84 292 L636 292 L636 322 L84 322 Z" fill="#1d1d1a" />
            <path d="M108 282 C108 254 132 240 180 240 L540 240 C596 240 622 258 622 282 L622 296 L108 296 Z" fill={color} />
            <path d="M170 240 L220 168 L420 168 L486 240 Z" fill="#141412" />
            <path d="M232 180 L286 180 L310 234 L244 234 Z" fill={color} />
            <path d="M474 238 L534 214 L560 240 L500 254 Z" fill="#1d1d1a" />
            <path d="M468 168 L560 168 L560 184 L468 184 Z" fill={color} />
            <path d="M486 168 L486 224 M544 168 L544 224" strokeWidth="7" />
            <path d="M148 270 L188 250 L232 270 L232 300 L148 300 Z" fill="#24241f" />
            <path d="M420 268 L520 268 L520 300 L420 300 Z" fill="#24241f" />
            <circle cx="196" cy="300" r="60" fill="#141412" />
            <circle cx="196" cy="300" r="28" fill="#6f7d8c" />
            <circle cx="196" cy="300" r="10" fill="#0b0b0a" />
            <circle cx="528" cy="300" r="60" fill="#141412" />
            <circle cx="528" cy="300" r="28" fill="#6f7d8c" />
            <circle cx="528" cy="300" r="10" fill="#0b0b0a" />
            <path d="M300 168 L300 112 C300 94 316 82 336 82 L378 82 C398 82 412 94 412 112 L412 168" fill="#1d1d1a" />
            <circle cx="356" cy="80" r="38" fill={color} />
            <path d="M330 72 L384 72 L384 92 L330 92 Z" fill="#0b0b0a" strokeWidth="6" />
            <path d="M412 128 L456 128 L456 152 L412 152 Z" fill="#1d1d1a" />
            <path d="M324 84 L292 52 L318 36 L354 68" fill={color} strokeWidth="7" />
            <path d="M84 250 L122 250 L136 282 L84 282 Z" fill="#1d1d1a" />
            <path d="M616 250 L642 250 L642 282 L616 282 Z" fill="#1d1d1a" />
          </g>
          <g fill="#f2ecdd" fontFamily="var(--font-display), Impact, sans-serif">
            <text x="112" y="352" fontSize="24" letterSpacing="1">
              {active.name.toUpperCase()}
            </text>
          </g>
          <g fill="#ff5a1f">
            <rect x="606" y="112" width="18" height="52" />
            <rect x="632" y="132" width="12" height="32" />
          </g>
        </svg>
      </div>

      <div className="colorlab-controls">
        <p className="colorlab-readout">
          Paint: <strong>{active.name}</strong> <span>{active.hex.toUpperCase()}</span>
        </p>
        <div className="swatches" role="group" aria-label="Kart paint">
          {KART_COLORS.map((entry) => (
            <button
              key={entry.hex}
              type="button"
              className={`swatch ${entry.hex === color ? "is-active" : ""}`}
              style={{ backgroundColor: entry.hex }}
              aria-label={entry.name}
              aria-pressed={entry.hex === color}
              onClick={() => choose(entry.hex)}
            >
              <span className="sr-only">{entry.name}</span>
            </button>
          ))}
        </div>
        <Link className="button button-primary" href="/play" onClick={() => savePaint(color)}>
          Take it to the garage
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useFullscreen, usePortraitPhone } from "@/lib/fullscreen";

/**
 * Phone-only gate shown while the device is upright. It covers the HUD and
 * touch controls, then disappears as soon as the orientation media query flips
 * to landscape, so the player drops straight back into the race.
 */
export function OrientationGate() {
  const portrait = usePortraitPhone();
  const fullscreen = useFullscreen();

  if (!portrait) {
    return null;
  }

  return (
    <div
      className="orientation-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orientation-title"
    >
      <div className="orientation-card">
        <div className="orientation-phone" aria-hidden="true">
          <span className="orientation-phone-screen" />
          <span className="orientation-phone-home" />
        </div>
        <p className="hud-label">Smash Karts</p>
        <h2 id="orientation-title" className="orientation-title">
          Turn your phone sideways
        </h2>
        <p className="orientation-copy">
          The arena is built for landscape. Rotate your device and the race will
          be waiting right where you left it.
        </p>
        <div className="orientation-actions">
          {fullscreen.supported && !fullscreen.active ? (
            <button
              type="button"
              className="button button-primary"
              data-fullscreen-control
              onClick={() => void fullscreen.enter()}
            >
              Go fullscreen
            </button>
          ) : null}
          <span className="orientation-status">
            {fullscreen.active ? "Fullscreen on" : "Waiting for landscape…"}
          </span>
        </div>
      </div>
    </div>
  );
}

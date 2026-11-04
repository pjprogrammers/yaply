"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CollapseIcon, MenuIcon, XIcon } from "./icons";

type GameStageProps = {
  turnLabel: ReactNode;
  turnColor: string;
  detail?: ReactNode;
  timer?: ReactNode;
  hint?: ReactNode;
  banner?: ReactNode;
  menu: ReactNode;
  menuLabel?: string;
  onExitFullscreen: () => void;
  children: ReactNode;
};

/**
 * Full-viewport game chrome. The board sits underneath a light HUD while the
 * menu drawer carries the leaderboard, match/room details and chat.
 */
export function GameStage({
  turnLabel,
  turnColor,
  detail,
  timer,
  hint,
  banner,
  menu,
  menuLabel = "Game menu",
  onExitFullscreen,
  children,
}: GameStageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="game-stage">
      <div className="game-stage-glow" aria-hidden />
      <div className="game-stage-board">{children}</div>

      <header className="game-stage-hud">
        <button
          type="button"
          className="stage-menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls="chain-game-menu"
          aria-label="Open game menu"
        >
          <MenuIcon size={17} />
          <span>Menu</span>
        </button>

        <div className="stage-turn" aria-live="polite">
          <i style={{ background: turnColor }} aria-hidden />
          <span className="stage-turn-copy">
            <span className="stage-turn-label">{turnLabel}</span>
            {detail && <span className="stage-turn-detail">{detail}</span>}
          </span>
        </div>

        <div className="stage-hud-right">{timer}</div>
      </header>

      {banner && <div className="stage-banner">{banner}</div>}

      <div className="game-stage-footer">
        <span className="stage-hint">{hint}</span>
        <span className="stage-hint stage-hint--quiet">
          Triple-tap the board to exit fullscreen
        </span>
      </div>

      {menuOpen && (
        <div
          className="stage-menu-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <aside
            className="stage-menu"
            id="chain-game-menu"
            role="dialog"
            aria-modal="true"
            aria-label={menuLabel}
          >
            <div className="stage-menu-head">
              <div>
                <p className="eyebrow">Chain Reaction</p>
                <h2 className="stage-menu-title">{menuLabel}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="icon-btn stage-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="stage-menu-body">{menu}</div>

            <div className="stage-menu-footer">
              <button
                type="button"
                className="btn btn--ghost btn--block"
                onClick={() => {
                  setMenuOpen(false);
                  onExitFullscreen();
                }}
              >
                <CollapseIcon size={14} />
                Exit fullscreen
              </button>
              <p className="stage-menu-tip">
                You can also triple-tap the board at any time.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export function GameMenuSection({
  title,
  aside,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="stage-menu-section">
      <div className="stage-menu-section-head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function GameMenuFacts({
  items,
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
}) {
  return (
    <div className="stage-facts">
      {items.map((item, index) => (
        <div className="stage-fact" key={index}>
          <span className="stage-fact-label">{item.label}</span>
          <span className="stage-fact-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

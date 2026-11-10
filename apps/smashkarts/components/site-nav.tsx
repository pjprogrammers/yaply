"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MAIN_URL } from "@/lib/config";

export function SiteNav({ variant = "home" }: { variant?: "home" | "install" }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const section = (id: string) => (variant === "home" ? `#${id}` : `/#${id}`);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <nav className="nav margins" aria-label="Primary">
      <Link href="/" className="nav-word">
        Smash Karts
      </Link>

      <div className="nav-links">
        <a href={section("arenas")}>Arenas</a>
        <a href={section("arsenal")}>Arsenal</a>
        <a href={section("controls")}>How to play</a>
        <a href={section("paint")}>Garage</a>
        <Link href="/install">Install</Link>
        <a href={MAIN_URL}>All games</a>
      </div>

      <div className="nav-actions">
        <Link href="/play" className="nav-action">
          Play now
          <span aria-hidden="true">→</span>
        </Link>
        <button
          type="button"
          className={`nav-menu-toggle${menuOpen ? " is-open" : ""}`}
          aria-expanded={menuOpen}
          aria-controls="smashkarts-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div id="smashkarts-menu" className={`nav-menu${menuOpen ? " is-open" : ""}`}>
        <div className="nav-menu-links">
          <a href={section("arenas")}>Arenas</a>
          <a href={section("arsenal")}>Arsenal</a>
          <a href={section("controls")}>How to play</a>
          <a href={section("paint")}>Garage</a>
          <Link href="/install">Install</Link>
          <a href={MAIN_URL}>All games</a>
        </div>
        <div className="nav-menu-actions">
          <Link href="/install" className="nav-menu-install">
            Install
          </Link>
          <Link href="/play" className="nav-action">
            Play now
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

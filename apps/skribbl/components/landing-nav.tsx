"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MAIN_URL } from "@/lib/config";
import { SkribblMark } from "./icons";

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="landing-nav">
      <div className="landing-margins landing-nav-inner">
        <Link href="/" className="landing-brand" aria-label="Yaply Skribbl home">
          <SkribblMark />
          <span>Skribbl</span>
        </Link>

        <nav className="landing-links" aria-label="Primary">
          <a href="#how-it-works">How it works</a>
          <a href="#words">Words</a>
          <a href="#scoring">Scoring</a>
          <Link href="/how-to-play">How to play</Link>
          <Link href="/install">Install app</Link>
          <a href={MAIN_URL}>All games</a>
        </nav>

        <div className="landing-nav-actions">
          <Link href="/join" className="landing-nav-join">
            Join a room
          </Link>
          <Link href="/create" className="landing-button landing-nav-create">
            Create a room
          </Link>
          <button
            type="button"
            className={`landing-nav-menu-toggle${menuOpen ? " is-open" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="skribbl-landing-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        id="skribbl-landing-menu"
        className={`landing-nav-menu${menuOpen ? " is-open" : ""}`}
      >
        <nav className="landing-nav-menu-links" aria-label="Mobile">
          <a href="#how-it-works">How it works</a>
          <a href="#words">Words</a>
          <a href="#scoring">Scoring</a>
          <Link href="/how-to-play">How to play</Link>
          <Link href="/install">Install app</Link>
          <a href={MAIN_URL}>All games</a>
        </nav>
        <div className="landing-nav-menu-actions">
          <Link href="/join" className="landing-button landing-button--ghost">
            Join a room
          </Link>
          <Link href="/create" className="landing-button">
            Create a room
          </Link>
        </div>
      </div>
    </header>
  );
}

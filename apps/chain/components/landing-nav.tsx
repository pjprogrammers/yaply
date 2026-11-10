"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MAIN_URL } from "@/lib/config";
import { ChainMark } from "./icons";

export function LandingNav({ variant = "home" }: { variant?: "home" | "install" }) {
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
    <header className="cr-nav">
      <div className="cr-margins cr-nav-inner">
        <Link href="/" className="cr-brand" aria-label="Yaply Chain Reaction home">
          <ChainMark />
          <span>
            Chain <span>Reaction</span>
          </span>
        </Link>

        <nav className="cr-nav-links" aria-label="Primary">
          <a href={section("how-it-works")}>How it works</a>
          <a href={section("rules")}>Critical mass</a>
          <a href={section("boards")}>The board</a>
          <Link href="/how-to-play">How to play</Link>
          <Link href="/install">Install app</Link>
          <a href={MAIN_URL}>All games</a>
        </nav>

        <div className="cr-nav-actions">
          <Link href="/join" className="cr-nav-join">
            Join a room
          </Link>
          <Link href="/create" className="cr-button cr-button--nav cr-nav-start">
            Start a game
          </Link>
          <button
            type="button"
            className={`cr-nav-menu-toggle${menuOpen ? " is-open" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="chain-landing-menu"
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
        id="chain-landing-menu"
        className={`cr-nav-menu${menuOpen ? " is-open" : ""}`}
      >
        <nav className="cr-nav-menu-links" aria-label="Mobile">
          <a href={section("how-it-works")}>How it works</a>
          <a href={section("rules")}>Critical mass</a>
          <a href={section("boards")}>The board</a>
          <Link href="/how-to-play">How to play</Link>
          <Link href="/install">Install app</Link>
          <a href={MAIN_URL}>All games</a>
        </nav>
        <div className="cr-nav-menu-actions">
          <Link href="/join" className="cr-button cr-button--ghost">
            Join a room
          </Link>
          <Link href="/create" className="cr-button">
            Start a game
          </Link>
        </div>
      </div>
    </header>
  );
}

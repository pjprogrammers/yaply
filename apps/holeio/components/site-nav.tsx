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
    <nav className="site-nav margins" aria-label="Primary">
      <Link href="/" className="wordmark" aria-label="Hole.io home">
        <span className="wordmark__dot" aria-hidden />
        Hole.io
      </Link>

      <div className="site-nav__links">
        <a href={section("how")}>How it works</a>
        <a href={section("city")}>The city</a>
        <a href={section("control")}>Controls</a>
        <a href={section("faq")}>FAQ</a>
        <a href={MAIN_URL}>All games</a>
      </div>

      <div className="site-nav__actions">
        <Link href="/install" className="site-nav__install">
          Install
        </Link>
        <Link href="/play" className="pill pill--lime site-nav__play">
          Play now
          <span aria-hidden>→</span>
        </Link>
        <button
          type="button"
          className={`site-nav__menu-toggle${menuOpen ? " is-open" : ""}`}
          aria-expanded={menuOpen}
          aria-controls="holeio-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div id="holeio-menu" className={`site-nav__menu${menuOpen ? " is-open" : ""}`}>
        <div className="site-nav__menu-links">
          <a href={section("how")}>How it works</a>
          <a href={section("city")}>The city</a>
          <a href={section("control")}>Controls</a>
          <a href={section("faq")}>FAQ</a>
          <a href={MAIN_URL}>All games</a>
        </div>
        <div className="site-nav__menu-actions">
          <Link href="/install" className="pill pill--outline">
            Install
          </Link>
          <Link href="/play" className="pill pill--lime">
            Play now
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

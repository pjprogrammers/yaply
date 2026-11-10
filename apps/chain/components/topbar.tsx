"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { MAIN_URL } from "@/lib/config";
import { ChainMark } from "./icons";

export function Topbar({ children, compact = false }: { children?: ReactNode; compact?: boolean }) {
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
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Yaply Chain Reaction home">
        <span className="brand-mark">
          <ChainMark />
        </span>
        <span>
          Yaply <span className="brand-sub">Chain</span>
        </span>
      </Link>
      {children ?? (
        <>
          <nav className="topbar-links" aria-label="Primary">
            {!compact && (
              <>
                <Link href="/how-to-play" className="topbar-link">
                  How to play
                </Link>
                <Link href="/install" className="topbar-link">
                  Install
                </Link>
              </>
            )}
            <a href={MAIN_URL} className="topbar-link">
              All games
            </a>
          </nav>

          <button
            type="button"
            className={`topbar-menu-toggle${menuOpen ? " is-open" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="chain-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          <div id="chain-menu" className={`topbar-menu${menuOpen ? " is-open" : ""}`}>
            <nav className="topbar-menu-links" aria-label="Mobile">
              {!compact && (
                <Link href="/how-to-play" className="topbar-menu-link">
                  How to play
                </Link>
              )}
              <Link href="/install" className="topbar-menu-link">
                Install
              </Link>
              <a href={MAIN_URL} className="topbar-menu-link">
                All games
              </a>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

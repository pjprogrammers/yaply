import Link from "next/link";
import type { ReactNode } from "react";
import { MAIN_URL } from "@/lib/config";
import { SpyMark } from "./icons";

export function Topbar({
  children,
  compact = false,
}: {
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Yaply Who's the Spy home">
        <SpyMark size={30} />
        <span className="brand-word">
          Yaply <span className="brand-sub">Spy</span>
        </span>
      </Link>
      {children ?? (
        <nav className="topbar-links" aria-label="Primary">
          {!compact && (
            <>
              <Link href="/how-to-play" className="topbar-link">
                How to play
              </Link>
              <Link href="/install" className="topbar-link topbar-link--hide">
                Install
              </Link>
            </>
          )}
          <a href={MAIN_URL} className="topbar-link topbar-link--hide">
            All games
          </a>
          <Link href="/create" className="button button--small">
            Start a case
          </Link>
        </nav>
      )}
    </header>
  );
}

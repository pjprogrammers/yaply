import Link from "next/link";
import type { ReactNode } from "react";
import { MAIN_URL } from "@/lib/config";
import { ChainMark } from "./icons";

export function Topbar({ children, compact = false }: { children?: ReactNode; compact?: boolean }) {
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
        <div className="topbar-links">
          {!compact && (
            <Link href="/how-to-play" className="topbar-link topbar-link--hide">
              How to play
            </Link>
          )}
          <a href={MAIN_URL} className="topbar-link">
            All games
          </a>
        </div>
      )}
    </header>
  );
}

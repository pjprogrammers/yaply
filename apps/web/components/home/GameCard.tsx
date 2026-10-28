"use client";

import Link from "next/link";
import { GameEntry } from "@/lib/game-registry";

export function GameCard({ game, featured = false }: { game: GameEntry; featured?: boolean }) {
  const isPlayable = game.status === "implemented";
  const skribblUrl = process.env.NEXT_PUBLIC_SKRIBBL_URL || "https://skribbl.yaply.eu.org";
  const href = isPlayable ? (game.id === "skribbl" ? skribblUrl : game.route) : game.route;
  const isExternal = game.id === "skribbl" && isPlayable;

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-b ${game.bgGradient} to-slate-950/95 shadow-xl transition-transform hover:-translate-y-1 hover:shadow-2xl focus-within:ring-2 focus-within:ring-cyan-400/60 ${
        featured ? "md:col-span-2 lg:col-span-1" : ""
      }`}
      aria-label={game.name}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="relative p-5 sm:p-6 flex flex-col h-full min-h-[200px] sm:min-h-[220px]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">{game.shortName}</div>
            <h3 className="text-2xl sm:text-3xl font-extrabold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {game.name}
            </h3>
          </div>
          <span
            className={`px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-full border ${
              isPlayable
                ? "border-emerald-400/60 text-emerald-300 bg-emerald-400/10"
                : "border-slate-500/60 text-slate-400 bg-slate-500/10"
            }`}
          >
            {isPlayable ? "Playable" : "Coming soon"}
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-200/90 mb-6 flex-1">{game.tagline}</p>
        {isExternal ? (
          <a
            href={href}
            className={`self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400`}
            aria-label={`Play ${game.name}`}
          >
            PLAY NOW
            <span aria-hidden="true">→</span>
          </a>
        ) : (
          <Link
            href={href}
            className={`self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isPlayable
                ? "bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400"
                : "bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700/70"
            }`}
            aria-label={isPlayable ? `Play ${game.name}` : `Learn more about ${game.name}`}
          >
            {isPlayable ? "PLAY NOW" : "View"}
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </article>
  );
}

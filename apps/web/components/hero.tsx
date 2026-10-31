import Link from "next/link";
import { CHAIN_REACTION_URL } from "@/lib/game-urls";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.25),transparent_55%)]" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-10 sm:pb-14 relative">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400 mb-4">Play with friends</p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            One platform. <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">Endless games.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-8">
            Yaply brings fast multiplayer party games together in one place. Jump in instantly with friends.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/games" className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition">
              Explore Games
            </Link>
            <a href={CHAIN_REACTION_URL} className="px-6 py-3 rounded-xl font-semibold bg-slate-800/80 border border-slate-700/70 hover:bg-slate-700/70 transition">
              Play Chain Reaction
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

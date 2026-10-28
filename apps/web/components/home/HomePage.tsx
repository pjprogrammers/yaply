"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GAMES } from "@/lib/game-registry";
import { GameCard } from "./GameCard";

export function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const featured = GAMES.find((g) => g.featured) || GAMES[0];
  const others = GAMES.filter((g) => g.id !== featured.id);

  const skribblUrl = process.env.NEXT_PUBLIC_SKRIBBL_URL || "https://skribbl.yaply.eu.org";

  const goCreate = () => {
    window.location.href = `${skribblUrl}/create?name=${encodeURIComponent(nickname.trim() || "Player")}`;
  };

  const goJoin = () => {
    if (roomCode.trim().length !== 6) return;
    window.location.href = `${skribblUrl}/room/${roomCode.trim().toLowerCase()}?name=${encodeURIComponent(nickname.trim() || "Player")}`;
  };

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/60 border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="text-xl sm:text-2xl font-extrabold tracking-wider" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            YAP<span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">LY</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <Link href="#discover" className="hover:text-white transition">Discover</Link>
            <Link href="#games" className="hover:text-white transition">Games</Link>
            <Link href="#how-to-play" className="hover:text-white transition">How to play</Link>
            <Link href="/games/skribbl/create" className="hover:text-white transition">Rooms</Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-700/60 text-xs text-slate-300">
              Play with friends • Free to play
            </div>
            <button className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950 font-bold flex items-center justify-center" aria-label="Profile">
              PJ
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.25),transparent_55%)]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-10 sm:pb-14 relative">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400 mb-4">Your friends are waiting.</p>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              One room. <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">Five games.</span> Endless chaos.
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-8">
              A mobile-first social gaming hub for quick rounds with friends. Jump in as a guest — no account required.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
            <div className="rounded-3xl border border-slate-700/60 bg-gradient-to-b from-violet-500/15 to-slate-950/95 p-5 sm:p-7 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Nickname</label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={16}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/70 text-white focus:outline-none focus:border-cyan-400/80"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={goCreate} className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition">
                    🎮 Create a Room
                  </button>
                  <button onClick={() => { window.location.href = `${skribblUrl}/create?name=${encodeURIComponent(nickname.trim() || "Player")}&quick=1`; }} className="px-6 py-3 rounded-xl font-semibold bg-slate-800/80 border border-slate-700/70 hover:bg-slate-700/70 transition">
                    Quick Play
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-700/70" />
                <span className="text-xs uppercase tracking-widest text-slate-500">or join with code</span>
                <div className="flex-1 h-px bg-slate-700/70" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toLowerCase())}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/70 text-center tracking-[0.5em] font-mono uppercase text-white focus:outline-none focus:border-cyan-400/80"
                />
                <button onClick={goJoin} disabled={roomCode.trim().length !== 6} className="px-8 py-3 rounded-xl font-semibold bg-slate-800/80 border border-slate-700/70 disabled:opacity-40 hover:bg-slate-700/70 transition">
                  Join
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs uppercase tracking-widest text-slate-500">
                <span>Online now</span>
                <span className="hidden sm:inline">•</span>
                <span>Play with friends</span>
                <span className="hidden sm:inline">•</span>
                <span>Free to play</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/60 overflow-hidden shadow-2xl">
              <div className={`relative p-6 sm:p-8 bg-gradient-to-br ${featured.bgGradient} to-slate-950`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-slate-300 mb-2">Featured</p>
                      <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{featured.name}</h2>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs uppercase tracking-widest border border-emerald-400/60 text-emerald-300 bg-emerald-400/10">Playable</span>
                  </div>
                  <p className="text-lg text-slate-100/90 mb-6">{featured.tagline}</p>
                <a href={featured.id === "skribbl" ? skribblUrl : featured.route} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition">
                  Play Now
                  <span aria-hidden="true">→</span>
                </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="games" className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500 mb-2">Discover</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Pick your next obsession</h2>
          </div>
          <Link href="#games" className="hidden sm:inline-flex text-sm text-slate-400 hover:text-white transition">View all games →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <GameCard game={featured} featured />
          {others.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section id="how-to-play" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-6 sm:p-10 grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500 mb-2">How it works</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Create. Share. Play.</h3>
            <p className="text-slate-400">Start a room in seconds and invite your friends with a simple code.</p>
          </div>
          <div className="rounded-2xl border border-slate-700/60 p-5 bg-slate-900/60">
            <div className="text-3xl mb-3">1</div>
            <h4 className="font-semibold mb-2">Create or join</h4>
            <p className="text-sm text-slate-400">Pick a name, create a room, or join with a 6-letter code.</p>
          </div>
          <div className="rounded-2xl border border-slate-700/60 p-5 bg-slate-900/60">
            <div className="text-3xl mb-3">2</div>
            <h4 className="font-semibold mb-2">Pick a game</h4>
            <p className="text-sm text-slate-400">Start with Skribbl now. More games are on the way with distinct styles.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-extrabold tracking-wider text-slate-300">YAPLY</span>
            <span>© {new Date().getFullYear()} Yaply. Built for friends.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition">Discover</Link>
            <Link href="#games" className="hover:text-white transition">Games</Link>
            <Link href="/games/skribbl/create" className="hover:text-white transition">Play Skribbl</Link>
          </div>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-slate-950/80 border-t border-slate-800/70">
        <div className="grid grid-cols-4 text-xs text-slate-400">
          <Link href="/" className="flex flex-col items-center py-2 text-cyan-300">
            <span>Home</span>
          </Link>
          <Link href="#games" className="flex flex-col items-center py-2 hover:text-white transition">
            <span>Games</span>
          </Link>
          <Link href="/games/skribbl/create" className="flex flex-col items-center py-2 hover:text-white transition">
            <span>Rooms</span>
          </Link>
          <Link href="/" className="flex flex-col items-center py-2 hover:text-white transition">
            <span>Me</span>
          </Link>
        </div>
      </nav>
      <div className="md:hidden h-14" />
    </main>
  );
}

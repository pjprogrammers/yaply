"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type PageProps = {
  params: any;
};

function RoomContent({ code }: { code: string }) {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Player";
  const [players, setPlayers] = useState([{ name, isHost: true }]);
  const [phase, setPhase] = useState("lobby");

  useEffect(() => {}, []);

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <header className="flex items-center justify-between mb-6 p-4 bg-slate-900/60 rounded-2xl border border-slate-700/60 backdrop-blur-xl">
        <Link href="/" className="text-xl font-extrabold tracking-wider" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          YAP<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">LY</span>
        </Link>
        <div className="px-4 py-2 bg-slate-800/80 rounded-full text-sm tracking-widest font-mono">Room: {(code || "").toUpperCase()}</div>
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition">Leave</Link>
      </header>

      {phase === "lobby" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-gradient-to-b from-cyan-500/10 to-slate-950/95 rounded-3xl border border-slate-700/60 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Players ({players.length}/8)</h2>
              <span className="text-xs text-slate-400">Waiting for host to start</span>
            </div>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500"></div>
                  <div className="flex-1 font-medium">{p.name}</div>
                  {p.isHost && <span className="text-xs px-2 py-1 bg-cyan-400/10 text-cyan-300 rounded-full">Host</span>}
                </div>
              ))}
            </div>
            <button onClick={() => setPhase("game")} className="w-full mt-4 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-xl font-semibold hover:from-cyan-400 hover:to-violet-400 transition">
              Start Game
            </button>
            <p className="mt-3 text-xs text-center text-slate-500">Share the room code with your friends to play together.</p>
          </div>
        </div>
      )}

      {phase === "game" && (
        <div className="max-w-4xl mx-auto text-center py-16">
          <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-8">
            <h2 className="text-2xl font-semibold mb-3">Game starting</h2>
            <p className="text-slate-400 mb-6">Connect to the realtime server to play the full Skribbl experience.</p>
            <button onClick={() => setPhase("lobby")} className="px-6 py-3 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:bg-slate-700/70 transition">
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function RoomPage({ params }: PageProps) {
  const code = typeof params?.code === "string" ? params.code : Array.isArray(params?.code) ? params.code[0] : "";
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-slate-400">Loading...</main>}>
      <RoomContent code={code} />
    </Suspense>
  );
}

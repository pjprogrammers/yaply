"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

function CreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialName = searchParams.get("name") || "Player";
  const quick = searchParams.get("quick") === "1";
  const [nickname, setNickname] = useState(initialName);

  const create = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/games/skribbl/room/${code.toLowerCase()}?name=${encodeURIComponent(nickname.trim() || "Player")}`);
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-gradient-to-b from-cyan-500/10 to-slate-950/95 p-6 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Create Room
          </h1>
          <p className="text-slate-400">Start a Skribbl room with friends</p>
        </div>
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Nickname</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
            className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/70 text-white focus:outline-none focus:border-cyan-400/80"
          />
        </div>
        <button onClick={create} className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition">
          {quick ? "Quick Play" : "Create Private Room"}
        </button>
        <button onClick={() => router.push("/")} className="w-full mt-3 py-3 rounded-xl font-semibold bg-slate-800/80 border border-slate-700/70 hover:bg-slate-700/70 transition">
          Back to Home
        </button>
      </div>
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-slate-400">Loading...</main>}>
      <CreateContent />
    </Suspense>
  );
}

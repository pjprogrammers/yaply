"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type PageProps = { params: any };

function RoomContent({ code }: { code: string }) {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Player";

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <header className="flex items-center justify-between mb-6 p-4 bg-slate-900/60 rounded-2xl border border-slate-700/60">
        <Link href="/" className="text-xl font-extrabold tracking-wider">CHAIN REACTION</Link>
        <div className="px-4 py-2 bg-slate-800/80 rounded-full text-sm tracking-widest font-mono">Room: {(code || "").toUpperCase()}</div>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">Leave</Link>
      </header>
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-8">
          <h2 className="text-2xl font-semibold mb-3">Chain Reaction</h2>
          <p className="text-slate-400 mb-6">Server-authoritative board coming soon. Connects to shared realtime backend.</p>
          <p className="text-sm text-slate-500">Player: {name}</p>
        </div>
      </div>
    </main>
  );
}

export default function RoomPage({ params }: PageProps) {
  const code = typeof params?.roomCode === "string" ? params.roomCode : Array.isArray(params?.roomCode) ? params.roomCode[0] : "";
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-slate-400">Loading...</main>}>
      <RoomContent code={code} />
    </Suspense>
  );
}

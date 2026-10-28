"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase().toLowerCase();
    router.push(`/room/${code}?name=${encodeURIComponent(nickname.trim() || "Player")}`);
  };

  const joinRoom = () => {
    if (roomCode.trim().length !== 6) return;
    router.push(`/room/${roomCode.trim().toLowerCase()}?name=${encodeURIComponent(nickname.trim() || "Player")}`);
  };

  return (
    <main className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg sm:text-xl font-extrabold tracking-wider" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          CHAIN<span className="bg-gradient-to-r from-[#65A8FF] to-[#9B6DFF] bg-clip-text text-transparent"> REACTION</span>
        </Link>
        <Link href="https://yaply.eu.org" className="text-sm text-[#B9B0C9] hover:text-[#F7F4FC] transition">Back to Yaply</Link>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-12">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[#898097] mb-4">Strategic • Competitive • Geometric</p>
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Outsmart your opponents, <span className="bg-gradient-to-r from-[#65A8FF] to-[#9B6DFF] bg-clip-text text-transparent">one move at a time.</span>
            </h1>
            <p className="text-lg text-[#B9B0C9] max-w-xl mb-6">
              Add orbs to the grid. Trigger chain reactions and be the last one standing.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#382D4B] bg-gradient-to-b from-[#65A8FF]/10 to-[#100D18]/95 p-6 shadow-[0_40px_120px_-80px_rgba(101,168,255,0.7)]">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Enter the arena</h2>
            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wider text-[#898097] mb-2">Nickname</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={16}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl bg-[#191424]/80 border border-[#382D4B] text-[#F7F4FC] focus:outline-none focus:border-[#65A8FF]/80"
              />
            </div>
            <button onClick={createRoom} className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-[#65A8FF] to-[#9B6DFF] hover:from-[#7DB4FF] hover:to-[#B69AFF] transition mb-4">
              Create Room
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#382D4B]" />
              <span className="text-xs text-[#898097]">or join with code</span>
              <div className="flex-1 h-px bg-[#382D4B]" />
            </div>
            <div className="flex gap-2">
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toLowerCase())}
                maxLength={6}
                placeholder="ROOM CODE"
                className="flex-1 px-4 py-3 rounded-xl bg-[#191424]/80 border border-[#382D4B] text-center tracking-[0.5em] font-mono uppercase text-[#F7F4FC] focus:outline-none focus:border-[#65A8FF]/80"
              />
              <button onClick={joinRoom} disabled={roomCode.trim().length !== 6} className="px-6 py-3 rounded-xl font-semibold bg-[#231C32] border border-[#382D4B] hover:bg-[#2D2440] disabled:opacity-40 transition">
                Join
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

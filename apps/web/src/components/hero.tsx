import Link from "next/link";
import { CHAIN_REACTION_URL } from "@/lib/game-urls";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(155,109,255,0.22),transparent_55%)]" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-10 sm:pb-14 relative">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.4em] text-[#898097] mb-4">Good games. Better together.</p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Bring your friends. <span className="bg-gradient-to-r from-[#B69AFF] via-[#65A8FF] to-[#FF6B70] bg-clip-text text-transparent">Play something fun.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#B9B0C9] max-w-2xl mb-8">
            A premium, mobile-first social gaming hub for fast multiplayer rounds with friends.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/games" className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#9B6DFF] to-[#7C3AED] hover:from-[#B69AFF] hover:to-[#8B5CF6] transition shadow-[0_20px_80px_-40px_rgba(155,109,255,0.9)]">
              Explore Games
            </Link>
            <a href={CHAIN_REACTION_URL} className="px-6 py-3 rounded-xl font-semibold bg-[#231C32] border border-[#382D4B] hover:bg-[#2D2440] transition">
              Play Chain Reaction
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

import { GameEntry } from "@/data/games";

export function GameCard({ game }: { game: GameEntry }) {
  const isAvailable = game.status === "available" && game.url;
  return (
    <article className="group relative overflow-hidden rounded-[20px] border border-[#382D4B] bg-gradient-to-b from-[#9B6DFF]/12 to-[#100D18]/95 shadow-[0_40px_120px_-80px_rgba(155,109,255,0.8)] transition-transform hover:-translate-y-1 focus-within:ring-2 focus-within:ring-[#B69AFF]/70">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(182,154,255,0.12),transparent_60%)]" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            {game.tag && <div className="text-xs uppercase tracking-[0.3em] text-[#898097] mb-2">{game.tag}</div>}
            <h3 className="text-xl sm:text-2xl font-extrabold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{game.name}</h3>
          </div>
          <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-full border ${isAvailable ? "border-[#54D6A0]/70 text-[#54D6A0] bg-[#54D6A0]/10" : "border-[#382D4B] text-[#898097] bg-[#231C32]/60"}`}>
            {isAvailable ? "Available" : "Coming soon"}
          </span>
        </div>
        <p className="text-sm text-[#B9B0C9] mb-5">{game.description}</p>
        {isAvailable ? (
          <a href={game.url!} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[#9B6DFF] to-[#7C3AED] hover:from-[#B69AFF] hover:to-[#8B5CF6] transition">
            Play Now →
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-[#231C32] border border-[#382D4B] text-[#898097]">
            Coming Soon
          </span>
        )}
      </div>
    </article>
  );
}

import { GameEntry } from "@/data/games";

export function GameCard({ game }: { game: GameEntry }) {
  const isAvailable = game.status === "available" && game.url;
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-b from-violet-500/10 to-slate-950/95 shadow-xl transition-transform hover:-translate-y-1">
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            {game.tag && <div className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">{game.tag}</div>}
            <h3 className="text-xl sm:text-2xl font-extrabold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{game.name}</h3>
          </div>
          <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-full border ${isAvailable ? "border-emerald-400/60 text-emerald-300 bg-emerald-400/10" : "border-slate-500/60 text-slate-400 bg-slate-500/10"}`}>
            {isAvailable ? "Available" : "Coming soon"}
          </span>
        </div>
        <p className="text-sm text-slate-300 mb-5">{game.description}</p>
        {isAvailable ? (
          <a href={game.url!} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition">
            Play Now →
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-slate-800/80 border border-slate-700/60 text-slate-400">
            Coming Soon
          </span>
        )}
      </div>
    </article>
  );
}

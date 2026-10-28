import { games } from "@/data/games";
import { GameCard } from "./game-card";

export function GameGrid() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500 mb-2">Games</p>
          <h2 className="text-2xl sm:text-4xl font-extrabold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Pick a game</h2>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

import { games } from "@/data/games";
import { GameCard } from "./game-card";

export function GameGrid() {
  const live = games.filter((game) => game.status === "available").length;

  return (
    <section className="games-section" data-chapter="black">
      <div className="shell">
        <div className="games-section__head">
          <h2>Five games, one link.</h2>
          <p className="games-section__lead">
            {live} live now. {games.length - live} on the way. Nothing to install.
          </p>
        </div>
        <div className="game-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </section>
  );
}

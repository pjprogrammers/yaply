import GameLink from "./game-link";
import { gameStatusLabel, type GameEntry } from "@/data/games";

export function GameCard({ game }: { game: GameEntry }) {
  const cta = game.status === "available" ? "Play now" : "See the game";

  return (
    <GameLink
      game={game}
      className="game-card"
      ariaLabel={`${game.name} — ${gameStatusLabel(game)}`}
    >
      <img
        className="game-card__poster"
        src={game.poster}
        alt={game.alt}
        width={900}
        height={1200}
        loading="lazy"
      />
      <div className="game-card__body">
        <div className="game-card__meta">
          <span>{game.tag}</span>
          <span className={`game-card__status game-card__status--${game.status}`}>
            {gameStatusLabel(game)}
          </span>
        </div>
        <h3>{game.name}</h3>
        <p>{game.statement}</p>
        <span className="game-card__cta">
          {cta} <span aria-hidden="true">→</span>
        </span>
      </div>
    </GameLink>
  );
}

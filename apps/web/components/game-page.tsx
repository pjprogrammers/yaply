import Link from "next/link";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import GameLink from "./game-link";
import { gameStatusLabel, type GameEntry } from "@/data/games";

export function GamePage({ game }: { game: GameEntry }) {
  const live = game.status === "available";

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar initialChapter="blue" />
      <main id="main">
        <section className="page-hero game-page__hero" data-chapter="blue">
          <div className="shell game-page__hero-grid">
            <div>
              <h1>{game.name}</h1>
              <p className="page-hero__lead">{game.statement}</p>
              <p className="page-hero__meta">
                {game.tag} · {gameStatusLabel(game)}
              </p>
              <div className="page-hero__actions">
                {live ? (
                  <GameLink game={game} className="button">
                    Play {game.name}
                  </GameLink>
                ) : (
                  <Link href="/games" className="button">
                    Browse all games
                  </Link>
                )}
              </div>
            </div>
            <img
              className="game-page__poster"
              src={game.poster}
              alt={game.alt}
              width={900}
              height={1200}
              loading="eager"
            />
          </div>
        </section>
        <section className="game-page__body" data-chapter="black">
          <div className="shell game-page__body-grid">
            <h2>{live ? "Ready when you are." : "Still in the workshop."}</h2>
            <div>
              <p>{game.description}</p>
              <p>
                {live
                  ? `${game.name} is live now. Open the game, start a room and share the link. The first move is yours.`
                  : "This one is still being built. It will join the shelf when it is ready to play. Chain Reaction and Skribbl are live in the meantime."}
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

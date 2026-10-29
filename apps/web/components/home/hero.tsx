"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import GameLink from "@/components/game-link";
import { gameStatusLabel, games } from "@/data/games";

const deckGames = [
  { game: games[2], slot: -2, delay: "1.1s" },
  { game: games[3], slot: -1, delay: "0.5s" },
  { game: games[0], slot: 0, delay: "0s" },
  { game: games[1], slot: 1, delay: "0.8s" },
  { game: games[4], slot: 2, delay: "1.4s" },
];

export default function Hero() {
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const deck = deckRef.current;
    const stage = deck?.parentElement;
    if (!deck || !stage) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      deck.style.setProperty("--px", `${(x * 12).toFixed(2)}deg`);
      deck.style.setProperty("--py", `${(-y * 9).toFixed(2)}deg`);
    };

    const reset = () => {
      deck.style.setProperty("--px", "0deg");
      deck.style.setProperty("--py", "0deg");
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", reset);

    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <section
      id="top"
      className="hero"
      data-chapter="blue"
      aria-labelledby="hero-title"
    >
      <div className="hero__grid">
        <div className="hero__panel">
          <div className="hero__copy">
            <h1 id="hero-title">
              <span>Yaply</span> <span>browser games</span>
            </h1>
            <p className="hero__lead">
              Fast multiplayer browser games for game night, ready to play with
              one link.
            </p>
            <div className="hero__actions">
              <a href="#games" className="button">
                Browse the games
              </a>
              <span className="hero__note">
                No installs. One link. Two games live now.
              </span>
            </div>
          </div>

          <div className="hero__deck-wrap">
            <div className="deck-stage">
              <div className="deck" ref={deckRef}>
                {deckGames.map(({ game, slot, delay }) => (
                  <GameLink
                    key={game.id}
                    game={game}
                    className="deck-card"
                    ariaLabel={`${game.name} — ${gameStatusLabel(game)}`}
                    style={
                      {
                        "--slot": slot,
                        "--float-delay": delay,
                      } as CSSProperties
                    }
                  >
                    <span className="deck-card__inner">
                      <img
                        src={game.poster}
                        alt={game.alt}
                        width={900}
                        height={1200}
                        loading={slot === 0 ? "eager" : "lazy"}
                        fetchPriority={slot === 0 ? "high" : "auto"}
                        decoding="async"
                      />
                    </span>
                  </GameLink>
                ))}
              </div>
            </div>
          </div>
        </div>

        <nav className="hero__rail" aria-label="Yaply games">
          {games.map((game) => (
            <GameLink
              key={game.id}
              game={game}
              className="hero__tile"
              ariaLabel={`${game.name} — ${gameStatusLabel(game)}`}
              style={
                {
                  "--tile": game.color,
                  "--tile-ink": game.ink === "light" ? "#ffffff" : "#070707",
                } as CSSProperties
              }
            >
              <span className="hero__tile-name">{game.name}</span>
              <span className="hero__tile-status">
                {gameStatusLabel(game)}
              </span>
            </GameLink>
          ))}
        </nav>
      </div>
    </section>
  );
}

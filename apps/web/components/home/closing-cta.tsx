"use client";

import { useState } from "react";
import GameLink from "@/components/game-link";
import Reveal from "@/components/reveal";
import { availableGames, games } from "@/data/games";

export default function ClosingCta() {
  const [gameId, setGameId] = useState(games[0].id);
  const selected = games.find((game) => game.id === gameId) ?? games[0];
  const liveNames = availableGames.map((game) => game.name).join(" and ");

  return (
    <section
      id="play"
      className="closing section-anchor"
      data-chapter="blue"
      aria-labelledby="closing-title"
    >
      <div className="shell closing__grid">
        <div className="closing__inner">
          <Reveal>
            <h2 id="closing-title">
              Tonight we&apos;re playing
              <span className="closing__select">
                <select
                  value={selected.id}
                  aria-label="Choose a game"
                  onChange={(event) => setGameId(event.target.value)}
                >
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </span>
              <GameLink game={selected} className="closing__go">
                {selected.status === "available" ? "Let's go" : "See the game"}
              </GameLink>
              .
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <p className="closing__note">
              {liveNames} are live now. Pick a room, send one link and skip the
              setup.
            </p>
          </Reveal>
        </div>

        <div className="closing__poster" aria-hidden="true">
          <img
            key={selected.id}
            src={selected.poster}
            alt=""
            width={900}
            height={1200}
          />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Reveal from "@/components/reveal";
import { gameStatusLabel, games } from "@/data/games";

export default function Showcase() {
  const [active, setActive] = useState(0);
  const selected = games[active];

  return (
    <section
      id="games"
      className="showcase section-anchor"
      data-chapter="yellow"
      aria-labelledby="showcase-title"
    >
      <div className="shell showcase__grid">
        <div className="showcase__copy">
          <Reveal>
            <h2 id="showcase-title">Pick tonight&apos;s game.</h2>
          </Reveal>

          <Reveal className="showcase__list" delay={100} stagger>
            {games.map((game, index) => (
              <button
                key={game.id}
                type="button"
                className={`showcase__item reveal-item ${
                  index === active ? "is-active" : ""
                }`}
                style={{ "--item-index": index } as CSSProperties}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
              >
                {game.name}
              </button>
            ))}
          </Reveal>
        </div>

        <Reveal className="showcase__stage" delay={160}>
          <div
            className="showcase__disc"
            style={{ "--disc": selected.disc } as CSSProperties}
            aria-hidden="true"
          />

          <div className="showcase__posters">
            {games.map((game, index) => (
              <div
                key={game.id}
                className={`showcase__poster ${
                  index === active ? "is-active" : ""
                }`}
                aria-hidden={index !== active}
              >
                <img
                  src={game.poster}
                  alt={game.alt}
                  width={900}
                  height={1200}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>

          <p className="showcase__fact">
            <strong>{selected.name}</strong>
            {selected.tag ? `${selected.tag} · ` : ""}
            {gameStatusLabel(selected)}
            <br />
            {selected.statement}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import type { KartSnapshot } from "@/game/types";
import { ordinal } from "@/lib/format";
import { useMediaQuery } from "@/lib/media";

interface MatchLeaderboardProps {
  standings: KartSnapshot[];
  playerId: string | null;
}

/**
 * Desktop keeps the full panel open. Tablet and mobile collapse it to a
 * one-line place/kill readout so the centre of the arena stays clear.
 */
export function MatchLeaderboard({ standings, playerId }: MatchLeaderboardProps) {
  // A large touch tablet is still a touch layout. Only a fine-pointer desktop
  // gets the permanently open standings panel.
  const desktop = useMediaQuery("(min-width: 1024px) and (pointer: fine)");
  const [expanded, setExpanded] = useState(false);
  const open = desktop || expanded;
  const player = standings.find((kart) => kart.id === playerId) ?? null;
  const place = player ? standings.indexOf(player) + 1 : 0;

  return (
    <section
      className={`hud-leaderboard${open ? " is-open" : ""}${desktop ? " is-desktop" : ""}`}
      aria-label="Leaderboard"
    >
      <button
        type="button"
        className="hud-leaderboard-toggle"
        aria-expanded={open}
        aria-controls="hud-leaderboard-list"
        tabIndex={desktop ? -1 : 0}
        onClick={() => {
          if (!desktop) {
            setExpanded((value) => !value);
          }
        }}
      >
        <span className="hud-leaderboard-title">
          <span className="hud-label">Standings</span>
          <span className="hud-leaderboard-live">
            {standings.length} {standings.length === 1 ? "driver" : "drivers"}
          </span>
        </span>
        <span className="hud-leaderboard-self">
          <span className="hud-leaderboard-place">{place ? ordinal(place) : "—"}</span>
          <span className="hud-leaderboard-kills">
            {player?.kills ?? 0} <span>W</span>
          </span>
        </span>
        <ChevronIcon />
      </button>

      <div className="hud-leaderboard-body" id="hud-leaderboard-list">
        <ol className="hud-leaderboard-list">
          {standings.map((kart, index) => (
            <li
              key={kart.id}
              className={`hud-leaderboard-row${kart.isPlayer ? " is-player" : ""}`}
              aria-label={`${index + 1}. ${kart.name}, ${kart.kills} wrecks, ${kart.deaths} deaths`}
            >
              <span className="hud-leaderboard-rank tabular-nums">{index + 1}</span>
              <span
                className="hud-leaderboard-dot"
                style={{ backgroundColor: kart.color }}
                aria-hidden="true"
              />
              <span className="hud-leaderboard-name">
                {kart.name}
                {!kart.alive ? <span className="hud-leaderboard-out"> · out</span> : null}
              </span>
              <span className="hud-leaderboard-w tabular-nums">{kart.kills}</span>
              <span className="hud-leaderboard-d tabular-nums">{kart.deaths}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="hud-leaderboard-chevron"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 7 5 5 5-5" />
    </svg>
  );
}

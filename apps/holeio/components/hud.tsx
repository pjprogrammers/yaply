"use client";

import type { GameSnapshot } from "@/game/types";
import { formatClock, formatRadius, formatScore } from "@/lib/format";
import { Minimap } from "./minimap";

interface HudProps {
  snapshot: GameSnapshot;
  fullscreenActive: boolean;
  fullscreenSupported: boolean;
  /** Omitted in online rooms, where the match cannot be paused. */
  onPause?: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 9v6h4l5 4V5L8 9H4Z"
        fill="currentColor"
      />
      {muted ? (
        <path
          d="m16 9 5 6m0-6-5 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {active ? (
        <path
          d="M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function Hud({
  snapshot,
  fullscreenActive,
  fullscreenSupported,
  onPause,
  onToggleMute,
  onToggleFullscreen,
}: HudProps) {
  const urgent = snapshot.timeLeft <= 10 && snapshot.phase === "playing";
  const leaderboard = snapshot.holes;
  const player = leaderboard.find((hole) => hole.isPlayer);

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-player">
          <div className="hud-player__score">
            <span>Score</span>
            <strong>{formatScore(snapshot.playerScore)}</strong>
          </div>
          <div className="hud-player__rank">
            <span>Rank</span>
            <strong>
              {snapshot.playerRank}
              <small>/{leaderboard.length}</small>
            </strong>
          </div>
          {!snapshot.playerAlive ? (
            <span className="hud-player__dead">Swallowed</span>
          ) : null}
        </div>

        <div className={`hud-clock ${urgent ? "is-urgent" : ""}`}>
          <span>{formatClock(snapshot.timeLeft)}</span>
          <small>{urgent ? "Hurry" : "Match time"}</small>
        </div>

        <div className="hud-actions">
          <button
            type="button"
            className="hud-icon"
            onClick={onToggleMute}
            aria-label={snapshot.muted ? "Unmute sound" : "Mute sound"}
            title={snapshot.muted ? "Unmute" : "Mute"}
          >
            <SoundIcon muted={snapshot.muted} />
          </button>
          {fullscreenSupported ? (
            <button
              type="button"
              className="hud-icon"
              onClick={onToggleFullscreen}
              aria-label={fullscreenActive ? "Exit fullscreen" : "Enter fullscreen"}
              title={fullscreenActive ? "Exit fullscreen" : "Fullscreen"}
              data-fullscreen-control
            >
              <FullscreenIcon active={fullscreenActive} />
            </button>
          ) : null}
          {onPause ? (
            <button
              type="button"
              className="hud-icon hud-icon--pause"
              onClick={onPause}
              aria-label="Pause game"
              title="Pause"
            >
              <PauseIcon />
            </button>
          ) : null}
        </div>
      </div>

      <aside className="hud-board" aria-label="Live leaderboard">
        <p className="hud-board__title">City leaderboard</p>
        <ol>
          {leaderboard.map((hole) => (
            <li
              key={hole.id}
              className={hole.isPlayer ? "is-player" : ""}
              data-dead={!hole.alive}
            >
              <span className="hud-board__rank">{hole.rank}</span>
              <span
                className="hud-board__dot"
                style={{ background: hole.color }}
                aria-hidden
              />
              <span className="hud-board__name">
                {hole.isPlayer ? "You" : hole.name}
              </span>
              <span className="hud-board__score">{formatScore(hole.score)}</span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="hud-feed" aria-live="polite">
        {snapshot.feed.slice(-3).map((item) => (
          <p key={item.id} data-tone={item.tone}>
            {item.text}
          </p>
        ))}
      </div>

      <div className="hud-growth">
        <div className="hud-growth__head">
          <span>{snapshot.tierLabel}</span>
          <strong>{formatRadius(snapshot.playerRadius)}</strong>
        </div>
        <div className="hud-growth__bar">
          <span style={{ width: `${Math.round(snapshot.tierProgress * 100)}%` }} />
        </div>
        <div className="hud-growth__foot">
          <span>Rim size</span>
          <span>{player ? `${player.eaten} swallowed` : ""}</span>
        </div>
      </div>

      <Minimap snapshot={snapshot} />
    </div>
  );
}

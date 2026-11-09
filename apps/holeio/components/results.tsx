"use client";

import { useState } from "react";
import { formatScore } from "@/lib/format";
import type { GameSnapshot } from "@/game/types";

interface ResultsProps {
  snapshot: GameSnapshot;
  /** Local mode: start another solo run. */
  onRestart?: () => void;
  /** Local mode: return to the menu. */
  onMenu?: () => void;
  /** Online rooms cannot pause, but they can run it back or leave. */
  online?: boolean;
  canRematch?: boolean;
  onRematch?: () => void;
  onLeave?: () => void;
}

export function Results({
  snapshot,
  onRestart,
  onMenu,
  online = false,
  canRematch = false,
  onRematch,
  onLeave,
}: ResultsProps) {
  const [copied, setCopied] = useState(false);
  const player = snapshot.holes.find((hole) => hole.isPlayer);
  const won = Boolean(player && player.rank === 1 && player.alive);
  const headline = won
    ? "Biggest hole in town."
    : snapshot.swallowedBy
      ? `Swallowed by ${snapshot.swallowedBy}.`
      : "The city held out.";
  const kicker = won ? "Clean sweep" : snapshot.swallowedBy ? "Flat, but not finished" : "Time";

  async function share() {
    const text = `I scored ${formatScore(snapshot.playerScore)} and finished #${snapshot.playerRank} of ${snapshot.holes.length} in Hole.io.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overlay overlay--results">
      <div className="results-card" role="dialog" aria-modal="true" aria-labelledby="results-title">
        <p className="results-kicker">{online ? "Online match" : kicker}</p>
        <h2 id="results-title" className="results-title display">
          {headline}
        </h2>

        <div className="results-verdict">
          <span className="results-rank">
            <small>#{snapshot.playerRank}</small>
            <span>of {snapshot.holes.length}</span>
          </span>
          <div className="results-score">
            <span>Score</span>
            <strong>{formatScore(snapshot.playerScore)}</strong>
            <small>
              Best {formatScore(snapshot.bestScore)}
              {snapshot.playerScore >= snapshot.bestScore ? " · new" : ""}
            </small>
          </div>
        </div>

        <div className="results-stats">
          <div>
            <span>Objects</span>
            <strong>{snapshot.playerEaten}</strong>
          </div>
          <div>
            <span>Rivals eaten</span>
            <strong>{snapshot.botsEaten}</strong>
          </div>
          <div>
            <span>Winner</span>
            <strong className="results-winner">{snapshot.winnerName ?? "—"}</strong>
          </div>
        </div>

        <div className="results-board">
          <p>Final table</p>
          <ol>
            {snapshot.holes.map((hole) => (
              <li key={hole.id} className={hole.isPlayer ? "is-player" : ""}>
                <span className="results-board__rank">{hole.rank}</span>
                <span
                  className="results-board__dot"
                  style={{ background: hole.color }}
                  aria-hidden
                />
                <span className="results-board__name">
                  {hole.isPlayer ? "You" : hole.name}
                  {!hole.alive ? <small> eaten</small> : null}
                </span>
                <span className="results-board__score">{formatScore(hole.score)}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="results-actions">
          {online ? (
            <>
              {canRematch ? (
                <button type="button" className="button button--lime" onClick={onRematch}>
                  Rematch
                  <span aria-hidden>→</span>
                </button>
              ) : (
                <span className="results-waiting">Waiting for the host to run it back</span>
              )}
              <button type="button" className="button button--ghost" onClick={onLeave}>
                Leave room
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button button--lime" onClick={onRestart}>
                Play again
                <span aria-hidden>→</span>
              </button>
              <button type="button" className="button button--ghost" onClick={onMenu}>
                Menu
              </button>
            </>
          )}
          <button type="button" className="results-share" onClick={() => void share()}>
            {copied ? "Copied" : "Copy result"}
          </button>
        </div>
      </div>
    </div>
  );
}

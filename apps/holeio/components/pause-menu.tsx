"use client";

import { formatScore } from "@/lib/format";
import type { GameSnapshot } from "@/game/types";

interface PauseMenuProps {
  snapshot: GameSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onToggleMute: () => void;
}

export function PauseMenu({
  snapshot,
  onResume,
  onRestart,
  onQuit,
  onToggleMute,
}: PauseMenuProps) {
  return (
    <div className="overlay overlay--pause">
      <div className="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <p className="pause-kicker">Match paused</p>
        <h2 id="pause-title" className="pause-title">
          Take a breath.
        </h2>
        <p className="pause-lede">
          The city waits. So do seven hungry holes.
        </p>

        <div className="pause-stats">
          <div>
            <span>Score</span>
            <strong>{formatScore(snapshot.playerScore)}</strong>
          </div>
          <div>
            <span>Rank</span>
            <strong>
              {snapshot.playerRank}
              <small>/{snapshot.holes.length}</small>
            </strong>
          </div>
          <div>
            <span>Swallowed</span>
            <strong>{snapshot.playerEaten}</strong>
          </div>
        </div>

        <div className="pause-actions">
          <button type="button" className="button button--lime" onClick={onResume} autoFocus>
            Resume
          </button>
          <button type="button" className="button button--ghost" onClick={onRestart}>
            Restart match
          </button>
        </div>

        <div className="pause-foot">
          <button type="button" className="text-button" onClick={onToggleMute}>
            {snapshot.muted ? "Sound off" : "Sound on"}
          </button>
          <button type="button" className="text-button" onClick={onQuit}>
            Quit to menu
          </button>
        </div>

        <p className="pause-keys">
          <kbd>Esc</kbd> or <kbd>P</kbd> to pause · <kbd>WASD</kbd> to move
        </p>
      </div>
    </div>
  );
}

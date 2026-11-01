"use client";

import type { Player } from "@yaply/shared/types";
import { CrownIcon } from "./icons";

type LeaderboardProps = {
  players: Player[];
  meId: string | null;
  hostId?: string;
};

export function Leaderboard({ players, meId, hostId }: LeaderboardProps) {
  const sorted = [...players]
    .filter((p) => p.connected || true)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.nickname.localeCompare(b.nickname);
    });

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <span className="rail-title">Leaderboard</span>
        <span className="rail-count">Live</span>
      </div>
      <div className="leaderboard-list">
        {sorted.map((player, index) => {
          const rank = index + 1;
          const isMe = player.id === meId;
          const isHost = player.id === hostId;
          return (
            <div
              key={player.id}
              className={["leaderboard-row", isMe ? "leaderboard-row--me" : "", rank === 1 ? "leaderboard-row--top" : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="leaderboard-rank">{rank}</span>
              <span className="leaderboard-name">
                <span className="player-dot" style={{ background: player.color }} />
                <span className="leaderboard-name-text">{player.nickname}</span>
                {isMe && <span className="player-you">you</span>}
                {isHost && rank === 1 && (
                  <span className="host-badge" title="Top">
                    <CrownIcon size={11} />
                  </span>
                )}
              </span>
              <span className="leaderboard-score">{player.score}</span>
            </div>
          );
        })}
        {sorted.length === 0 && <div className="chat-empty">No players yet</div>}
      </div>
    </div>
  );
}

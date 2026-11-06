"use client";

import type { Player } from "@yaply/shared/types";

type LeaderboardProps = {
  players: Player[];
  meId: string | null;
  hostId?: string;
  drawerId?: string | null;
  emptySlots?: number;
  title?: string;
  countLabel?: string;
};

/**
 * The room leaderboard. Each box contains only the live rank and the player's
 * complete display name: no avatars, scores, badges or extra metadata.
 *
 * Names wrap instead of being clipped, and the list scrolls internally when a
 * room has more players than the available height can hold.
 */
export function Leaderboard({
  players,
  meId,
  hostId,
  drawerId = null,
  emptySlots = 0,
  title = "Player leaderboard",
  countLabel,
}: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.nickname.localeCompare(b.nickname);
  });

  const count =
    countLabel ?? `${players.length} ${players.length === 1 ? "player" : "players"}`;

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <span className="rail-title">{title}</span>
        <span className="rail-count">{count}</span>
      </div>
      <div className="leaderboard-list">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className={[
              "player-name-box",
              player.id === meId ? "player-name-box--me" : "",
              player.id === hostId ? "player-name-box--host" : "",
              player.id === drawerId ? "player-name-box--drawing" : "",
              !player.connected ? "player-name-box--out" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-player-id={player.id}
            title={player.nickname}
          >
            <span className="player-rank">#{index + 1}</span>
            <span className="player-name">{player.nickname}</span>
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div className="player-name-box player-name-box--empty" key={`empty-${index}`}>
            <span className="player-rank">–</span>
            <span className="player-name">Open seat</span>
          </div>
        ))}
        {sorted.length === 0 && emptySlots === 0 && (
          <div className="chat-empty">No players yet</div>
        )}
      </div>
    </div>
  );
}

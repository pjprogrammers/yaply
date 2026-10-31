import type { Player } from "@yaply/shared/types";
import { CheckIcon, CrownIcon } from "./icons";

type PlayerListProps = {
  players: Player[];
  meId: string | null;
  hostId: string;
  drawerId?: string | null;
  showScores?: boolean;
  emptySlots?: number;
  compact?: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function PlayerList({
  players,
  meId,
  hostId,
  drawerId = null,
  showScores = true,
  emptySlots = 0,
  compact = false,
}: PlayerListProps) {
  return (
    <div className="players">
      {players.map((player) => {
        const isMe = player.id === meId;
        const isHost = player.id === hostId;
        const isDrawing = player.id === drawerId;
        return (
          <div
            key={player.id}
            className={[
              "player",
              isMe ? "player--me" : "",
              isDrawing ? "player--turn" : "",
              !player.connected ? "player--out" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className="player-avatar"
              style={{ background: `${player.color}22`, color: player.color }}
              aria-hidden
            >
              {initials(player.nickname)}
            </span>
            <span className="player-main">
              <span className="player-name">
                <span className="player-dot" style={{ background: player.color }} />
                <span className="player-name-text">{player.nickname}</span>
                {isMe && <span className="player-you">you</span>}
                {isHost && (
                  <span className="host-badge" title="Host">
                    <CrownIcon size={11} />
                  </span>
                )}
              </span>
              {!compact && (
                <span className="player-meta">
                  {!player.connected
                    ? "Reconnecting…"
                    : isDrawing
                      ? "Drawing now"
                      : player.guessedCorrectly
                        ? "Guessed the word"
                        : isHost
                          ? "Room host"
                          : "Ready"}
                </span>
              )}
            </span>
            {showScores && (
              <span className="player-score">
                {player.score}
                <span>pts</span>
              </span>
            )}
            {player.guessedCorrectly && player.connected && (
              <span className="player-guessed" title="Guessed correctly">
                <CheckIcon size={13} />
              </span>
            )}
            {!player.connected && <span className="player-disconnected">away</span>}
          </div>
        );
      })}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <div className="empty-slot" key={`empty-${index}`}>
          <span className="player-avatar" aria-hidden>
            +
          </span>
          <span>Waiting for a player</span>
        </div>
      ))}
    </div>
  );
}

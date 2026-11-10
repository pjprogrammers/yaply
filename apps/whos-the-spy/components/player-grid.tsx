"use client";

import { useState } from "react";
import type { GamePhase, Player, SpyRole, VoiceParticipant } from "@yaply/shared/types";
import { CheckIcon, CrownIcon, MicOffIcon } from "./icons";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

type PlayerGridProps = {
  players: Player[];
  meId: string | null;
  hostId: string;
  phase: GamePhase;
  speakerId?: string | null;
  readyIds?: string[];
  eliminatedIds?: string[];
  roles?: Record<string, SpyRole> | null;
  emptySlots?: number;
  /** Live voice membership and microphone state, keyed by player id. */
  voice?: VoiceParticipant[];
  /** The host closed every microphone, so in-voice seats count as muted. */
  voiceMutedAll?: boolean;
  /** The host disabled the voice channel entirely. */
  voiceOff?: boolean;
  /** Host-only moderation action. Omit for spectators and non-hosts. */
  onRemove?: (playerId: string) => void;
};

function statusFor(
  player: Player,
  phase: GamePhase,
  isSpeaker: boolean,
  isReady: boolean,
  isEliminated: boolean,
  role?: SpyRole,
): string {
  if (role) {
    return role === "spy" ? "Spy" : "Civilian";
  }
  if (!player.connected) return "Reconnecting…";
  if (isEliminated) return "Spectator";
  if (phase === "lobby") return "At the table";
  if (phase === "role-reveal") return isReady ? "Card opened" : "Reading the card";
  if (phase === "clue") return isSpeaker ? "Giving a clue" : "In the round";
  if (phase === "discussion") return "In the discussion";
  if (phase === "voting" || phase === "revote") return "Voting";
  if (phase === "elimination") return "In the round";
  if (phase === "final-guess") return isSpeaker ? "Making the guess" : "Waiting";
  if (phase === "results") return "Case closed";
  return "In the room";
}

export function PlayerGrid({
  players,
  meId,
  hostId,
  phase,
  speakerId = null,
  readyIds = [],
  eliminatedIds = [],
  roles = null,
  emptySlots = 0,
  voice = [],
  voiceMutedAll = false,
  voiceOff = false,
  onRemove,
}: PlayerGridProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirming =
    confirmingId && players.some((player) => player.id === confirmingId)
      ? confirmingId
      : null;

  return (
    <section className="player-section" aria-labelledby="players-title">
      <div className="section-rail-head">
        <h2 id="players-title">The table</h2>
        <span>
          {players.length} {players.length === 1 ? "player" : "players"}
        </span>
      </div>

      <div className="player-grid">
        {players.map((player) => {
          const isMe = player.id === meId;
          const isHost = player.id === hostId;
          const isSpeaker = player.id === speakerId;
          const isReady = readyIds.includes(player.id);
          const isEliminated = eliminatedIds.includes(player.id);
          const role = roles?.[player.id];
          const voiceEntry = voice.find((entry) => entry.playerId === player.id) ?? null;
          const voiceBlocked = Boolean(voiceEntry && (voiceMutedAll || voiceOff));
          const status = statusFor(player, phase, isSpeaker, isReady, isEliminated, role);

          return (
            <article
              key={player.id}
              className={[
                "player-card",
                isMe ? "is-me" : "",
                (isSpeaker || voiceEntry?.speaking) && !voiceBlocked ? "is-speaking" : "",
                isEliminated ? "is-out" : "",
                !player.connected ? "is-away" : "",
                role === "spy" ? "is-spy" : "",
                confirming === player.id ? "is-confirming" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className="player-avatar"
                style={{ background: `${player.color}24`, color: player.color }}
                aria-hidden
              >
                {initials(player.nickname)}
              </span>

              <div className="player-copy">
                <p className="player-name">
                  {player.nickname}
                  {isMe && <span className="player-you">you</span>}
                  {isHost && (
                    <span className="host-badge" title="Host">
                      <CrownIcon size={11} />
                    </span>
                  )}
                  {voiceEntry && (
                    <span
                      className={[
                        "player-voice",
                        voiceEntry.speaking && !voiceBlocked ? "is-speaking" : "",
                        voiceEntry.micMuted || voiceBlocked ? "is-muted" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={
                        voiceOff
                          ? `${player.nickname}'s voice is off`
                          : voiceMutedAll
                            ? `${player.nickname} is muted by the host`
                            : voiceEntry.micMuted
                              ? `${player.nickname} is muted in voice`
                              : voiceEntry.speaking
                                ? `${player.nickname} is speaking`
                                : `${player.nickname} is in voice`
                      }
                      aria-label={
                        voiceOff
                          ? "Voice off"
                          : voiceMutedAll
                            ? "Muted by host"
                            : voiceEntry.micMuted
                              ? "Muted in voice"
                              : voiceEntry.speaking
                                ? "Speaking"
                                : "In voice"
                      }
                    >
                      {voiceEntry.micMuted || voiceBlocked ? (
                        <MicOffIcon size={10} />
                      ) : (
                        <span className="voice-bars" aria-hidden>
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                    </span>
                  )}
                </p>
                <p className="player-status">
                  {phase === "role-reveal" && isReady && <CheckIcon size={12} />}
                  {status}
                </p>
              </div>

              {isEliminated && phase !== "results" && (
                <span className="player-tag">out</span>
              )}
              {phase === "results" && role && (
                <span className={`player-role player-role--${role}`}>{role}</span>
              )}
              {!player.connected && phase !== "results" && (
                <span className="player-tag player-tag--away">away</span>
              )}

              {onRemove && !isMe && (
                <button
                  type="button"
                  className="player-remove"
                  onClick={() => setConfirmingId(player.id)}
                  aria-label={`Remove ${player.nickname} from the room`}
                >
                  Remove
                </button>
              )}

              {confirming === player.id && onRemove && (
                <div
                  className="player-remove-confirm"
                  role="group"
                  aria-label={`Confirm removing ${player.nickname}`}
                >
                  <p>Remove {player.nickname}?</p>
                  <div>
                    <button
                      type="button"
                      className="player-remove-yes"
                      onClick={() => {
                        onRemove(player.id);
                        setConfirmingId(null);
                      }}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      className="player-remove-no"
                      onClick={() => setConfirmingId(null)}
                    >
                      Keep
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <div className="player-card player-card--empty" key={`empty-${index}`}>
            <span className="player-avatar" aria-hidden>
              +
            </span>
            <div className="player-copy">
              <p className="player-name">Open seat</p>
              <p className="player-status">Send the room link</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

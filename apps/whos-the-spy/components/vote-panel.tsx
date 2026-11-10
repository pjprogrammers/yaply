"use client";

import type { GamePhase, Player } from "@yaply/shared/types";
import { ClockIcon, LockIcon, ShieldIcon } from "./icons";

type VotePanelProps = {
  players: Player[];
  meId: string | null;
  aliveIds: string[];
  tiedIds: string[];
  phase: GamePhase;
  myVoteTarget: string | null;
  votesCast: number;
  eligibleVoters: number;
  remaining: number;
  spectator: boolean;
  onVote: (targetId: string) => void;
};

export function VotePanel({
  players,
  meId,
  aliveIds,
  tiedIds,
  phase,
  myVoteTarget,
  votesCast,
  eligibleVoters,
  remaining,
  spectator,
  onVote,
}: VotePanelProps) {
  const revote = phase === "revote";
  const candidateIds = (revote && tiedIds.length > 0 ? tiedIds : aliveIds).filter(
    (id) => players.some((player) => player.id === id),
  );
  const candidates = players.filter((player) => candidateIds.includes(player.id));
  const canVote = !spectator && aliveIds.includes(meId ?? "");
  const sealedTarget = myVoteTarget
    ? players.find((player) => player.id === myVoteTarget)?.nickname
    : null;
  const percent =
    eligibleVoters > 0 ? Math.min(100, Math.round((votesCast / eligibleVoters) * 100)) : 0;

  return (
    <section className="vote-panel" aria-labelledby="vote-title">
      <div className="vote-head">
        <div>
          <p className="phase-kicker">{revote ? "Revote" : "Private ballot"}</p>
          <h2 id="vote-title">
            {spectator
              ? "You are watching the vote."
              : myVoteTarget
                ? "Ballot sealed."
                : revote
                  ? "Pick one of the tied players."
                  : "Who does not belong?"}
          </h2>
        </div>
        <span className="timer-chip">
          <ClockIcon size={15} />
          {remaining}s
        </span>
      </div>

      {spectator ? (
        <div className="vote-spectator">
          <ShieldIcon size={20} />
          <p>
            Eliminated players cannot vote. The count stays public; the ballots
            stay private.
          </p>
        </div>
      ) : myVoteTarget ? (
        <div className="vote-sealed">
          <LockIcon size={20} />
          <div>
            <p>
              Your vote is locked{sealedTarget ? ` on ${sealedTarget}` : ""}.
            </p>
            <span>No changes until the count.</span>
          </div>
        </div>
      ) : (
        <div className="vote-grid" role="group" aria-label="Vote candidates">
          {candidates.map((player) => {
            const self = player.id === meId;
            return (
              <button
                key={player.id}
                type="button"
                className="vote-option"
                disabled={!canVote || self}
                onClick={() => onVote(player.id)}
              >
                <span
                  className="vote-avatar"
                  style={{ background: `${player.color}24`, color: player.color }}
                  aria-hidden
                >
                  {player.nickname.slice(0, 1).toUpperCase()}
                </span>
                <span className="vote-name">
                  {player.nickname}
                  {self && <em>you</em>}
                </span>
                <span className="vote-mark" aria-hidden>
                  {self ? "—" : "Vote"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="vote-progress">
        <div className="vote-progress-copy">
          <span>Ballots in</span>
          <strong>
            {votesCast} / {eligibleVoters}
          </strong>
        </div>
        <div
          className="vote-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={eligibleVoters}
          aria-valuenow={votesCast}
        >
          <i style={{ width: `${percent}%` }} />
        </div>
        <p>No name is revealed until every ballot is in or the clock runs out.</p>
      </div>
    </section>
  );
}

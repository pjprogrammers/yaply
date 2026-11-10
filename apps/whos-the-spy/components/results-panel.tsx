"use client";

import type { Player, RoomSnapshot, SpyPublicState, SpyTeam } from "@yaply/shared/types";
import { CrownIcon, PlayIcon, RefreshIcon, ShieldIcon } from "./icons";

function reasonCopy(team: SpyTeam, reason: SpyPublicState["resultReason"]): string {
  switch (reason) {
    case "all-spies-eliminated":
      return "Every spy was voted out before the table ran out of civilians.";
    case "spies-reached-parity":
      return "The spies reached parity. The table can no longer outvote them.";
    case "final-guess-correct":
      return "The last spy named the civilian word and stole the win on the way out.";
    case "final-guess-wrong":
      return "The last spy guessed wrong. The civilians held the word.";
    case "final-guess-timeout":
      return "The last spy ran out of time on the final guess.";
    default:
      return team === "civilians" ? "The civilians held the room." : "The spies took the room.";
  }
}

function roleLabel(role: string | undefined): string {
  if (role === "spy") return "Spy";
  if (role === "civilian") return "Civilian";
  return "—";
}

export function ResultsPanel({
  snapshot,
  spy,
  meId,
  isHost,
  onRematch,
  onLobby,
}: {
  snapshot: RoomSnapshot;
  spy: SpyPublicState;
  meId: string | null;
  isHost: boolean;
  onRematch: () => void;
  onLobby: () => void;
}) {
  const team = spy.winnerTeam ?? "civilians";
  const roles = spy.roles ?? {};
  const rankings = snapshot.rankings ?? [];
  const byId = new Map(snapshot.players.map((player) => [player.id, player]));
  const ordered: Player[] =
    rankings.length > 0
      ? rankings
          .map((ranking) => byId.get(ranking.playerId))
          .filter((player): player is Player => Boolean(player))
      : snapshot.players;
  const scoreById = new Map(rankings.map((ranking) => [ranking.playerId, ranking.score]));
  const connected = snapshot.players.filter((player) => player.connected).length;
  const winningRole = team === "civilians" ? "civilian" : "spy";
  const ballots = spy.votes ?? [];
  const spyBallots = ballots.filter((vote) => roles[vote.targetId] === "spy").length;

  return (
    <div className="results">
      <section className={`results-hero results-hero--${team}`} aria-labelledby="results-title">
        <div className="results-hero-copy">
          <p className="results-kicker">
            <ShieldIcon size={15} />
            Case closed
          </p>
          <h2 id="results-title">
            {team === "civilians" ? "The civilians win." : "The spies win."}
          </h2>
          <p>{reasonCopy(team, spy.resultReason)}</p>
          {spy.finalGuessResult && (
            <p className="results-final-note">
              {spy.finalGuessResult.correct
                ? "The final guess was correct."
                : "The final guess missed."}
            </p>
          )}
        </div>
        <span className="results-stamp">{team === "civilians" ? "Civilians" : "Spies"}</span>
      </section>

      <div className="results-words">
        <article className="results-word results-word--civilian">
          <p>Civilian word</p>
          <h3>{spy.civilianWord}</h3>
          <span>{spy.categoryLabel}</span>
        </article>
        <article className="results-word results-word--spy">
          <p>Spy word</p>
          <h3>{spy.spyWord}</h3>
          <span>{spy.categoryLabel}</span>
        </article>
      </div>

      <div className="results-facts" aria-label="Match summary">
        <span>
          <b>{spy.round}</b> total {spy.round === 1 ? "round" : "rounds"}
        </span>
        <span>
          <b>{spyBallots}</b> correct {spyBallots === 1 ? "vote" : "votes"}
        </span>
        <span>
          <b>{ballots.length - spyBallots}</b> missed{" "}
          {ballots.length - spyBallots === 1 ? "vote" : "votes"}
        </span>
      </div>

      <section className="results-roster" aria-labelledby="roster-title">
        <div className="section-rail-head">
          <h2 id="roster-title">Every role, on the table</h2>
          <span>Ranked by score</span>
        </div>
        <div className="roster-grid">
          {ordered.map((player, index) => {
            const role = roles[player.id];
            return (
              <article
                key={player.id}
                className={[
                  "roster-player",
                  role === "spy" ? "is-spy" : "is-civilian",
                  player.id === meId ? "is-me" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="roster-rank">{index + 1}</span>
                <span
                  className="roster-avatar"
                  style={{ background: `${player.color}24`, color: player.color }}
                  aria-hidden
                >
                  {player.nickname.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p>
                    {player.nickname}
                    {player.id === snapshot.hostId && <CrownIcon size={11} />}
                  </p>
                  <span>
                    {roleLabel(role)}
                    {role && ` · ${role === winningRole ? "Won" : "Lost"}`}
                  </span>
                </div>
                <strong>{scoreById.get(player.id) ?? player.score}</strong>
              </article>
            );
          })}
        </div>
      </section>

      {spy.votes && spy.votes.length > 0 && (
        <details className="results-votes">
          <summary>
            <span>Vote ledger</span>
            <span>{spy.votes.length} ballots</span>
          </summary>
          <div className="results-votes-list">
            {spy.votes.map((vote, index) => (
              <p key={`${vote.voterId}-${vote.round}-${vote.revote}-${index}`}>
                <span className="vote-round">
                  R{vote.round}
                  {vote.revote ? " revote" : ""}
                </span>
                <strong>{byId.get(vote.voterId)?.nickname ?? "Unknown"}</strong>
                <span aria-hidden>→</span>
                <span>{byId.get(vote.targetId)?.nickname ?? "Unknown"}</span>
                <span
                  className={
                    roles[vote.targetId] === "spy"
                      ? "vote-result vote-result--hit"
                      : "vote-result vote-result--miss"
                  }
                >
                  {roles[vote.targetId] === "spy" ? "spy" : "missed"}
                </span>
              </p>
            ))}
          </div>
        </details>
      )}

      <section className="results-actions">
        {isHost ? (
          <>
            <button
              type="button"
              className="button button--large"
              onClick={onRematch}
              disabled={connected < 3}
            >
              <RefreshIcon size={16} />
              Rematch
            </button>
            <button type="button" className="button button--ghost button--large" onClick={onLobby}>
              Return to lobby
            </button>
            {connected < 3 && (
              <p className="results-action-note">
                At least three connected players are needed for a rematch.
              </p>
            )}
          </>
        ) : (
          <p className="results-waiting">
            <PlayIcon size={16} />
            Waiting for the host to start the next match.
          </p>
        )}
      </section>
    </div>
  );
}

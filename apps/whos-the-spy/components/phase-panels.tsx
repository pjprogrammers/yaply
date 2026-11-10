"use client";

import type {
  GamePhase,
  Player,
  SpyClue,
  SpyElimination,
} from "@yaply/shared/types";
import { MAX_SPY_CLUE_LENGTH } from "@yaply/shared/constants";
import { CheckIcon, ClockIcon, MicIcon, ShieldIcon } from "./icons";

function nicknames(players: Player[], ids: readonly string[]): string {
  return ids
    .map((id) => players.find((player) => player.id === id)?.nickname)
    .filter((name): name is string => Boolean(name))
    .join(", ");
}

export function PhaseHeader({
  phase,
  round,
  remaining,
  categoryLabel,
  speakerName,
}: {
  phase: GamePhase;
  round: number;
  remaining: number;
  categoryLabel: string | null;
  speakerName: string | null;
}) {
  const info = (() => {
    switch (phase) {
      case "lobby":
        return {
          kicker: "The lobby",
          title: "Fill the table.",
          sub: "Three players minimum. The host deals the cards when the room is ready.",
        };
      case "role-reveal":
        return {
          kicker: "Phase 1 · Role reveal",
          title: "Open your card.",
          sub: "Read it privately. The round starts when everyone is ready or the timer runs out.",
        };
      case "clue":
        return {
          kicker: `Phase 2 · Clue round ${round}`,
          title: speakerName ? `${speakerName} is on the clock.` : "Give one clue.",
          sub: "A truthful clue for your word. Vague enough that the spy cannot steal it.",
        };
      case "discussion":
        return {
          kicker: "Phase 3 · Discussion",
          title: "Talk it out.",
          sub: "Every clue is in. Compare them, press the players who sounded off.",
        };
      case "voting":
        return {
          kicker: "Phase 4 · Voting",
          title: "Seal a ballot.",
          sub: "One private vote. No self-votes, no changes once it is cast.",
        };
      case "revote":
        return {
          kicker: "Revote",
          title: "One tie to break.",
          sub: "Only the tied players are on the ballot. Another tie leaves nobody out.",
        };
      case "elimination":
        return {
          kicker: "The count",
          title: "The room has decided.",
          sub: "The eliminated player moves to the spectator channel.",
        };
      case "final-guess":
        return {
          kicker: "Final guess",
          title: speakerName ? `${speakerName} gets one guess.` : "One last guess.",
          sub: "Name the civilian word and the spies steal it. Miss and the civilians win.",
        };
      case "results":
        return {
          kicker: "Case closed",
          title: "Every card is on the table.",
          sub: "Both words, every role and every ballot, before the next match.",
        };
      default:
        return { kicker: "Who's the Spy", title: "The room is live.", sub: "" };
    }
  })();

  return (
    <header className="phase-head">
      <div className="phase-head-copy">
        <p className="phase-kicker">{info.kicker}</p>
        <h1>{info.title}</h1>
        <p className="phase-sub">{info.sub}</p>
      </div>
      <div className="phase-head-side">
        {categoryLabel && <span className="category-chip">{categoryLabel}</span>}
        {phase !== "lobby" && phase !== "results" && (
          <span
            className={[
              "timer-chip",
              remaining <= 10 ? "timer-chip--low" : "",
              remaining <= 0 ? "timer-chip--done" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ClockIcon size={15} />
            {remaining}s
          </span>
        )}
      </div>
    </header>
  );
}

export function CluePanel({
  players,
  clues,
  turnOrder,
  speakerId,
  meId,
  remaining,
  clueFormat,
  draft,
  onDraftChange,
  onSubmit,
}: {
  players: Player[];
  clues: SpyClue[];
  turnOrder: string[];
  speakerId: string | null;
  meId: string | null;
  remaining: number;
  clueFormat: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const myTurn = speakerId === meId;
  const speaker = players.find((player) => player.id === speakerId) ?? null;
  const spoken = new Set(clues.map((clue) => clue.playerId));

  return (
    <div className="clue-layout">
      <section className="clue-stage" aria-label="Clues">
        <div className="clue-stage-head">
          <div>
            <p className="phase-kicker">On the record</p>
            <h2>Clues so far</h2>
          </div>
          <span className="clue-count">
            {clues.length} / {turnOrder.length}
          </span>
        </div>

        {clues.length === 0 ? (
          <p className="clue-empty">
            {speaker ? `${speaker.nickname} opens the round.` : "Waiting for the first clue…"}
          </p>
        ) : (
          <ol className="clue-list">
            {clues.map((clue) => {
              const player = players.find((entry) => entry.id === clue.playerId);
              return (
                <li key={`${clue.playerId}-${clue.round}`}>
                  <span className="clue-name">
                    <i style={{ background: player?.color ?? "var(--amber)" }} />
                    {player?.nickname ?? "Unknown"}
                  </span>
                  <strong>{clue.text}</strong>
                </li>
              );
            })}
          </ol>
        )}

        {myTurn ? (
          <form
            className="clue-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <label htmlFor="clue-input" className="field-label">
              {clueFormat === "voice"
                ? "Say it out loud, or type it for the record"
                : clueFormat === "both"
                  ? "Say it out loud and type it for the record"
                  : "Type your clue"}
            </label>
            <div className="clue-input-row">
              <input
                id="clue-input"
                className="input"
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                maxLength={MAX_SPY_CLUE_LENGTH}
                placeholder="One word or a short phrase"
                autoComplete="off"
                autoFocus
              />
              <button
                className="button"
                type="submit"
                disabled={draft.trim().length === 0 || remaining <= 0}
              >
                Give clue
              </button>
            </div>
            <p className="clue-warning">
              <ShieldIcon size={13} />
              Either secret word is blocked. So is spelling it out.
            </p>
          </form>
        ) : (
          <div className="clue-waiting">
            <i />
            {speaker ? `${speaker.nickname} gives the next clue…` : "Moving to discussion…"}
          </div>
        )}
      </section>

      <section className="turn-card" aria-labelledby="turn-title">
        <div className="rail-head">
          <h2 id="turn-title">Turn order</h2>
          <span className="rail-count">Round {clues[0]?.round ?? 1}</span>
        </div>
        <ol className="turn-list">
          {turnOrder.map((id, index) => {
            const player = players.find((entry) => entry.id === id);
            const isSpeaker = id === speakerId;
            const hasSpoken = spoken.has(id);
            return (
              <li
                key={id}
                className={[
                  isSpeaker ? "is-speaking" : "",
                  hasSpoken ? "is-done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="turn-index">{hasSpoken ? <CheckIcon size={12} /> : index + 1}</span>
                <span className="turn-name">
                  {player?.nickname ?? "Unknown"}
                  {id === meId && <em>you</em>}
                </span>
                {isSpeaker && <span className="turn-tag">speaking</span>}
                {hasSpoken && !isSpeaker && <span className="turn-tag turn-tag--done">clue in</span>}
              </li>
            );
          })}
        </ol>
        <p className="turn-note">
          <MicIcon size={13} />
          {clueFormat === "text"
            ? "Typed clues only in this room."
            : "Voice is the main channel; typed clues are on the record."}
        </p>
      </section>
    </div>
  );
}

export function DiscussionPanel({
  players,
  clues,
  remaining,
}: {
  players: Player[];
  clues: SpyClue[];
  remaining: number;
}) {
  return (
    <div className="discussion-layout">
      <section className="discussion-stage">
        <p className="phase-kicker">Every clue, side by side</p>
        <h2>Whose word does not fit?</h2>
        <p className="discussion-copy">
          The vote opens when the clock hits zero. Use the chat and voice channel
          to press the players whose clues sounded borrowed.
        </p>
        <div className="discussion-timer">
          <span>Voting opens in</span>
          <strong>{remaining}s</strong>
        </div>
      </section>

      <section className="discussion-clues" aria-labelledby="discussion-clues-title">
        <div className="rail-head">
          <h2 id="discussion-clues-title">Clues on the table</h2>
          <span className="rail-count">{clues.length} given</span>
        </div>
        <ul>
          {clues.map((clue) => {
            const player = players.find((entry) => entry.id === clue.playerId);
            return (
              <li key={`${clue.playerId}-${clue.round}`}>
                <span style={{ color: player?.color }}>{player?.nickname ?? "Unknown"}</span>
                <strong>{clue.text}</strong>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function EliminationPanel({
  players,
  elimination,
  remaining,
}: {
  players: Player[];
  elimination: SpyElimination | null;
  remaining: number;
}) {
  const player = elimination
    ? players.find((entry) => entry.id === elimination.playerId) ?? null
    : null;

  if (!elimination) {
    return (
      <section className="elimination-card elimination-card--none">
        <p className="phase-kicker">Tied revote</p>
        <h2>Nobody leaves.</h2>
        <p>
          The revote tied as well. The room moves straight into the next clue
          round with every living player still in.
        </p>
        <span className="elimination-timer">Next clue round in {remaining}s</span>
      </section>
    );
  }

  return (
    <section className="elimination-card" aria-labelledby="elimination-title">
      <p className="phase-kicker">
        {elimination.viaRevote ? "Eliminated on the revote" : "Eliminated"}
      </p>
      <div className="elimination-player">
        <span
          className="elimination-avatar"
          style={{ background: `${player?.color ?? "#f2b33d"}24`, color: player?.color }}
          aria-hidden
        >
          {(player?.nickname ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h2 id="elimination-title">{player?.nickname ?? "Unknown player"}</h2>
          <p>
            {elimination.role
              ? elimination.role === "spy"
                ? "was a spy."
                : "was a civilian."
              : "leaves the table. Their role stays sealed until the result screen."}
          </p>
        </div>
      </div>
      <p className="elimination-note">
        They keep their seat and can talk in the spectator channel.
      </p>
      <span className="elimination-timer">Next phase in {remaining}s</span>
    </section>
  );
}

export function FinalGuessPanel({
  player,
  isMe,
  remaining,
  draft,
  onChange,
  onSubmit,
  failed,
}: {
  player: Player | null;
  isMe: boolean;
  remaining: number;
  draft: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  failed: boolean;
}) {
  return (
    <section className="final-card" aria-labelledby="final-title">
      <div className="final-card-head">
        <p className="phase-kicker">The last spy</p>
        <h2 id="final-title">
          {isMe ? "Name the civilian word." : `${player?.nickname ?? "The last spy"} has one guess.`}
        </h2>
        <p>
          {isMe
            ? "One typed guess. Case, spacing and punctuation do not matter. Get it right and the spies steal the win."
            : "The room waits. A correct guess flips the result; a miss ends it for the spies."}
        </p>
      </div>

      <span className={remaining <= 10 ? "final-timer is-low" : "final-timer"}>{remaining}s</span>

      {isMe ? (
        <form
          className="final-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label htmlFor="final-guess" className="field-label">
            Civilian word
          </label>
          <div className="final-input-row">
            <input
              id="final-guess"
              className="input"
              value={draft}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Type the word"
              autoComplete="off"
              autoFocus
              disabled={failed}
            />
            <button
              className="button"
              type="submit"
              disabled={failed || draft.trim().length === 0 || remaining <= 0}
            >
              Lock guess
            </button>
          </div>
        </form>
      ) : (
        <div className="final-waiting">
          <i />
          Watching the final guess…
        </div>
      )}
    </section>
  );
}

export function spectatorNames(players: Player[], eliminatedIds: string[]): string {
  return nicknames(players, eliminatedIds);
}

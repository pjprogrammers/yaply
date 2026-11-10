"use client";

import type { GameSettings, Player } from "@yaply/shared/types";
import {
  SPY_CATEGORIES,
  SPY_MAX_PLAYERS,
  autoSpyCount,
  maxSpyCount,
  SPY_MIN_PLAYERS,
} from "@yaply/shared/constants";
import { CheckIcon, ClockIcon, CopyIcon, PlayIcon, UsersIcon } from "./icons";

export function LobbyIntro({
  code,
  copied,
  onCopy,
  players,
  connectedCount,
  isHost,
  settings,
  onStart,
}: {
  code: string;
  copied: boolean;
  onCopy: () => void;
  players: Player[];
  connectedCount: number;
  isHost: boolean;
  settings: GameSettings;
  onStart: () => void;
}) {
  const missing = Math.max(0, SPY_MIN_PLAYERS - connectedCount);
  const disconnected = players.length - connectedCount;
  const requested = settings.spyCount ?? 0;
  const spies =
    requested === 0
      ? autoSpyCount(Math.max(connectedCount, SPY_MIN_PLAYERS))
      : Math.min(requested, maxSpyCount(Math.max(connectedCount, SPY_MIN_PLAYERS)));
  const categories = settings.spyCategories ?? ["mixed"];
  const categoryLabel = categories.includes("mixed")
    ? "All categories"
    : `${categories.length} ${categories.length === 1 ? "category" : "categories"}`;

  return (
    <div className="lobby-intro">
      <section className="invite-card" aria-labelledby="invite-title">
        <p className="phase-kicker">Case {code.toUpperCase()}</p>
        <h2 id="invite-title">Send one link.</h2>
        <p>Everyone opens the same room, picks a name and gets a private card.</p>

        <div className="invite-code-row">
          <strong className="invite-code">{code.toUpperCase()}</strong>
          <button type="button" className="button button--small" onClick={onCopy}>
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        </div>

        <div className="invite-facts">
          <span>
            <UsersIcon size={14} />
            {players.length} seated
          </span>
          <span>
            <ClockIcon size={14} />
            {settings.spyClueSeconds ?? 45}s clues
          </span>
          <span>{categoryLabel}</span>
        </div>
      </section>

      <section className="start-card" aria-labelledby="start-title">
        <p className="phase-kicker">Host controls</p>
        <h2 id="start-title">
          {connectedCount < SPY_MIN_PLAYERS
            ? `${missing} more ${missing === 1 ? "player" : "players"}.`
            : "The table is ready."}
        </h2>
        <p>
          {isHost
            ? "The server deals roles and words once. Make sure everyone can see their own screen."
            : "The host deals the cards. Your role arrives privately, on this screen only."}
        </p>

        <dl className="start-facts">
          <div>
            <dt>Spies</dt>
            <dd>{spies === 1 ? "1 spy" : `${spies} spies`}</dd>
          </div>
          <div>
            <dt>Players</dt>
            <dd>
              {connectedCount} / {SPY_MAX_PLAYERS}
            </dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd className="capitalize">{settings.spyDifficulty ?? "normal"}</dd>
          </div>
          <div>
            <dt>Final guess</dt>
            <dd>{settings.spyFinalGuess === false ? "Off" : "On"}</dd>
          </div>
        </dl>

        {isHost ? (
          <button
            type="button"
            className="button button--large start-button"
            onClick={onStart}
            disabled={connectedCount < SPY_MIN_PLAYERS || disconnected > 0}
          >
            <PlayIcon size={16} />
            Deal the cards
          </button>
        ) : (
          <div className="start-waiting">
            <i />
            Waiting for the host to deal…
          </div>
        )}

        {disconnected > 0 && (
          <p className="start-note">
            {disconnected} seated {disconnected === 1 ? "player is" : "players are"} reconnecting.
            The host can deal when everyone is back.
          </p>
        )}
      </section>
    </div>
  );
}

export function LobbyRules({ settings }: { settings: GameSettings }) {
  const categories = settings.spyCategories ?? ["mixed"];
  const labels = categories.includes("mixed")
    ? "All 20 categories"
    : categories
        .map((id) => SPY_CATEGORIES.find((category) => category.id === id)?.label ?? id)
        .join(", ");
  const requested = settings.spyCount ?? 0;

  const rows: [string, string][] = [
    ["Word bank", labels],
    ["Difficulty", settings.spyDifficulty ?? "normal"],
    ["Spies", requested === 0 ? "Automatic" : String(requested)],
    ["Clue turn", `${settings.spyClueSeconds ?? 45}s`],
    ["Discussion", `${settings.spyDiscussionSeconds ?? 45}s`],
    ["Voting", `${settings.spyVotingSeconds ?? 30}s`],
    ["Clue format", settings.spyClueFormat ?? "both"],
    ["Final spy guess", settings.spyFinalGuess === false ? "Off" : "On"],
    ["Role on elimination", settings.spyRoleReveal === false ? "Sealed" : "Revealed"],
    ["Text chat", settings.spyTextChat === false ? "Off" : "On"],
    ["Voice chat", settings.spyVoiceChat === false ? "Off" : "On"],
    ["Spectator chat", settings.spySpectatorChat === true ? "On" : "Off"],
  ];

  return (
    <dl className="rules-readout">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={label === "Difficulty" ? "capitalize" : undefined}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

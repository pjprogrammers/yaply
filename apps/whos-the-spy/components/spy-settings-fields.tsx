"use client";

import {
  SPY_CATEGORIES,
  SPY_CLUE_FORMATS,
  SPY_CLUE_SECONDS,
  SPY_DIFFICULTIES,
  SPY_DISCUSSION_SECONDS,
  SPY_VOTING_SECONDS,
  autoSpyCount,
  maxSpyCount,
} from "@yaply/shared/constants";
import type { SpyClueFormat, SpyDifficulty } from "@yaply/shared/types";
import type { LocalSpyConfig } from "@/lib/spy-settings";

type Props = {
  value: LocalSpyConfig;
  onChange: (patch: Partial<LocalSpyConfig>) => void;
  playerCount?: number;
};

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="toggle"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span className="toggle-track" aria-hidden />
    </button>
  );
}

export function SpySettingsFields({ value, onChange, playerCount }: Props) {
  const spyCeiling = maxSpyCount(playerCount ?? 12);
  const auto = autoSpyCount(playerCount ?? 6);
  const spyOptions = [0, 1, 2, 3].filter((count) => count === 0 || count <= spyCeiling);

  const selectCategory = (id: string) => {
    if (id === "mixed") {
      onChange({ categories: ["mixed"] });
      return;
    }
    const current = value.categories.includes("mixed") ? [] : value.categories;
    const next = current.includes(id)
      ? current.filter((entry) => entry !== id)
      : [...current, id];
    onChange({ categories: next.length > 0 ? next : ["mixed"] });
  };

  return (
    <div>
      <section className="setup-block">
        <div className="setup-block-head">
          <h2>Categories</h2>
          <p>{value.categories.includes("mixed") ? "Every category" : `${value.categories.length} selected`}</p>
        </div>
        <div className="chip-grid" role="group" aria-label="Word categories">
          {SPY_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className="chip"
              aria-pressed={value.categories.includes(category.id)}
              title={category.hint}
              onClick={() => selectCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="setup-block">
        <div className="setup-block-head">
          <h2>Difficulty</h2>
          <p>How close the two words sit</p>
        </div>
        <div className="segmented" role="group" aria-label="Difficulty">
          {SPY_DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty.id}
              type="button"
              aria-pressed={value.difficulty === difficulty.id}
              title={difficulty.hint}
              onClick={() => onChange({ difficulty: difficulty.id as SpyDifficulty })}
            >
              {difficulty.label}
            </button>
          ))}
        </div>
      </section>

      <section className="setup-block">
        <div className="setup-block-head">
          <h2>Spies</h2>
          <p>
            {playerCount
              ? `${playerCount} players · up to ${spyCeiling}`
              : "Civilians always keep the majority"}
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Spy count">
          {spyOptions.map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={value.spyCount === count}
              onClick={() => onChange({ spyCount: count })}
            >
              {count === 0 ? `Auto${playerCount ? ` (${auto})` : ""}` : String(count)}
            </button>
          ))}
        </div>
      </section>

      <section className="setup-block">
        <div className="setup-block-head">
          <h2>Timers</h2>
          <p>Seconds per phase</p>
        </div>
        <div className="range-row">
          <label htmlFor="spy-clue-seconds">Clue turn</label>
          <output htmlFor="spy-clue-seconds">{value.clueSeconds}s</output>
          <input
            id="spy-clue-seconds"
            type="range"
            min={SPY_CLUE_SECONDS.min}
            max={SPY_CLUE_SECONDS.max}
            step={5}
            value={value.clueSeconds}
            onChange={(event) => onChange({ clueSeconds: Number(event.target.value) })}
          />
        </div>
        <div className="range-row">
          <label htmlFor="spy-discussion-seconds">Discussion</label>
          <output htmlFor="spy-discussion-seconds">{value.discussionSeconds}s</output>
          <input
            id="spy-discussion-seconds"
            type="range"
            min={SPY_DISCUSSION_SECONDS.min}
            max={SPY_DISCUSSION_SECONDS.max}
            step={5}
            value={value.discussionSeconds}
            onChange={(event) => onChange({ discussionSeconds: Number(event.target.value) })}
          />
        </div>
        <div className="range-row">
          <label htmlFor="spy-voting-seconds">Voting</label>
          <output htmlFor="spy-voting-seconds">{value.votingSeconds}s</output>
          <input
            id="spy-voting-seconds"
            type="range"
            min={SPY_VOTING_SECONDS.min}
            max={SPY_VOTING_SECONDS.max}
            step={5}
            value={value.votingSeconds}
            onChange={(event) => onChange({ votingSeconds: Number(event.target.value) })}
          />
        </div>
      </section>

      <section className="setup-block">
        <div className="setup-block-head">
          <h2>Clue format</h2>
          <p>Text is always enforced</p>
        </div>
        <div className="segmented" role="group" aria-label="Clue format">
          {SPY_CLUE_FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              aria-pressed={value.clueFormat === format.id}
              title={format.hint}
              onClick={() => onChange({ clueFormat: format.id as SpyClueFormat })}
            >
              {format.label}
            </button>
          ))}
        </div>
      </section>

      <section className="setup-block">
        <div className="setup-block-head">
          <h2>Room rules</h2>
          <p>Set before the first card</p>
        </div>
        <div className="toggle-grid">
          <Toggle
            label="Final spy guess"
            checked={value.finalGuess}
            onChange={(next) => onChange({ finalGuess: next })}
          />
          <Toggle
            label="Reveal role on elimination"
            checked={value.roleReveal}
            onChange={(next) => onChange({ roleReveal: next })}
          />
          <Toggle
            label="Text chat"
            checked={value.textChat}
            onChange={(next) => onChange({ textChat: next })}
          />
          <Toggle
            label="Voice chat"
            checked={value.voiceChat}
            onChange={(next) => onChange({ voiceChat: next })}
          />
          <Toggle
            label="Spectator chat"
            checked={value.spectatorChat}
            onChange={(next) => onChange({ spectatorChat: next })}
          />
        </div>
      </section>
    </div>
  );
}

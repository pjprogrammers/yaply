"use client";

import { useState } from "react";
import {
  CHAIN_BOARD_PRESETS,
  CHAIN_BOARD_SIZE_IDS,
  CHAIN_PALETTES,
  CHAIN_THEMES,
  CPU_DIFFICULTIES,
  resolveChainPalette,
  sanitizeHexColor,
} from "@yaply/shared/constants";
import type {
  ChainBoardSize,
  ChainPaletteId,
  ChainTheme,
  CpuDifficulty,
  GameSettings,
} from "@yaply/shared/types";
import { Segmented } from "./segmented";

type SettingsFieldsProps = {
  value: GameSettings;
  onChange: (patch: Partial<GameSettings>) => void;
  disabled?: boolean;
  showCpu?: boolean;
  showTurnClock?: boolean;
};

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? "toggle-row--disabled" : ""}`}>
      <span className="toggle-copy">
        <span className="setting-label">{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden>
        <i />
      </span>
    </label>
  );
}

function OptionCards<T extends string>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T;
  options: { id: T; label: string; hint: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="option-cards" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="option-card"
          aria-pressed={option.id === value}
          disabled={disabled}
          onClick={() => onChange(option.id)}
        >
          <span className="option-card-title">{option.label}</span>
          <span className="option-card-hint">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

export function ChainSettingsFields({
  value,
  onChange,
  disabled = false,
  showCpu = false,
  showTurnClock = false,
}: SettingsFieldsProps) {
  const [paletteError, setPaletteError] = useState("");
  const playerCount = Math.max(2, Math.min(8, value.playerCount ?? value.maxPlayers ?? 4));
  const palette = value.palette ?? "classic";
  const colors = resolveChainPalette(palette, value.customColors);
  const customColors = colors.slice(0, playerCount);

  const setCustomColor = (index: number, next: string) => {
    const color = sanitizeHexColor(next);
    if (!color) return;
    if (customColors.some((entry, entryIndex) => entryIndex !== index && entry === color)) {
      setPaletteError("Each player needs a different colour.");
      return;
    }
    setPaletteError("");
    const updated = [...customColors];
    updated[index] = color;
    onChange({ palette: "custom", customColors: updated });
  };

  return (
    <div className="settings-list">
      <div className="setting-row setting-row--stack">
        <div className="setting-row-head">
          <span className="setting-label">Players</span>
          <span className="setting-value num">{playerCount}</span>
        </div>
        <Segmented
          label="Player count"
          value={playerCount}
          wrap
          disabled={disabled}
          options={Array.from({ length: 7 }, (_, index) => {
            const count = index + 2;
            return { label: String(count), value: count };
          })}
          onChange={(count) => onChange({ playerCount: count, maxPlayers: count })}
        />
      </div>

      <div className="setting-row setting-row--stack">
        <div className="setting-row-head">
          <span className="setting-label">Board size</span>
          <span className="setting-value">
            {CHAIN_BOARD_PRESETS[value.boardSize ?? "medium"].rows} ×{" "}
            {CHAIN_BOARD_PRESETS[value.boardSize ?? "medium"].cols}
          </span>
        </div>
        <Segmented
          label="Board size"
          value={value.boardSize ?? "medium"}
          wrap
          disabled={disabled}
          options={CHAIN_BOARD_SIZE_IDS.map((id) => ({
            label: CHAIN_BOARD_PRESETS[id].label,
            value: id,
          }))}
          onChange={(boardSize: ChainBoardSize) => onChange({ boardSize })}
        />
      </div>

      <div className="setting-row setting-row--stack">
        <div className="setting-row-head">
          <span className="setting-label">Colour palette</span>
          <span className="setting-value">
            {palette === "custom"
              ? "Custom"
              : CHAIN_PALETTES.find((entry) => entry.id === palette)?.name ?? "Classic"}
          </span>
        </div>
        <div className="palette-grid" role="group" aria-label="Colour palette">
          {CHAIN_PALETTES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="palette-option"
              aria-pressed={palette === entry.id}
              disabled={disabled}
              onClick={() => {
                setPaletteError("");
                onChange({ palette: entry.id as ChainPaletteId });
              }}
            >
              <span className="palette-swatches" aria-hidden>
                {entry.colors.slice(0, 4).map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <span>{entry.name}</span>
            </button>
          ))}
          <button
            type="button"
            className="palette-option"
            aria-pressed={palette === "custom"}
            disabled={disabled}
            onClick={() => {
              setPaletteError("");
              onChange({
                palette: "custom",
                customColors: resolveChainPalette("custom", value.customColors).slice(0, playerCount),
              });
            }}
          >
            <span className="palette-swatches palette-swatches--custom" aria-hidden>
              <i style={{ background: "#4cb3f0" }} />
              <i style={{ background: "#f2b33d" }} />
              <i style={{ background: "#e5484d" }} />
              <i style={{ background: "#c6f24e" }} />
            </span>
            <span>Custom</span>
          </button>
        </div>

        {palette === "custom" && (
          <div className="custom-colors">
            {customColors.map((color, index) => (
              <label className="color-field" key={index}>
                <span>P{index + 1}</span>
                <input
                  type="color"
                  value={color}
                  disabled={disabled}
                  aria-label={`Player ${index + 1} colour`}
                  onChange={(event) => setCustomColor(index, event.target.value)}
                />
              </label>
            ))}
            {paletteError && <p className="setting-hint setting-hint--error">{paletteError}</p>}
          </div>
        )}
      </div>

      <div className="setting-row setting-row--stack">
        <div className="setting-row-head">
          <span className="setting-label">Theme</span>
        </div>
        <OptionCards
          label="Theme"
          value={(value.theme ?? "dark") as ChainTheme}
          options={CHAIN_THEMES}
          disabled={disabled}
          onChange={(theme) => onChange({ theme })}
        />
      </div>

      <ToggleRow
        label="Confirm moves (tap twice)"
        hint="First tap selects a cell, second tap commits the orb."
        checked={value.confirmMoves ?? false}
        disabled={disabled}
        onChange={(confirmMoves) => onChange({ confirmMoves })}
      />

      {showCpu && (
        <>
          <ToggleRow
            label="Play vs CPU"
            hint="Fill the remaining seats with computer opponents."
            checked={value.vsCpu ?? false}
            disabled={disabled}
            onChange={(vsCpu) => onChange({ vsCpu })}
          />
          <div className={`setting-row setting-row--stack ${value.vsCpu ? "" : "setting-row--muted"}`}>
            <div className="setting-row-head">
              <span className="setting-label">CPU difficulty</span>
              <span className="setting-value">
                {CPU_DIFFICULTIES.find((entry) => entry.id === (value.cpuDifficulty ?? "medium"))?.label ??
                  "Medium"}
              </span>
            </div>
            <Segmented
              label="CPU difficulty"
              value={value.cpuDifficulty ?? "medium"}
              disabled={disabled || !value.vsCpu}
              options={CPU_DIFFICULTIES.map((entry) => ({
                label: entry.label,
                value: entry.id,
              }))}
              onChange={(cpuDifficulty: CpuDifficulty) => onChange({ cpuDifficulty })}
            />
            <p className="setting-hint">
              {CPU_DIFFICULTIES.find((entry) => entry.id === (value.cpuDifficulty ?? "medium"))?.hint}
            </p>
          </div>
        </>
      )}

      {showTurnClock && (
        <div className="setting-row setting-row--stack">
          <div className="setting-row-head">
            <span className="setting-label">Turn clock</span>
            <span className="setting-value num">{value.turnTimeSeconds ?? 45}s</span>
          </div>
          <Segmented
            label="Turn clock"
            value={value.turnTimeSeconds ?? 45}
            disabled={disabled}
            options={[
              { label: "30s", value: 30 },
              { label: "45s", value: 45 },
              { label: "60s", value: 60 },
            ]}
            onChange={(turnTimeSeconds) => onChange({ turnTimeSeconds })}
          />
        </div>
      )}
    </div>
  );
}

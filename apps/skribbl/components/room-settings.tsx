"use client";

import type { GameSettings } from "@yaply/shared/types";
import { WORD_LANGUAGES } from "@yaply/shared/constants";
import { Segmented } from "./segmented";

type RoomSettingsFieldsProps = {
  settings: GameSettings;
  isHost: boolean;
  onChange: (patch: Partial<GameSettings>) => void;
  maxPlayersFloor?: number;
};

/**
 * Shared settings controls for the lobby card and the in-game settings sheet.
 * Non-hosts see the same values read-only so the rules are never a mystery.
 */
export function RoomSettingsFields({
  settings,
  isHost,
  onChange,
  maxPlayersFloor = 0,
}: RoomSettingsFieldsProps) {
  return (
    <div className="settings-list">
      <div className="setting-row">
        <span className="setting-label">Language</span>
        {isHost ? (
          <Segmented
            label="Word language"
            value={settings.language}
            options={WORD_LANGUAGES.map(({ id, nativeLabel }) => ({
              label: nativeLabel,
              value: id,
            }))}
            onChange={(value) => onChange({ language: value })}
          />
        ) : (
          <span className="setting-value">
            {WORD_LANGUAGES.find((entry) => entry.id === settings.language)?.nativeLabel ??
              "English"}
          </span>
        )}
      </div>
      <div className="setting-row">
        <span className="setting-label">Rounds</span>
        {isHost ? (
          <Segmented
            label="Rounds"
            value={settings.rounds}
            options={[
              { label: "2", value: 2 },
              { label: "3", value: 3 },
              { label: "5", value: 5 },
            ]}
            onChange={(value) => onChange({ rounds: value })}
          />
        ) : (
          <span className="setting-value">{settings.rounds}</span>
        )}
      </div>
      <div className="setting-row">
        <span className="setting-label">Draw time</span>
        {isHost ? (
          <Segmented
            label="Draw time"
            value={settings.drawingTimeSeconds}
            options={[
              { label: "60s", value: 60 },
              { label: "80s", value: 80 },
              { label: "120s", value: 120 },
            ]}
            onChange={(value) => onChange({ drawingTimeSeconds: value })}
          />
        ) : (
          <span className="setting-value">{settings.drawingTimeSeconds}s</span>
        )}
      </div>
      <div className="setting-row">
        <span className="setting-label">Word choices</span>
        {isHost ? (
          <Segmented
            label="Word choices"
            value={settings.wordCount ?? 3}
            options={[
              { label: "2", value: 2 },
              { label: "3", value: 3 },
              { label: "4", value: 4 },
              { label: "5", value: 5 },
            ]}
            onChange={(value) => onChange({ wordCount: value })}
          />
        ) : (
          <span className="setting-value">{settings.wordCount ?? 3}</span>
        )}
      </div>
      <div className="setting-row">
        <span className="setting-label">Max players</span>
        {isHost ? (
          <Segmented
            label="Max players"
            value={settings.maxPlayers}
            options={[
              { label: "4", value: 4 },
              { label: "8", value: 8 },
              { label: "12", value: 12 },
            ]}
            onChange={(value) =>
              onChange({ maxPlayers: Math.max(value, maxPlayersFloor) })
            }
          />
        ) : (
          <span className="setting-value">{settings.maxPlayers}</span>
        )}
      </div>
    </div>
  );
}

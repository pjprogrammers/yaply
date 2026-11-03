"use client";

import Link from "next/link";
import { useState } from "react";
import { KART_COLORS } from "@/game/constants";
import { MAP_LIST } from "@/game/maps";
import {
  BOT_OPTIONS,
  DURATION_OPTIONS,
  KILL_OPTIONS,
  NAME_MAX,
  normalizeSettings,
  type PlayerSettings,
} from "@/lib/settings";

interface LobbyProps {
  initial: PlayerSettings;
  onStart: (settings: PlayerSettings) => void;
}

export function Lobby({ initial, onStart }: LobbyProps) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [mapId, setMapId] = useState(initial.mapId);
  const [botCount, setBotCount] = useState(initial.botCount);
  const [killTarget, setKillTarget] = useState(initial.killTarget);
  const [duration, setDuration] = useState(initial.duration);

  const selected = MAP_LIST.find((map) => map.id === mapId) ?? MAP_LIST[0];
  const paint = KART_COLORS.find((entry) => entry.hex === color) ?? KART_COLORS[0];

  function submit() {
    onStart(normalizeSettings({ name, color, mapId, botCount, killTarget, duration }));
  }

  return (
    <div className="lobby">
      <div className="margins">
        <header className="lobby-head">
          <Link href="/" className="nav-word">
            Kart Riot
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <span className="hidden text-ash sm:inline">Garage</span>
            <Link href="/" className="font-semibold hover:text-warning">
              Back to site
            </Link>
          </div>
        </header>

        <div className="pb-6 pt-3">
          <h1 className="display text-[clamp(54px,9vw,112px)]">Garage</h1>
          <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-ash sm:text-base">
            Pick a paint, a map, and a bot count. Everything is local, nothing is
            ranked, and the only rule is to keep moving.
          </p>
        </div>

        <form
          className="lobby-grid"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="lobby-panel">
            <label className="lobby-field">
              <span>Driver name</span>
              <input
                className="text-input"
                value={name}
                maxLength={NAME_MAX}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <div className="lobby-field">
              <span id="paint-label">Paint</span>
              <div className="paint-options" role="group" aria-labelledby="paint-label">
                {KART_COLORS.map((entry) => (
                  <button
                    key={entry.hex}
                    type="button"
                    className={`paint-option ${entry.hex === color ? "is-active" : ""}`}
                    style={{ backgroundColor: entry.hex }}
                    aria-label={entry.name}
                    aria-pressed={entry.hex === color}
                    title={entry.name}
                    onClick={() => setColor(entry.hex)}
                  />
                ))}
              </div>
              <span className="hud-label">Selected: {paint.name}</span>
            </div>

            <div className="lobby-field">
              <span id="map-label">Arena</span>
              <div className="grid gap-1.5" role="group" aria-labelledby="map-label">
                {MAP_LIST.map((map) => (
                  <button
                    key={map.id}
                    type="button"
                    className={`map-choice ${map.id === mapId ? "is-active" : ""}`}
                    aria-pressed={map.id === mapId}
                    onClick={() => setMapId(map.id)}
                  >
                    <span className="map-choice-thumb">
                      <img src={`/media/${map.id}.jpg`} alt="" width={132} height={88} loading="lazy" />
                    </span>
                    <span>
                      <strong>{map.name}</strong>
                      <span>{map.tagline}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-field">
              <span id="bots-label">Bots</span>
              <div className="choice-row" role="group" aria-labelledby="bots-label">
                {BOT_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`choice ${value === botCount ? "is-active" : ""}`}
                    aria-pressed={value === botCount}
                    onClick={() => setBotCount(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-field">
              <span id="target-label">Wrecks to win</span>
              <div className="choice-row" role="group" aria-labelledby="target-label">
                {KILL_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`choice ${value === killTarget ? "is-active" : ""}`}
                    aria-pressed={value === killTarget}
                    onClick={() => setKillTarget(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-field mb-0">
              <span id="duration-label">Match length</span>
              <div className="choice-row" role="group" aria-labelledby="duration-label">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`choice ${option.value === duration ? "is-active" : ""}`}
                    aria-pressed={option.value === duration}
                    onClick={() => setDuration(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lobby-preview">
            <div className="lobby-preview-image">
              <img
                src={`/media/${selected.id}.jpg`}
                alt={`Preview of the ${selected.name} arena.`}
                width={1280}
                height={720}
              />
              <span className="hero-caption">{selected.tagline}</span>
            </div>
            <div className="lobby-preview-body">
              <p className="hud-label">Selected arena</p>
              <h2 className="display text-[clamp(38px,5vw,58px)]">{selected.name}</h2>
              <p className="-mt-2 max-w-[46ch] text-sm leading-relaxed text-ash">
                {selected.description}
              </p>
              <dl className="grid w-full grid-cols-3 gap-2">
                <div>
                  <dt className="hud-label">Footprint</dt>
                  <dd className="display text-xl">{selected.size}m</dd>
                </div>
                <div>
                  <dt className="hud-label">Hard cover</dt>
                  <dd className="display text-xl">{selected.obstacles.length}</dd>
                </div>
                <div>
                  <dt className="hud-label">Boost pads</dt>
                  <dd className="display text-xl">{selected.boostPads.length}</dd>
                </div>
              </dl>
              <button type="submit" className="button button-primary w-full sm:w-auto">
                Enter the arena
                <span aria-hidden="true">→</span>
              </button>
              <p className="text-xs leading-relaxed text-ash">
                {botCount} bots · first to {killTarget} · {duration / 60} minute
                {duration === 60 ? "" : "s"} · keyboard and mouse. Press Esc to pause.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

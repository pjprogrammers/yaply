"use client";

import Link from "next/link";
import { useState } from "react";
import { KART_COLORS } from "@/game/constants";
import { MAP_LIST } from "@/game/maps";
import { MAIN_URL } from "@/lib/config";
import {
  BOT_OPTIONS,
  DURATION_OPTIONS,
  KILL_OPTIONS,
  NAME_MAX,
  normalizeSettings,
  type PlayerSettings,
} from "@/lib/settings";

type LobbyMode = "bots" | "online";

interface LobbyProps {
  initial: PlayerSettings;
  onStart: (settings: PlayerSettings) => void;
  onCreateRoom: (settings: PlayerSettings) => Promise<void>;
  onJoinRoom: (code: string, settings: PlayerSettings) => void;
}

export function Lobby({ initial, onStart, onCreateRoom, onJoinRoom }: LobbyProps) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [mapId, setMapId] = useState(initial.mapId);
  const [botCount, setBotCount] = useState(initial.botCount);
  const [killTarget, setKillTarget] = useState(initial.killTarget);
  const [duration, setDuration] = useState(initial.duration);
  const [mode, setMode] = useState<LobbyMode>("bots");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const selected = MAP_LIST.find((map) => map.id === mapId) ?? MAP_LIST[0];
  const paint = KART_COLORS.find((entry) => entry.hex === color) ?? KART_COLORS[0];

  function currentSettings() {
    return normalizeSettings({ name, color, mapId, botCount, killTarget, duration });
  }

  function submit() {
    onStart(currentSettings());
  }

  async function createRoom() {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      await onCreateRoom(currentSettings());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the room.");
      setCreating(false);
    }
  }

  function joinRoom() {
    const code = joinCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (code.length !== 6) {
      setError("Enter the six-character room code.");
      return;
    }
    setError("");
    onJoinRoom(code, currentSettings());
  }

  return (
    <div className="lobby">
      <div className="margins">
        <header className="lobby-head">
          <Link href="/" className="nav-word">
            Smash Karts
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <span className="hidden text-ash sm:inline">Garage</span>
            <a href={MAIN_URL} className="font-semibold hover:text-warning">
              Back to Yaply
            </a>
          </div>
        </header>

        <div className="pb-6 pt-3">
          <h1 className="display text-[clamp(54px,9vw,112px)]">Garage</h1>
          <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-ash sm:text-base">
            Pick a paint, a map, and a bot count for a local scrap. Or open a room,
            share the code, and let up to 40 friends pile in — late arrivals can
            join a match already in progress.
          </p>
        </div>

        <form
          className="lobby-grid"
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === "bots") {
              submit();
            } else if (joinCode.trim()) {
              // Enter only joins when a code has been typed. Otherwise it
              // should not fire an empty-code error while the player is still
              // editing their name or paint.
              joinRoom();
            }
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
              <span id="mode-label">Match mode</span>
              <div className="choice-row" role="group" aria-labelledby="mode-label">
                <button
                  type="button"
                  className={`choice ${mode === "bots" ? "is-active" : ""}`}
                  aria-pressed={mode === "bots"}
                  onClick={() => setMode("bots")}
                >
                  Bots
                </button>
                <button
                  type="button"
                  className={`choice ${mode === "online" ? "is-active" : ""}`}
                  aria-pressed={mode === "online"}
                  onClick={() => setMode("online")}
                >
                  With friends
                </button>
              </div>
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

            {mode === "bots" ? (
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
            ) : (
              <div className="lobby-field">
                <span id="join-label">Join a room</span>
                <div className="flex gap-2">
                  <input
                    className="text-input"
                    value={joinCode}
                    maxLength={6}
                    onChange={(event) => {
                      setJoinCode(event.target.value);
                      setError("");
                    }}
                    placeholder="ABC123"
                    autoComplete="off"
                    spellCheck={false}
                    aria-labelledby="join-label"
                  />
                  <button
                    type="button"
                    className="button button-outline shrink-0"
                    onClick={joinRoom}
                  >
                    Join
                  </button>
                </div>
                <span className="hud-label">
                  Up to 40 drivers · late join enabled · no bots
                </span>
              </div>
            )}

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
              {mode === "bots" ? (
                <button type="submit" className="button button-primary w-full sm:w-auto">
                  Enter the arena
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-primary w-full sm:w-auto"
                  onClick={createRoom}
                  disabled={creating}
                >
                  {creating ? "Opening room…" : "Create a room"}
                  <span aria-hidden="true">→</span>
                </button>
              )}
              {error ? (
                <p className="text-sm font-bold text-[var(--signal)]" role="alert">
                  {error}
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-ash">
                {mode === "bots"
                  ? `${botCount} bots · first to ${killTarget} · ${duration / 60} minute${
                      duration === 60 ? "" : "s"
                    } · WASD / arrows drive · Space fires · touch controls included.`
                  : `Online room · first to ${killTarget} · ${duration / 60} minute${
                      duration === 60 ? "" : "s"
                    } · 40 seats · friends can join mid-match.`}
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

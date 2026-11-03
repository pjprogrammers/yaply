"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WEAPONS } from "@/game/constants";
import type { GameEngine } from "@/game/engine";
import { MAPS } from "@/game/maps";
import type { GameStore } from "@/game/store";
import type { WeaponId } from "@/game/types";
import { Minimap } from "./minimap";
import { TouchControls } from "./touch-controls";
import { WeaponGlyph } from "./weapon-glyph";

interface HudProps {
  store: GameStore;
  engineRef: { current: GameEngine | null };
  onQuit: () => void;
  onRestart: () => void;
  online?: boolean;
  canRematch?: boolean;
  onRematch?: () => void;
}

interface Toast {
  key: number;
  text: string;
  color: string;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}

export function Hud({
  store,
  engineRef,
  onQuit,
  onRestart,
  online = false,
  canRematch = false,
  onRematch,
}: HudProps) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [toast, setToast] = useState<Toast | null>(null);
  const previousWeapon = useRef<WeaponId | null>(null);
  const toastKey = useRef(0);

  const player = snapshot.karts.find((kart) => kart.id === snapshot.playerId) ?? null;
  const map = MAPS[snapshot.mapId];
  const weapon = player?.weapon ?? null;
  const ammo = player?.ammo ?? 0;
  const standings = [...snapshot.karts].sort(
    (a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name),
  );
  // A 40-seat room should not push the live table past the viewport. The final
  // screen still lists everyone; during the match the rail shows the top pack.
  const standingsShown = standings.slice(0, 8);
  const lockTarget =
    snapshot.karts.find((kart) => kart.id === snapshot.aimTargetId) ?? null;
  const winner = snapshot.winner;

  useEffect(() => {
    if (!weapon) {
      return;
    }
    if (previousWeapon.current && previousWeapon.current !== weapon) {
      const spec = WEAPONS[weapon];
      toastKey.current += 1;
      setToast({
        key: toastKey.current,
        text: weapon === "pulse" ? "Pulse cannon online" : `${spec.name} · ${ammo} rounds`,
        color: spec.css,
      });
    }
    previousWeapon.current = weapon;
  }, [weapon, ammo]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (snapshot.phase === "booting" || !player) {
    return (
      <div className="hud-root flex items-center justify-center">
        <div className="text-center">
          <p className="display text-4xl">{map.name}</p>
          <p className="mt-2 text-sm text-ash">Warming the grid…</p>
        </div>
      </div>
    );
  }

  const speed = Math.round(Math.abs(player.speed) * 4);
  const hullColor = player.hp > 55 ? "#9ef01a" : player.hp > 25 ? "#ffc233" : "#ff5a1f";
  const driftPercent = Math.min(100, (player.driftCharge / 2.4) * 100);
  const accuracy = snapshot.shots > 0 ? Math.round((snapshot.hits / snapshot.shots) * 100) : 0;
  const playerPlace = standings.findIndex((kart) => kart.id === player.id) + 1;

  return (
    <div className="hud-root select-none">
      {player.hp <= 32 && player.alive ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: `inset 0 0 90px rgba(255,90,31,${0.28 - player.hp / 200})` }}
        />
      ) : null}

      <div className="hud-top absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:p-3">
        <div className="hud-panel hud-player-panel w-[248px] p-2.5 sm:w-[300px]">
          <div className="flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 shrink-0"
              style={{ backgroundColor: player.color }}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-bold">{player.name}</span>
            <span className="hud-label">you</span>
            <span className="display ml-auto text-lg tabular-nums md:hidden">
              {formatTime(snapshot.timeLeft)}
            </span>
          </div>

          <div className="hud-segmented mt-2" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <span
                key={index}
                className={player.hp > index * 10 ? "on" : ""}
                style={player.hp > index * 10 ? { backgroundColor: hullColor } : undefined}
              />
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="hud-label">Hull</span>
            <span className="hud-label tabular-nums">{player.hp} / 100</span>
          </div>

          <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center bg-ink"
              style={{ color: WEAPONS[player.weapon].css }}
            >
              <WeaponGlyph weapon={player.weapon} className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="hud-label">Weapon</div>
              <div className="truncate text-sm font-bold">{WEAPONS[player.weapon].name}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="hud-label">Ammo</div>
              <div className="hud-value tabular-nums">
                {player.weapon === "pulse" ? "∞" : player.ammo}
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex min-h-[20px] flex-wrap gap-1">
            {player.shield > 0 ? (
              <span className="bg-[#2fd4c8] px-1.5 py-0.5 text-[10px] font-bold text-ink">
                Shield {Math.ceil(player.shield)}s
              </span>
            ) : null}
            {player.boost > 0 ? (
              <span className="bg-toxic px-1.5 py-0.5 text-[10px] font-bold text-ink">
                Overdrive {Math.ceil(player.boost)}s
              </span>
            ) : null}
            {player.slow > 0 ? (
              <span className="bg-[#8b5cf6] px-1.5 py-0.5 text-[10px] font-bold text-bone">
                Shocked {Math.ceil(player.slow)}s
              </span>
            ) : null}
            {player.shield <= 0 && player.boost <= 0 && player.slow <= 0 ? (
              <span className="hud-label">No active mods</span>
            ) : null}
          </div>
        </div>

        <div className="hidden flex-col items-center md:flex">
          <div className="hud-panel px-5 py-2 text-center">
            <div className="display text-3xl tabular-nums">{formatTime(snapshot.timeLeft)}</div>
            <div className="hud-label">first to {snapshot.killTarget} wrecks</div>
          </div>
          {lockTarget ? (
            <div
              className="mt-1 bg-ink px-2 py-1 text-[11px] font-bold"
              style={{ color: lockTarget.color }}
            >
              Lock · {lockTarget.name}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-1.5">
            <button
              type="button"
              className="hud-button"
              onClick={() => engineRef.current?.toggleMute()}
              aria-label={snapshot.muted ? "Unmute game audio" : "Mute game audio"}
              title={snapshot.muted ? "Unmute" : "Mute"}
            >
              <SoundIcon muted={snapshot.muted} />
            </button>
            {!online ? (
              <button
                type="button"
                className="hud-button"
                onClick={() => engineRef.current?.togglePause()}
                aria-label="Pause game"
              >
                <PauseIcon />
                <span className="hidden sm:inline">Pause</span>
              </button>
            ) : (
              <button type="button" className="hud-button" onClick={onQuit}>
                <span className="hidden sm:inline">Leave room</span>
                <span className="sm:hidden">Leave</span>
              </button>
            )}
          </div>

          <div className="hud-panel hud-standings hidden w-[190px] p-2 md:block">
            <div className="hud-label mb-1">
              Standings{standings.length > standingsShown.length ? ` · top ${standingsShown.length}` : ""}
            </div>
            <table className="score-table">
              <thead>
                <tr>
                  <th scope="col">Driver</th>
                  <th scope="col" className="text-right">
                    W
                  </th>
                  <th scope="col" className="text-right">
                    D
                  </th>
                </tr>
              </thead>
              <tbody>
                {standingsShown.map((kart) => (
                  <tr key={kart.id} className={kart.isPlayer ? "is-player" : undefined}>
                    <td className="max-w-[110px] truncate">
                      <span className="mr-1 inline-block h-2 w-2" style={{ backgroundColor: kart.color }} />
                      {kart.name}
                      {!kart.alive ? <span className="text-ash"> · out</span> : null}
                    </td>
                    <td className="text-right tabular-nums">{kart.kills}</td>
                    <td className="text-right tabular-nums">{kart.deaths}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="kill-feed hidden sm:flex">
            {snapshot.feed.slice(0, 4).map((entry) => (
              <div key={entry.id} className="kill-feed-row">
                <span className="font-bold">{entry.killer}</span>
                <WeaponGlyph weapon={entry.weapon} className="h-3.5 w-3.5" />
                {entry.self ? (
                  <span className="text-ash">self-destructed</span>
                ) : (
                  <span className="text-ash">{entry.victim}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hud-drive absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
        <div className="hud-panel w-[178px] px-3 py-2 sm:w-[212px]">
          <div className="flex items-end gap-1">
            <span className="display text-4xl tabular-nums sm:text-5xl">{speed}</span>
            <span className="hud-label mb-1">km/h</span>
            <span
              className="ml-auto mb-1 text-[10px] font-bold"
              style={{ color: player.boost > 0 ? "#9ef01a" : player.drifting ? "#ffc233" : "#a8a293" }}
            >
              {player.alive ? (player.boost > 0 ? "Boost" : player.drifting ? "Drift" : "Pulse") : "Out"}
            </span>
          </div>
          <div className="hud-bar mt-1.5">
            <span
              style={{
                width: `${driftPercent}%`,
                backgroundColor: player.driftCharge >= 1 ? "#ffc233" : "#9ef01a",
              }}
            />
          </div>
          <div className="hud-label mt-1">
            {player.drifting
              ? "Charging mini-turbo"
              : player.driftCharge > 0
                ? "Straighten out for a boost"
                : "Hard turns charge a mini-turbo"}
          </div>
        </div>
      </div>

      <div className="hud-minimap absolute">
        <div className="hud-panel h-[116px] w-[116px] p-1 sm:h-[172px] sm:w-[172px]">
          <Minimap snapshot={snapshot} />
        </div>
        <div className="hud-label mt-1 text-right">{map.name}</div>
      </div>

      <div className="hud-keyhints absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 lg:flex">
        <KeyHint k="WASD / Arrows" label="drive" />
        <KeyHint k="Space" label="fire" />
      </div>

      {snapshot.phase === "playing" ? (
        <TouchControls
          engineRef={engineRef}
          weapon={player.weapon}
          ammo={player.ammo}
        />
      ) : null}

      {!player.alive && snapshot.phase === "playing" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="respawn-card">
            <div className="display text-4xl">Wrecked</div>
            <p className="mt-1 text-sm font-bold">
              Respawning in {Math.max(0, player.respawnIn).toFixed(1)}s
            </p>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          key={toast.key}
          className="absolute left-1/2 top-[30%] -translate-x-1/2 border-2 bg-ink/90 px-3 py-1.5 text-sm font-bold"
          style={{ borderColor: toast.color, color: toast.color }}
        >
          {toast.text}
        </div>
      ) : null}

      {snapshot.phase === "paused" ? (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="hud-label">
              {map.name} · first to {snapshot.killTarget}
            </p>
            <h2 className="modal-title">Paused</h2>
            <p className="text-sm text-ash">
              The arena is holding its breath. Audio is {snapshot.muted ? "off" : "on"}.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => engineRef.current?.resume()}
              >
                Resume
              </button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => engineRef.current?.toggleMute()}
              >
                {snapshot.muted ? "Unmute" : "Mute"}
              </button>
              <button type="button" className="button button-outline" onClick={onRestart}>
                Restart
              </button>
              <button type="button" className="button button-dark" onClick={onQuit}>
                Quit to garage
              </button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-2 text-sm text-ash">
              <div>
                <dt className="hud-label">Drive</dt>
                <dd>WASD, arrows, or the stick</dd>
              </div>
              <div>
                <dt className="hud-label">Fire</dt>
                <dd>Space or the fire button</dd>
              </div>
              <div>
                <dt className="hud-label">Mini-turbo</dt>
                <dd>Automatic on hard turns</dd>
              </div>
              <div>
                <dt className="hud-label">Pause</dt>
                <dd>Pause button</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}

      {snapshot.phase === "over" ? (
        <div className="modal-backdrop">
          <div className="modal modal-wide">
            <p className="hud-label">Match over · {map.name}</p>
            <h2 className="modal-title">
              {winner ? (winner.id === player.id ? "You win." : `${winner.name} wins.`) : "Match over."}
            </h2>
            <p className="text-sm text-ash">
              {playerPlace === 1
                ? "Clean laps are for time trials. This was a demolition derby."
                : `You finished ${ordinal(playerPlace)} with ${player.kills} wrecks and ${player.deaths} deaths.`}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
              <div>
                <table className="w-full text-left text-sm">
                  <thead className="hud-label">
                    <tr>
                      <th scope="col" className="py-1 font-normal">
                        #
                      </th>
                      <th scope="col" className="py-1 font-normal">
                        Driver
                      </th>
                      <th scope="col" className="py-1 text-right font-normal">
                        Wrecks
                      </th>
                      <th scope="col" className="py-1 text-right font-normal">
                        Deaths
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((kart, index) => (
                      <tr
                        key={kart.id}
                        className={kart.isPlayer ? "font-bold text-warning" : undefined}
                      >
                        <td className="border-t border-line py-1.5 tabular-nums">{index + 1}</td>
                        <td className="border-t border-line py-1.5">
                          <span
                            className="mr-1.5 inline-block h-2.5 w-2.5"
                            style={{ backgroundColor: kart.color }}
                          />
                          {kart.name}
                        </td>
                        <td className="border-t border-line py-1.5 text-right tabular-nums">
                          {kart.kills}
                        </td>
                        <td className="border-t border-line py-1.5 text-right tabular-nums">
                          {kart.deaths}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-ink p-3">
                <div className="hud-label">Your match</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="display text-4xl">{player.kills}</span>
                  <span className="text-xs text-ash">wrecks</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="hud-label">Deaths</dt>
                    <dd className="tabular-nums">{player.deaths}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Accuracy</dt>
                    <dd className="tabular-nums">{accuracy}%</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Place</dt>
                    <dd>{ordinal(playerPlace)}</dd>
                  </div>
                  <div>
                    <dt className="hud-label">Time</dt>
                    <dd className="tabular-nums">{formatTime(snapshot.matchSeconds)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="modal-actions">
              {online ? (
                canRematch ? (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={onRematch ?? onRestart}
                  >
                    Run it back
                  </button>
                ) : (
                  <span className="flex items-center px-1 text-sm text-ash">
                    Waiting for the host to start a rematch.
                  </span>
                )
              ) : (
                <button type="button" className="button button-primary" onClick={onRestart}>
                  Run it back
                </button>
              )}
              <button type="button" className="button button-outline" onClick={onQuit}>
                {online ? "Leave room" : "Change arena"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ordinal(value: number): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${value}th`;
  }
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 bg-ink/80 px-2 py-1 text-[11px]">
      <span className="display text-xs">{k}</span>
      <span className="text-ash">{label}</span>
    </span>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 9h4l5-4v14l-5-4H4z" strokeLinejoin="round" />
      {muted ? (
        <path d="m17 9 4 6M21 9l-4 6" strokeLinecap="round" />
      ) : (
        <path d="M16 8.5a5 5 0 0 1 0 7M19 6a9 9 0 0 1 0 12" strokeLinecap="round" />
      )}
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WEAPONS } from "@/game/constants";
import type { GameEngine } from "@/game/engine";
import { MAPS } from "@/game/maps";
import type { GameStore } from "@/game/store";
import type { WeaponSlot } from "@/game/types";
import { formatTime, ordinal } from "@/lib/format";
import { useFullscreen } from "@/lib/fullscreen";
import { useTouchCapability } from "@/lib/media";
import {
  readControlScheme,
  writeControlScheme,
  type ControlScheme,
} from "@/lib/settings";
import { MatchFeed } from "./match-feed";
import { MatchLeaderboard } from "./match-leaderboard";
import { TouchControls } from "./touch-controls";
import { WeaponCircle } from "./weapon-circle";
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
  const fullscreen = useFullscreen();
  const [toast, setToast] = useState<Toast | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [controlScheme, setControlScheme] = useState<ControlScheme>(() => readControlScheme());
  const touch = useTouchCapability();
  const previousWeapon = useRef<WeaponSlot | null>(null);
  const toastKey = useRef(0);
  const wasPaused = useRef(false);

  const player = snapshot.karts.find((kart) => kart.id === snapshot.playerId) ?? null;
  const playerAlive = player?.alive ?? false;
  const map = MAPS[snapshot.mapId];
  const weapon = player?.weapon ?? "none";
  const weaponSpec = weapon === "none" ? null : WEAPONS[weapon];
  const standings = [...snapshot.karts].sort(
    (a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name),
  );
  const winner = snapshot.winner;

  useEffect(() => {
    if (!weaponSpec) {
      return;
    }
    if (previousWeapon.current && previousWeapon.current !== weapon) {
      toastKey.current += 1;
      setToast({
        key: toastKey.current,
        text: `${weaponSpec.name} · ${weaponSpec.ammoLabel}`,
        color: weaponSpec.css,
      });
    }
    previousWeapon.current = weapon;
  }, [weapon, weaponSpec]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // A local pause (Esc, tab blur, or the menu) opens the drawer so the player
  // always has a visible way back into the race. Online matches never pause.
  useEffect(() => {
    if (snapshot.phase === "paused") {
      wasPaused.current = true;
      // The pause may come from Esc, a tab blur, or the menu itself. Opening
      // the drawer here keeps every pause path recoverable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMenuOpen(true);
    } else if (snapshot.phase === "playing" && wasPaused.current) {
      wasPaused.current = false;
      setMenuOpen(false);
    } else if (snapshot.phase === "over") {
      wasPaused.current = false;
      setMenuOpen(false);
    }
  }, [snapshot.phase]);

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    if (!online) {
      engineRef.current?.pause();
    }
  }, [online, engineRef]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    if (!online && snapshot.phase === "paused") {
      engineRef.current?.resume();
    }
  }, [online, snapshot.phase, engineRef]);

  const fireStart = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    engine.pulseFire();
    engine.setTouchFire(true);
  }, [engineRef]);

  const fireEnd = useCallback(() => {
    engineRef.current?.setTouchFire(false);
  }, [engineRef]);

  // The menu is a hard input boundary. Online matches keep simulating, but a
  // thumb resting on the stick must not keep driving while the drawer is open.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    engine.setInputEnabled(!menuOpen);
    if (menuOpen) {
      engine.clearTouchInput();
    }
    return () => {
      engine.setInputEnabled(true);
    };
  }, [menuOpen, engineRef]);

  // Death and match end release every touch control so a held pedal or stick
  // cannot survive the respawn/rematch boundary.
  useEffect(() => {
    if (!playerAlive) {
      engineRef.current?.clearTouchInput();
    }
  }, [playerAlive, engineRef]);

  const changeControlScheme = useCallback(
    (scheme: ControlScheme) => {
      setControlScheme(scheme);
      writeControlScheme(scheme);
      engineRef.current?.clearTouchInput();
    },
    [engineRef],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || snapshot.phase === "over") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (menuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    };
    // Capture so the drawer and the pause state change in one action, and a
    // second Esc resumes instead of immediately re-opening the menu.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [menuOpen, closeMenu, openMenu, snapshot.phase]);

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
  const menuTitle = online
    ? "Match menu"
    : snapshot.phase === "paused"
      ? "Paused"
      : "Race menu";

  return (
    <div
      className="hud-root select-none"
      data-controls={controlScheme}
      data-touch={touch ? "true" : "false"}
    >
      {player.hp <= 32 && player.alive ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: `inset 0 0 90px rgba(255,90,31,${0.28 - player.hp / 200})` }}
        />
      ) : null}

      <div className="hud-top">
        <div className="hud-top-left">
          <div className="hud-panel hud-clock">
            <span className="display hud-clock-time tabular-nums">
              {formatTime(snapshot.timeLeft)}
            </span>
            <span className="hud-clock-goal">first to {snapshot.killTarget}</span>
          </div>

          <div className="hud-panel hud-player-panel">
            <div className="hud-player-id">
              <span
                className="hud-player-dot"
                style={{ backgroundColor: player.color }}
                aria-hidden="true"
              />
              <span className="hud-player-name">{player.name}</span>
              <span className="hud-player-you">you</span>
            </div>

            <div
              className="hud-health"
              role="progressbar"
              aria-label="Hull health"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.max(0, Math.round(player.hp))}
            >
              <span
                className="hud-health-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, player.hp))}%`,
                  backgroundColor: hullColor,
                }}
              />
              <span className="hud-health-text">{Math.max(0, Math.round(player.hp))}</span>
            </div>

            <div className="hud-weapon">
              <span
                className="hud-weapon-icon"
                style={{ color: weaponSpec?.css ?? "#7d7d72" }}
                aria-hidden="true"
              >
                <WeaponGlyph weapon={player.weapon} className="h-4 w-4" />
              </span>
              <span className="hud-weapon-name">{weaponSpec?.name ?? "Empty"}</span>
              <span className="hud-weapon-ammo tabular-nums">
                {weaponSpec ? player.ammo : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="hud-top-right">
          <div className="hud-actions">
            {fullscreen.supported ? (
              <button
                type="button"
                className="hud-icon-button"
                data-fullscreen-control
                onClick={() => void fullscreen.toggle()}
                aria-label={fullscreen.active ? "Exit fullscreen" : "Enter fullscreen"}
                aria-pressed={fullscreen.active}
                title={fullscreen.active ? "Exit fullscreen" : "Fullscreen"}
              >
                <FullscreenIcon active={fullscreen.active} />
              </button>
            ) : null}
            <button
              type="button"
              className="hud-icon-button hud-menu-toggle"
              onClick={openMenu}
              aria-label="Open game menu"
              aria-expanded={menuOpen}
              aria-controls="hud-game-menu"
            >
              <MenuIcon />
              <span className="hud-menu-text">Menu</span>
            </button>
          </div>

          <MatchLeaderboard standings={standings} playerId={player.id} />
        </div>
      </div>

      <MatchFeed entries={snapshot.feed} now={snapshot.matchSeconds} />

      <WeaponCircle
        weapon={player.weapon}
        ammo={player.ammo}
        disabled={!player.alive || snapshot.phase !== "playing" || menuOpen}
        onPressStart={fireStart}
        onPressEnd={fireEnd}
      />

      {touch && snapshot.phase === "playing" && !menuOpen ? (
        <TouchControls
          engineRef={engineRef}
          scheme={controlScheme}
          disabled={!player.alive}
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
          className="hud-toast"
          style={{ borderColor: toast.color, color: toast.color }}
          role="status"
        >
          {toast.text}
        </div>
      ) : null}

      {menuOpen ? (
        <div
          className="hud-menu-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMenu();
            }
          }}
        >
          <aside
            id="hud-game-menu"
            className="hud-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hud-menu-title"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <header className="hud-menu-head">
              <div className="min-w-0">
                <p className="hud-label">
                  {map.name} · {online ? "online match" : "bot match"}
                </p>
                <h2 id="hud-menu-title" className="hud-menu-title">
                  {menuTitle}
                </h2>
              </div>
              <button
                type="button"
                className="hud-icon-button hud-menu-close"
                onClick={closeMenu}
                aria-label="Close game menu"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="hud-menu-scroll">
              <div className="hud-menu-actions">
                <button
                  type="button"
                  className="button button-primary is-wide"
                  onClick={closeMenu}
                >
                  {online
                    ? "Back to the race"
                    : snapshot.phase === "paused"
                      ? "Resume race"
                      : "Close menu"}
                </button>
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => engineRef.current?.toggleMute()}
                >
                  <SoundIcon muted={snapshot.muted} />
                  {snapshot.muted ? "Unmute audio" : "Mute audio"}
                </button>
                {fullscreen.supported ? (
                  <button
                    type="button"
                    className="button button-dark"
                    data-fullscreen-control
                    onClick={() => void fullscreen.toggle()}
                  >
                    {fullscreen.active ? "Exit fullscreen" : "Fullscreen"}
                  </button>
                ) : null}
                {!online ? (
                  <button
                    type="button"
                    className="button button-dark is-wide"
                    onClick={() => {
                      setMenuOpen(false);
                      onRestart();
                    }}
                  >
                    Restart race
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button button-outline is-wide hud-menu-leave"
                  onClick={onQuit}
                >
                  {online ? "Leave room" : "Quit to garage"}
                </button>
              </div>

              {online ? (
                <p className="hud-menu-note">
                  Online matches keep running while this menu is open.
                </p>
              ) : null}
              {!fullscreen.supported ? (
                <p className="hud-menu-note">
                  Fullscreen is not available in this browser. On iPhone, add Smash
                  Karts to your Home Screen for a full-screen view.
                </p>
              ) : null}

              <section className="hud-menu-section" aria-labelledby="hud-menu-match">
                <h3 id="hud-menu-match" className="hud-menu-section-title">
                  Match
                </h3>
                <dl className="hud-menu-stats">
                  <div>
                    <dt>Time left</dt>
                    <dd className="tabular-nums">{formatTime(snapshot.timeLeft)}</dd>
                  </div>
                  <div>
                    <dt>First to</dt>
                    <dd>{snapshot.killTarget} wrecks</dd>
                  </div>
                  <div>
                    <dt>Your place</dt>
                    <dd>{ordinal(playerPlace)}</dd>
                  </div>
                  <div>
                    <dt>Wrecks / deaths</dt>
                    <dd className="tabular-nums">
                      {player.kills} / {player.deaths}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="hud-menu-section" aria-labelledby="hud-menu-kart">
                <h3 id="hud-menu-kart" className="hud-menu-section-title">
                  Your kart
                </h3>
                <dl className="hud-menu-stats">
                  <div>
                    <dt>Speed</dt>
                    <dd className="tabular-nums">{speed} km/h</dd>
                  </div>
                  <div>
                    <dt>Mini-turbo</dt>
                    <dd className="tabular-nums">{Math.round(driftPercent)}%</dd>
                  </div>
                  <div>
                    <dt>Weapon</dt>
                    <dd>{weaponSpec?.name ?? "Empty slot"}</dd>
                  </div>
                  <div>
                    <dt>Ammo</dt>
                    <dd className="tabular-nums">{weaponSpec ? player.ammo : "—"}</dd>
                  </div>
                </dl>
                {player.shield > 0 ||
                player.spike > 0 ||
                player.boost > 0 ||
                player.slow > 0 ? (
                  <div className="hud-menu-mods">
                    {player.shield > 0 ? (
                      <span className="hud-mod hud-mod-shield">
                        Stars {Math.ceil(player.shield)}s
                      </span>
                    ) : null}
                    {player.spike > 0 ? (
                      <span className="hud-mod hud-mod-spike">
                        Spikey {Math.ceil(player.spike)}s
                      </span>
                    ) : null}
                    {player.boost > 0 ? (
                      <span className="hud-mod hud-mod-boost">
                        Boost {Math.ceil(player.boost)}s
                      </span>
                    ) : null}
                    {player.slow > 0 ? (
                      <span className="hud-mod hud-mod-slow">
                        Frozen {Math.ceil(player.slow)}s
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="hud-menu-section" aria-labelledby="hud-menu-standings">
                <h3 id="hud-menu-standings" className="hud-menu-section-title">
                  Standings
                </h3>
                <div className="hud-menu-table">
                  <table className="score-table">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
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
                      {standings.map((kart, index) => (
                        <tr key={kart.id} className={kart.isPlayer ? "is-player" : undefined}>
                          <td className="tabular-nums">{index + 1}</td>
                          <td className="max-w-[150px] truncate">
                            <span
                              className="mr-1 inline-block h-2 w-2"
                              style={{ backgroundColor: kart.color }}
                            />
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
              </section>

              {snapshot.feed.length > 0 ? (
                <section className="hud-menu-section" aria-labelledby="hud-menu-feed">
                  <h3 id="hud-menu-feed" className="hud-menu-section-title">
                    Kill feed
                  </h3>
                  <div className="kill-feed hud-menu-feed">
                    {snapshot.feed.map((entry) => (
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
                </section>
              ) : null}

              <section className="hud-menu-section" aria-labelledby="hud-menu-touch">
                <h3 id="hud-menu-touch" className="hud-menu-section-title">
                  Touch controls
                </h3>
                <div className="hud-scheme" role="group" aria-label="Touch control layout">
                  <button
                    type="button"
                    className={`hud-scheme-button${controlScheme === "joystick" ? " is-active" : ""}`}
                    aria-pressed={controlScheme === "joystick"}
                    onClick={() => changeControlScheme("joystick")}
                  >
                    <span className="hud-scheme-glyph" aria-hidden="true">
                      ◎
                    </span>
                    <span>
                      <strong>Joystick</strong>
                      <small>360° steer and throttle</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`hud-scheme-button${controlScheme === "pedals" ? " is-active" : ""}`}
                    aria-pressed={controlScheme === "pedals"}
                    onClick={() => changeControlScheme("pedals")}
                  >
                    <span className="hud-scheme-glyph" aria-hidden="true">
                      ◀▶
                    </span>
                    <span>
                      <strong>Pedals</strong>
                      <small>Steer, accelerate, reverse</small>
                    </span>
                  </button>
                </div>
                <p className="hud-menu-note">
                  {touch
                    ? "The selected layout appears on touch screens. Firing stays on the weapon circle."
                    : "Touch controls appear automatically on phones and tablets. Desktop keeps WASD, arrows, Space and gamepad support."}
                </p>
              </section>

              <section className="hud-menu-section" aria-labelledby="hud-menu-controls">
                <h3 id="hud-menu-controls" className="hud-menu-section-title">
                  Controls
                </h3>
                <dl className="hud-menu-controls">
                  <div>
                    <dt>Drive</dt>
                    <dd>WASD / arrows / left stick / touch</dd>
                  </div>
                  <div>
                    <dt>Fire</dt>
                    <dd>Space / weapon circle / gamepad A</dd>
                  </div>
                  <div>
                    <dt>Pause</dt>
                    <dd>Menu button · Esc when windowed</dd>
                  </div>
                  <div>
                    <dt>Mini-turbo</dt>
                    <dd>Hard turns charge a boost</dd>
                  </div>
                </dl>
              </section>
            </div>
          </aside>
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

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {active ? (
        <>
          <path d="M9 4v5H4" />
          <path d="M15 4v5h5" />
          <path d="M9 20v-5H4" />
          <path d="M15 20v-5h5" />
        </>
      ) : (
        <>
          <path d="M4 9V4h5" />
          <path d="M20 9V4h-5" />
          <path d="M4 15v5h5" />
          <path d="M20 15v5h-5" />
        </>
      )}
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

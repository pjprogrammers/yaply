"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CHAIN_BOARD_PRESETS,
  CHAIN_PALETTES,
  MAX_NICKNAME_LENGTH,
  resolveChainPalette,
} from "@yaply/shared/constants";
import type { GameSettings } from "@yaply/shared/types";
import { ArrowRightIcon, PlayIcon, UsersIcon, WifiIcon } from "@/components/icons";
import { MiniBoard } from "@/components/mini-board";
import { ChainSettingsFields } from "@/components/settings-controls";
import { Topbar } from "@/components/topbar";
import {
  cleanRoomCode,
  createRoomCode,
  MAIN_URL,
  readStoredNickname,
  storeNickname,
} from "@/lib/config";
import {
  defaultLocalConfig,
  localConfigToSettings,
  normalizeLocalConfig,
  readLocalConfig,
  settingsToSearchParams,
  writeLocalConfig,
} from "@/lib/chain-settings";

const PLAYERS = [
  { name: "Mara", orbs: 12 },
  { name: "Jules", orbs: 9 },
  { name: "Niko", orbs: 7 },
  { name: "Ari", orbs: 4 },
  { name: "Bea", orbs: 3 },
  { name: "Theo", orbs: 2 },
  { name: "Iris", orbs: 1 },
  { name: "Sam", orbs: 1 },
];

export function CreateRoom() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [settings, setSettings] = useState<GameSettings>(() =>
    localConfigToSettings(defaultLocalConfig()),
  );
  const [hydrated, setHydrated] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const storedName = readStoredNickname();
    const stored = readLocalConfig(storedName);
    // Hydrate the persisted table once the client mounts; the server cannot
    // read localStorage, so this intentionally happens in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedName) setNickname(storedName);
    setSettings(localConfigToSettings(stored));
    setHydrated(true);
  }, []);

  // Persist every change so the next visit opens with the same table.
  useEffect(() => {
    if (!hydrated) return;
    writeLocalConfig(
      normalizeLocalConfig(
        {
          ...settings,
          nickname,
          playerCount: settings.playerCount ?? settings.maxPlayers,
        },
        nickname,
      ),
    );
  }, [hydrated, nickname, settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.chainTheme = settings.theme ?? "dark";
    return () => {
      delete root.dataset.chainTheme;
    };
  }, [settings.theme]);

  const playerCount = Math.max(2, Math.min(8, settings.playerCount ?? settings.maxPlayers ?? 4));
  const board = CHAIN_BOARD_PRESETS[settings.boardSize ?? "medium"];
  const displayName = () => nickname.trim() || "Player";

  const patchSettings = (patch: Partial<GameSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const createRoom = async () => {
    if (creating) return;
    const name = displayName();
    storeNickname(name);
    setCreateError("");
    setCreating(true);
    try {
      const code = await createRoomCode();
      const params = settingsToSearchParams(
        { ...settings, vsCpu: false },
        { name, host: "1" },
      );
      router.push(`/room/${code}?${params.toString()}`);
    } catch (cause) {
      setCreateError(
        cause instanceof Error
          ? cause.message
          : "Could not create a room right now. Please try again.",
      );
      setCreating(false);
    }
  };

  const startLocal = (mode: "solo" | "pass") => {
    const name = displayName();
    storeNickname(name);
    const params = settingsToSearchParams(
      { ...settings, vsCpu: mode === "solo" ? settings.vsCpu : false },
      { name, mode },
    );
    router.push(`/play?${params.toString()}`);
  };

  const joinRoom = () => {
    const code = cleanRoomCode(roomCode);
    if (code.length !== 6) {
      setError("Room codes are six characters.");
      return;
    }
    const name = displayName();
    storeNickname(name);
    router.push(`/room/${code}?name=${encodeURIComponent(name)}`);
  };

  const palette = useMemo(
    () => resolveChainPalette(settings.palette, settings.customColors),
    [settings.palette, settings.customColors],
  );
  const paletteName = useMemo(
    () =>
      settings.palette === "custom"
        ? "Custom"
        : CHAIN_PALETTES.find((entry) => entry.id === settings.palette)?.name ?? "Classic",
    [settings.palette],
  );

  return (
    <div className="app-shell">
      <Topbar />

      <main className="page">
        <div className="home-grid">
          <section className="home-copy">
            <p className="eyebrow">Room setup · Chain Reaction</p>
            <h1 className="home-title">
              Set the table.
              <br />
              Pick your pressure.
            </h1>
            <p className="subline">
              Choose a board, a clock and a palette. Play straight away with CPUs or pass-and-play,
              create an online room, or enter a friend&apos;s code below.
            </p>

            <div className="home-actions">
              <Link href="/how-to-play" className="btn btn--ghost">
                How to play
                <ArrowRightIcon size={14} />
              </Link>
              <Link href="/" className="text-link">
                Back to home
              </Link>
              <a href={MAIN_URL} className="text-link">
                More Yaply games
              </a>
            </div>

            <div className="chain-preview">
              <div className="preview-head">
                <span className="preview-caption">
                  <span className="status-dot" data-status="connected" />
                  Board preview
                </span>
                <span className="pill pill--accent">
                  {board.rows} × {board.cols} · {settings.gridStyle === "2d" ? "2D" : "3D"}
                </span>
              </div>
              <MiniBoard rows={board.rows} cols={board.cols} colors={palette} />
              <div className="preview-players">
                {PLAYERS.slice(0, playerCount).map((player, index) => (
                  <span className="preview-chip" key={player.name}>
                    <i style={{ background: palette[index % palette.length] }} />
                    {player.name}
                    <span className="faint num">{player.orbs}</span>
                  </span>
                ))}
              </div>
              <p className="paper-caption">
                <span>Mara&apos;s corner is one orb from popping</span>
                <span className="num">0:31 left</span>
              </p>
            </div>

            <div className="fact-strip">
              <div className="fact">
                <p className="fact-label">Board</p>
                <p className="fact-value">
                  {board.rows} × {board.cols}
                </p>
              </div>
              <div className="fact">
                <p className="fact-label">Players</p>
                <p className="fact-value">{playerCount}</p>
              </div>
              <div className="fact">
                <p className="fact-label">Palette</p>
                <p className="fact-value fact-value--cap">{paletteName}</p>
              </div>
            </div>
          </section>

          <aside className="rail home-rail">
            <section className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Game setup</h2>
                  <p className="small faint" style={{ marginTop: 3 }}>
                    Every setting applies to the game you start.
                  </p>
                </div>
                <span className="pill">
                  <UsersIcon size={11} />
                  {playerCount}
                </span>
              </div>

              <label className="field">
                <span className="field-label">Nickname</span>
                <input
                  className="input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your name"
                  autoComplete="nickname"
                />
              </label>

              <div className="setup-divider" />

              <ChainSettingsFields
                value={settings}
                onChange={patchSettings}
                showCpu
                showTurnClock
              />

              <div className="setup-actions">
                <button
                  className="btn btn--primary btn--block btn--lg"
                  type="button"
                  onClick={() => startLocal("solo")}
                >
                  <PlayIcon size={15} />
                  Play
                </button>
                <button
                  className="btn btn--block"
                  type="button"
                  onClick={() => startLocal("pass")}
                >
                  <UsersIcon size={15} />
                  Pass and play
                </button>
                <button
                  className="btn btn--block"
                  type="button"
                  onClick={createRoom}
                  disabled={creating}
                >
                  <WifiIcon size={15} />
                  {creating ? "Creating room…" : "Create room"}
                </button>
                <p className="setup-note">
                  {settings.vsCpu
                    ? `Play fills seats 2–${playerCount} with ${settings.cpuDifficulty ?? "medium"} CPUs.`
                    : "Play is pass-and-play on this device."}
                </p>
                {createError && (
                  <p className="small" style={{ color: "var(--negative)" }}>{createError}</p>
                )}
              </div>

              <div className="divider" style={{ margin: "20px 0 18px" }} />

              <div className="field">
                <span className="field-label">Join an online room</span>
                <div className="join-row">
                  <div className="code-input-wrap">
                    <input
                      className="input input--code"
                      value={roomCode}
                      onChange={(event) => {
                        setRoomCode(cleanRoomCode(event.target.value));
                        setError("");
                      }}
                      maxLength={6}
                      placeholder="ABC123"
                      inputMode="text"
                      autoCapitalize="characters"
                      spellCheck={false}
                      aria-label="Six character room code"
                    />
                    {roomCode.length > 0 && (
                      <button
                        type="button"
                        className="icon-btn code-clear"
                        onClick={() => setRoomCode("")}
                        aria-label="Clear room code"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={joinRoom}
                    disabled={roomCode.length !== 6}
                  >
                    Join
                  </button>
                </div>
                {error && (
                  <p className="small" style={{ color: "var(--negative)" }}>
                    {error}
                  </p>
                )}
                <Link href="/join" className="text-link" style={{ marginTop: 10 }}>
                  Open the join page
                  <ArrowRightIcon size={13} />
                </Link>
              </div>
            </section>

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Critical mass</h2>
                <span className="pill">2 / 3 / 4</span>
              </div>
              <div className="mass-grid" aria-hidden>
                <span className="mass-cell">2</span>
                <span className="mass-cell">3</span>
                <span className="mass-cell">2</span>
                <span className="mass-cell">3</span>
                <span className="mass-cell mass-cell--center">4</span>
                <span className="mass-cell">3</span>
                <span className="mass-cell">2</span>
                <span className="mass-cell">3</span>
                <span className="mass-cell">2</span>
              </div>
              <p className="mass-caption">
                Corners pop at 2 orbs, edges at 3 and the middle at 4. A cell that pops sends one
                orb into each neighbour — which can pop them too.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

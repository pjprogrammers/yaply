"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CPU_DIFFICULTIES,
  CHAIN_BOARD_PRESETS,
  MAX_NICKNAME_LENGTH,
  resolveChainPalette,
} from "@yaply/shared/constants";
import {
  applyChainMove,
  countOrbs,
  createChainState,
  pickAutoMove,
  pickCpuMove,
  rankChainPlayers,
} from "@yaply/shared/chain";
import type { ChainState, GameSettings, Player } from "@yaply/shared/types";
import { useCountdown, useNow } from "@yaply/shared/react";
import { Board } from "./board";
import { GameMenuFacts, GameMenuSection, GameStage } from "./game-stage";
import { ClockIcon, ExpandIcon, PlayIcon } from "./icons";
import { PlayerList } from "./player-list";
import { Topbar } from "./topbar";
import {
  MAIN_URL,
  readStoredNickname,
  readStoredPassPlayerNames,
  storePassPlayerNames,
} from "@/lib/config";
import { settingsFromSearchParams } from "@/lib/chain-settings";
import { useGameFullscreen } from "@/hooks/use-game-fullscreen";

type Seat = {
  id: string;
  nickname: string;
  kind: "human" | "cpu";
  color: string;
};

type LocalMode = "solo" | "pass";

type LocalSettings = GameSettings & {
  rows: number;
  cols: number;
  mode: LocalMode;
  difficultyLabel: string;
};

function countSeats(settings: GameSettings): number {
  return Math.max(2, Math.min(8, settings.playerCount ?? settings.maxPlayers ?? 4));
}

function buildSeats(
  settings: GameSettings,
  mode: LocalMode,
  names: readonly string[],
): Seat[] {
  const count = countSeats(settings);
  const colors = resolveChainPalette(settings.palette, settings.customColors);
  const cpu = mode === "solo" && Boolean(settings.vsCpu);
  const difficulty =
    CPU_DIFFICULTIES.find((entry) => entry.id === (settings.cpuDifficulty ?? "medium"))?.label ??
    "Medium";

  return Array.from({ length: count }, (_, index) => {
    const isCpu = cpu && index > 0;
    return {
      id: `seat-${index + 1}`,
      nickname: isCpu
        ? `CPU ${index} · ${difficulty}`
        : names[index]?.trim() || (index === 0 ? "You" : `Player ${index + 1}`),
      kind: isCpu ? "cpu" : "human",
      color: colors[index % colors.length],
    };
  });
}

export function LocalGame({ nickname }: { nickname: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const settings = useMemo<LocalSettings>(() => {
    const params = new URLSearchParams(query);
    const base = settingsFromSearchParams(params);
    const board = CHAIN_BOARD_PRESETS[base.boardSize ?? "medium"];
    const requestedMode = params.get("mode");
    // `nearby` was the old name for the same shared-device mode; keep old
    // bookmarked links working.
    const mode: LocalMode =
      requestedMode === "pass" || requestedMode === "nearby" ? "pass" : "solo";
    const difficultyLabel =
      CPU_DIFFICULTIES.find((entry) => entry.id === (base.cpuDifficulty ?? "medium"))?.label ??
      "Medium";
    return {
      ...base,
      vsCpu: mode === "solo" ? base.vsCpu : false,
      rows: board.rows,
      cols: board.cols,
      mode,
      difficultyLabel,
    };
  }, [query]);

  const seatCount = countSeats(settings);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const namesHydrated = useRef(settings.mode !== "pass");

  const defaultNames = useMemo(
    () =>
      Array.from({ length: seatCount }, (_, index) =>
        index === 0 ? nickname.trim() || "You" : `Player ${index + 1}`,
      ),
    [nickname, seatCount],
  );

  const inputNames = useMemo(
    () =>
      Array.from(
        { length: seatCount },
        (_, index) => playerNames[index] ?? defaultNames[index],
      ),
    [defaultNames, playerNames, seatCount],
  );

  const resolvedNames = useMemo(
    () => inputNames.map((name, index) => name.trim() || defaultNames[index]),
    [defaultNames, inputNames],
  );

  useEffect(() => {
    if (settings.mode !== "pass" || namesHydrated.current) return;
    namesHydrated.current = true;
    const stored = readStoredPassPlayerNames();
    if (stored.length === 0) return;
    // localStorage is only available after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerNames(stored);
  }, [settings.mode]);

  const renamePlayer = (index: number, value: string) => {
    // Keep names for seats that are not active in this match (for example if
    // the host previously played with eight players) instead of truncating the
    // saved list to the current player count.
    const next = Array.from(
      { length: Math.max(seatCount, playerNames.length) },
      (_, seat) =>
        seat === index ? value : playerNames[seat] ?? defaultNames[seat] ?? "",
    );
    setPlayerNames(next);
    storePassPlayerNames(
      next.map((name, seat) => name.trim() || defaultNames[seat] || ""),
    );
  };

  const seats = useMemo(
    () => buildSeats(settings, settings.mode, resolvedNames),
    [resolvedNames, settings],
  );
  const order = useMemo(
    () => Array.from({ length: seatCount }, (_, index) => `seat-${index + 1}`),
    [seatCount],
  );
  const turnTime = settings.turnTimeSeconds ?? 45;

  const makeState = useCallback(
    () => createChainState(order, Date.now(), turnTime, settings.rows, settings.cols),
    [order, settings.cols, settings.rows, turnTime],
  );

  const [chain, setChain] = useState<ChainState>(makeState);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const cpuGuard = useRef<string>("");
  const autoGuard = useRef<string>("");
  const now = useNow(250);

  useEffect(() => {
    // A fresh table starts from a clean chain whenever the roster/size change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChain(makeState());
    cpuGuard.current = "";
    autoGuard.current = "";
  }, [makeState]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.chainTheme = settings.theme ?? "dark";
    return () => {
      delete root.dataset.chainTheme;
    };
  }, [settings.theme]);

  useEffect(() => {
    const last = chain.lastMove;
    if (!last) return;
    const keys = new Set<string>();
    keys.add(`${last.row}:${last.col}`);
    for (const explosion of last.explosions) {
      keys.add(`${explosion.row}:${explosion.col}`);
    }
    // Pulse the cells touched by the latest move, then fade them out.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlash(keys);
    const timer = window.setTimeout(() => setFlash(new Set()), 560);
    return () => window.clearTimeout(timer);
  }, [chain.lastMove]);

  const applyMove = useCallback(
    (row: number, col: number, playerId: string | null) => {
      if (!playerId) return;
      setChain((current) => {
        const result = applyChainMove(
          current,
          playerId,
          row,
          col,
          order,
          Date.now(),
          turnTime,
        );
        return result ? result.state : current;
      });
    },
    [order, turnTime],
  );

  const restart = () => {
    cpuGuard.current = "";
    autoGuard.current = "";
    setFlash(new Set());
    setChain(makeState());
  };

  // CPUs take their turn after a short pause so the placement is readable.
  useEffect(() => {
    if (chain.winnerId || !chain.turnPlayerId) return;
    const seat = seats.find((entry) => entry.id === chain.turnPlayerId);
    if (!seat || seat.kind !== "cpu") return;
    const key = `${chain.moveCount}:${chain.turnPlayerId}`;
    if (cpuGuard.current === key) return;
    cpuGuard.current = key;

    const actor = chain.turnPlayerId;
    const timer = window.setTimeout(() => {
      setChain((current) => {
        if (current.winnerId || current.turnPlayerId !== actor) return current;
        const move = pickCpuMove(
          current,
          actor,
          settings.cpuDifficulty ?? "medium",
          order,
          Date.now(),
          turnTime,
        );
        if (!move) return current;
        const result = applyChainMove(
          current,
          actor,
          move.row,
          move.col,
          order,
          Date.now(),
          turnTime,
        );
        return result ? result.state : current;
      });
    }, 620);

    return () => window.clearTimeout(timer);
  }, [chain, order, seats, settings.cpuDifficulty, turnTime]);

  // The local turn clock auto-plays a legal move when it expires.
  useEffect(() => {
    if (chain.winnerId || !chain.turnEndsAt || !chain.turnPlayerId) return;
    if (now <= chain.turnEndsAt) return;
    const key = `${chain.moveCount}:${chain.turnPlayerId}`;
    if (autoGuard.current === key) return;
    autoGuard.current = key;
    const actor = chain.turnPlayerId;
    setChain((current) => {
      if (current.winnerId || current.turnPlayerId !== actor) return current;
      if (!current.turnEndsAt || Date.now() <= current.turnEndsAt) return current;
      const move = pickAutoMove(current, actor);
      if (!move) return current;
      const result = applyChainMove(
        current,
        actor,
        move.row,
        move.col,
        order,
        Date.now(),
        turnTime,
      );
      return result ? result.state : current;
    });
  }, [chain, now, order, turnTime]);

  const players: Player[] = useMemo(
    () =>
      seats.map((seat, index) => ({
        id: seat.id,
        nickname: seat.nickname,
        avatar: "",
        color: seat.color,
        score: countOrbs(chain.cells, seat.id),
        connected: true,
        guessedCorrectly: false,
        joinedAt: index,
      })),
    [chain.cells, seats],
  );

  const humanSeat = seats[0];
  const isHumanTurn = Boolean(
    chain.turnPlayerId && seats.find((seat) => seat.id === chain.turnPlayerId)?.kind === "human",
  );
  const currentSeat = chain.turnPlayerId
    ? seats.find((seat) => seat.id === chain.turnPlayerId)
    : undefined;
  const canPlay = !chain.winnerId && isHumanTurn;
  const remaining = useCountdown(chain.turnEndsAt, now);
  const progress = chain.turnEndsAt ? Math.min(1, Math.max(0, remaining / turnTime)) : 0;
  const rankings = rankChainPlayers(chain, order);
  const winner = chain.winnerId ? seats.find((seat) => seat.id === chain.winnerId) : undefined;
  const gameOver = Boolean(chain.winnerId);
  const cpuCount = seats.filter((seat) => seat.kind === "cpu").length;

  const onPlace = (row: number, col: number) => {
    if (!canPlay) return;
    applyMove(row, col, chain.turnPlayerId);
  };

  const {
    fullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
    toggle: toggleFullscreen,
  } = useGameFullscreen(true);

  const modeLabel = settings.mode === "pass" ? "Pass & play" : "Local";
  const turnLabel = gameOver
    ? "Game over"
    : canPlay
      ? settings.mode === "pass"
        ? `${currentSeat?.nickname ?? "Player"} to play`
        : "Your move"
      : currentSeat
        ? currentSeat.kind === "cpu"
          ? `${currentSeat.nickname} is thinking`
          : `${currentSeat.nickname}'s move`
        : "Board settled";
  const turnDetail = `${modeLabel} · ${chain.moveCount} move${chain.moveCount === 1 ? "" : "s"}`;
  const turnColor = currentSeat?.color ?? humanSeat?.color ?? "var(--accent)";
  const stageHint = gameOver
    ? "Final board"
    : canPlay
      ? settings.confirmMoves
        ? "Tap a cell twice to place · Arrow keys + Enter works too"
        : "Tap an open cell · Arrow keys + Enter works too"
      : "Watch the chain settle";

  const stageTimer =
    chain.turnEndsAt && !gameOver ? (
      <span className="stage-clock" aria-label={`${remaining} seconds left`}>
        <ClockIcon size={14} />
        <span className="stage-clock-value num">{remaining}</span>
        <span className="stage-clock-track">
          <span className="stage-clock-fill" style={{ width: `${progress * 100}%` }} />
        </span>
      </span>
    ) : (
      <span className="stage-pill">{gameOver ? "Finished" : "Ready"}</span>
    );

  const gameOverOverlay = gameOver ? (
    <div className="canvas-overlay">
      <div className="overlay-card">
        <p className="eyebrow">Game over</p>
        <p className="overlay-title">
          {winner ? `${winner.nickname} wins the board` : "Final board"}
        </p>
        <p className="overlay-sub">
          {seats.length} players · {chain.moveCount} moves played
        </p>
        <div className="result-rankings">
          {rankings.map((playerId, index) => {
            const seat = seats.find((entry) => entry.id === playerId);
            if (!seat) return null;
            return (
              <div
                className={`result-rank-row ${playerId === chain.winnerId ? "result-rank-row--winner" : ""}`}
                key={playerId}
              >
                <span className="rank">{index + 1}</span>
                <span className="result-rank-name">{seat.nickname}</span>
                <span className="result-rank-score">
                  {countOrbs(chain.cells, playerId)}{" "}
                  <span className="small faint">orbs</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="overlay-actions">
          <button className="btn btn--primary" type="button" onClick={restart}>
            <PlayIcon size={14} />
            Play again
          </button>
          <Link href="/" className="btn btn--ghost">
            Change settings
          </Link>
        </div>
      </div>
    </div>
  ) : null;

  const boardArea = (
    <div className="board-shell">
      <Board
        chain={chain}
        players={players}
        meId={canPlay ? chain.turnPlayerId : humanSeat.id}
        canPlay={canPlay}
        onPlace={onPlace}
        flash={flash}
        confirmMoves={settings.confirmMoves}
        theme={settings.theme}
        fullscreen={fullscreen}
        onToggleFullscreen={() => void toggleFullscreen()}
      />
      {gameOverOverlay}
    </div>
  );

  const localMenu = (
    <>
      <GameMenuSection title="Match" aside={<span className="pill">{modeLabel}</span>}>
        <GameMenuFacts
          items={[
            { label: "Board", value: `${settings.rows} × ${settings.cols}` },
            { label: "Moves", value: chain.moveCount },
            { label: "Turn clock", value: `${turnTime}s` },
            { label: "Confirm moves", value: settings.confirmMoves ? "On" : "Off" },
            {
              label: "Table",
              value: `${seats.length} players${cpuCount > 0 ? ` · ${cpuCount} CPU` : ""}`,
            },
            { label: "Status", value: gameOver ? "Finished" : turnLabel },
          ]}
        />
      </GameMenuSection>

      <GameMenuSection title="Leaderboard" aside={<span className="pill">Orbs</span>}>
        <PlayerList
          players={players}
          meId={canPlay ? chain.turnPlayerId : humanSeat.id}
          hostId={seats[0]?.id ?? ""}
          turnPlayerId={chain.turnPlayerId}
          eliminatedIds={chain.eliminatedPlayerIds}
        />
      </GameMenuSection>

      {settings.mode === "pass" && (
        <GameMenuSection title="Player names" aside={<span className="pill">Saved here</span>}>
          <div className="stage-name-list">
            {inputNames.map((name, index) => (
              <label className="field" key={`stage-player-name-${index}`}>
                <span className="field-label">Player {index + 1}</span>
                <input
                  className="input"
                  value={name}
                  onChange={(event) => renamePlayer(index, event.target.value)}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder={defaultNames[index]}
                  autoComplete="off"
                  aria-label={`Player ${index + 1} name`}
                />
              </label>
            ))}
          </div>
        </GameMenuSection>
      )}

      <GameMenuSection title="Actions">
        <div className="stage-action-grid">
          <button className="btn btn--primary btn--block" type="button" onClick={restart}>
            <PlayIcon size={14} />
            Restart match
          </button>
          <Link href="/" className="btn btn--block">
            Game setup
          </Link>
          <a className="btn btn--ghost btn--block" href={MAIN_URL}>
            Main Yaply page
          </a>
        </div>
      </GameMenuSection>
    </>
  );

  if (fullscreen) {
    return (
      <GameStage
        turnLabel={turnLabel}
        turnColor={turnColor}
        detail={turnDetail}
        timer={stageTimer}
        hint={stageHint}
        menu={localMenu}
        menuLabel={settings.mode === "pass" ? "Pass & play match" : "Local match"}
        onExitFullscreen={() => void exitFullscreen()}
      >
        {boardArea}
      </GameStage>
    );
  }

  return (
    <div className="app-shell">
      <Topbar>
        <div className="room-bar">
          <div>
            <div className="room-bar-label">{settings.mode === "pass" ? "Pass & play" : "Local"}</div>
            <div className="room-code">
              {settings.rows} × {settings.cols}
            </div>
          </div>
          <span className="status">
            <span className="status-dot" data-status="connected" />
            On this device
          </span>
          <div className="room-bar-actions">
            <button className="btn btn--sm" type="button" onClick={() => void enterFullscreen()}>
              <ExpandIcon size={13} />
              Fullscreen
            </button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={restart}>
              Restart
            </button>
            <Link href="/" className="btn btn--ghost btn--sm">
              Setup
            </Link>
            <a className="btn btn--ghost btn--sm" href={MAIN_URL}>
              Main Yaply page
            </a>
          </div>
        </div>
      </Topbar>

      <main className="page">
        <div className="room-grid">
          <section className="chain-card">
            <div className="chain-head">
              <div className="chain-head-main">
                <span className="chain-head-title">
                  {settings.mode === "pass" ? "Pass & play match" : "Local match"} · {chain.moveCount}{" "}
                  moves
                </span>
                <span className="chain-head-sub">
                  {gameOver
                    ? "Final board"
                    : canPlay
                      ? settings.mode === "pass"
                        ? `${currentSeat?.nickname ?? "Player"}'s turn — pick a cell`
                        : "Your turn — pick a cell"
                      : currentSeat
                        ? currentSeat.kind === "cpu"
                          ? `${currentSeat.nickname} is thinking`
                          : `${currentSeat.nickname}'s turn`
                        : "Waiting for the next turn"}
                </span>
              </div>
              <div className="chain-timer" aria-label={`${remaining} seconds left`}>
                <ClockIcon size={14} />
                <span className="timer-value num">{chain.turnEndsAt ? remaining : "–"}</span>
                <span className="timer-track">
                  <span className="timer-fill" style={{ width: `${progress * 100}%` }} />
                </span>
              </div>
            </div>

            {boardArea}

            <div className="chain-actions">
              <span className={`turn-pill ${canPlay ? "turn-pill--mine" : ""}`}>
                <i style={{ background: canPlay ? "var(--accent)" : currentSeat?.color ?? "var(--faint)" }} />
                {gameOver
                  ? "Game over"
                  : canPlay
                    ? "Your move"
                    : currentSeat
                      ? `${currentSeat.nickname}'s move`
                      : "Board settled"}
              </span>
              <button className="btn btn--ghost btn--sm" type="button" onClick={restart}>
                Restart
              </button>
              <span className="capture-line">
                {chain.lastMove
                  ? `Last move: row ${chain.lastMove.row + 1}, column ${chain.lastMove.col + 1}${
                      chain.lastMove.captured > 0
                        ? ` · ${chain.lastMove.captured} orb${chain.lastMove.captured === 1 ? "" : "s"} captured`
                        : ""
                    }`
                  : "Place the first orb."}
              </span>
            </div>
          </section>

          <aside className="rail">
            {settings.mode === "pass" && (
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Player names</h2>
                  <span className="pill">Saved on this device</span>
                </div>
                <div className="settings-list">
                  {inputNames.map((name, index) => (
                    <label className="field" key={`player-name-${index}`}>
                      <span className="field-label">Player {index + 1}</span>
                      <input
                        className="input"
                        value={name}
                        onChange={(event) => renamePlayer(index, event.target.value)}
                        maxLength={MAX_NICKNAME_LENGTH}
                        placeholder={defaultNames[index]}
                        autoComplete="off"
                        aria-label={`Player ${index + 1} name`}
                      />
                    </label>
                  ))}
                </div>
                <p className="small faint" style={{ marginTop: 12 }}>
                  Names are saved in this browser for the next pass-and-play match.
                </p>
              </section>
            )}
            <section className="card">
              <div className="rail-head">
                <span className="rail-title">Table</span>
                <span className="rail-count">
                  {seats.length} players{cpuCount > 0 ? ` · ${cpuCount} CPU` : ""}
                </span>
              </div>
              <PlayerList
                players={players}
                meId={canPlay ? chain.turnPlayerId : humanSeat.id}
                hostId={seats[0]?.id ?? ""}
                turnPlayerId={chain.turnPlayerId}
                eliminatedIds={chain.eliminatedPlayerIds}
              />
              <div className="divider" style={{ margin: "12px 0" }} />
              <div className="chain-rules">
                <div className="chain-rule">
                  <span className="legend-dot" style={{ background: humanSeat?.color ?? "var(--faint)" }} />
                  <span>
                    <b>{humanSeat?.nickname ?? "You"}</b> holds {countOrbs(chain.cells, humanSeat?.id ?? "")} orbs.
                  </span>
                </div>
                <div className="chain-rule">
                  <span className="legend-dot" style={{ background: "var(--accent)" }} />
                  <span>
                    Corner cells pop at <b>2</b>, edges at <b>3</b>, the middle at <b>4</b>.
                  </span>
                </div>
                {cpuCount > 0 && (
                  <div className="chain-rule">
                    <span className="legend-dot" style={{ background: "var(--control)" }} />
                    <span>
                      CPU difficulty: <b>{settings.difficultyLabel}</b>.
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Match settings</h2>
                <span className="pill">3D</span>
              </div>
              <div className="settings-list">
                <div className="setting-row">
                  <span className="setting-label">Board</span>
                  <span className="setting-value">
                    {settings.rows} × {settings.cols}
                  </span>
                </div>
                <div className="setting-row">
                  <span className="setting-label">Confirm moves</span>
                  <span className="setting-value">{settings.confirmMoves ? "On" : "Off"}</span>
                </div>
                <div className="setting-row">
                  <span className="setting-label">Turn clock</span>
                  <span className="setting-value num">{turnTime}s</span>
                </div>
              </div>
              <div className="overlay-actions" style={{ marginTop: 14 }}>
                <button className="btn btn--sm" type="button" onClick={restart}>
                  Restart match
                </button>
                <Link href="/" className="btn btn--ghost btn--sm">
                  Game setup
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export function LocalGameGate() {
  const searchParams = useSearchParams();
  const nameParam = (searchParams.get("name") ?? "").trim();
  const [nickname, setNickname] = useState(nameParam || "You");

  useEffect(() => {
    if (nameParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync route name
      setNickname(nameParam);
      return;
    }
    const stored = readStoredNickname();
    if (stored) setNickname(stored);
  }, [nameParam]);

  return <LocalGame nickname={nickname} />;
}

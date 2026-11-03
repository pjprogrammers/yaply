"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChainGridStyle, ChainState, ChainTheme, Player } from "@yaply/shared/types";
import { orbBackground, orbShadow } from "@/lib/colors";
import { Board3D } from "./board-3d";
import { CollapseIcon, ExpandIcon } from "./icons";

export type ChainCellSelection = { row: number; col: number };

export type BoardProps = {
  chain: ChainState;
  players: Player[];
  meId: string | null;
  canPlay: boolean;
  onPlace: (row: number, col: number) => void;
  flash: Set<string>;
  gridStyle?: ChainGridStyle;
  confirmMoves?: boolean;
  theme?: ChainTheme;
};

type FullscreenMode = "native" | "fallback" | null;

type TapBurst = {
  taps: { row: number; col: number }[];
  timer: number | null;
};

/** How long a tap burst waits before it becomes real moves. */
const BURST_FLUSH_MS = 280;
/** Three taps inside this window count as a triple-click. */
const TRIPLE_TAP_WINDOW_MS = 680;
/** Swallow the synthetic click that follows a fullscreen triple-tap. */
const CLICK_SUPPRESS_MS = 450;

export function criticalMass(row: number, col: number, rows: number, cols: number): number {
  let edges = 0;
  if (row === 0) edges += 1;
  if (row === rows - 1) edges += 1;
  if (col === 0) edges += 1;
  if (col === cols - 1) edges += 1;
  return 4 - edges;
}

export function isPlayableCell(
  chain: ChainState,
  meId: string | null,
  canPlay: boolean,
  row: number,
  col: number,
): boolean {
  if (!canPlay || !meId) return false;
  if (row < 0 || row >= chain.rows || col < 0 || col >= chain.cols) return false;
  const cell = chain.cells[row * chain.cols + col];
  return !cell.ownerId || cell.ownerId === meId;
}

/**
 * Match the reference's soft lens: cubby walls are almost flat under the middle
 * of the board and deepen toward the edges.
 */
function cellBevel(row: number, col: number, rows: number, cols: number) {
  const nx = Math.abs(((col + 0.5) / cols) * 2 - 1);
  const ny = Math.abs(((row + 0.5) / rows) * 2 - 1);
  const weight = Math.pow(Math.max(nx, ny), 1.2);
  return {
    x: 5.5 + 14.5 * weight,
    y: 7 + 37 * weight,
  };
}

type OrbSpot = { x: number; y: number; size: number };

/** Percentages inside one cell; clusters overlap like the reference's gummy blobs. */
function orbSpots(count: number): OrbSpot[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 50, y: 50, size: 58 }];
  if (count === 2) {
    return [
      { x: 38, y: 48, size: 49 },
      { x: 62, y: 52, size: 49 },
    ];
  }
  if (count === 3) {
    return [
      { x: 50, y: 37, size: 46 },
      { x: 35, y: 62, size: 43 },
      { x: 66, y: 61, size: 44 },
    ];
  }
  if (count === 4) {
    return [
      { x: 35, y: 36, size: 41 },
      { x: 65, y: 36, size: 41 },
      { x: 35, y: 64, size: 41 },
      { x: 65, y: 64, size: 41 },
    ];
  }
  const ringCount = Math.min(count, 8);
  const radius = count > 6 ? 27 : 25;
  const size = count > 6 ? 26 : 28;
  return Array.from({ length: ringCount }, (_, index) => {
    const angle = (index / ringCount) * Math.PI * 2 - Math.PI / 2;
    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      size,
    };
  });
}

export function Board({
  chain,
  players,
  meId,
  canPlay,
  onPlace,
  flash,
  gridStyle = "3d",
  confirmMoves = false,
  theme = "dark",
}: BoardProps) {
  const [selected, setSelected] = useState<ChainCellSelection | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>(null);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<ChainCellSelection | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const suppressClicksUntilRef = useRef(0);
  const burstRef = useRef<TapBurst>({ taps: [], timer: null });
  const pointerDownRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const isFullscreen = fullscreenMode !== null;

  const setSelection = useCallback((next: ChainCellSelection | null) => {
    selectedRef.current = next;
    setSelected(next);
  }, []);

  // A new move or a new turn always clears a half-finished confirmation.
  useEffect(() => {
    selectedRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on turn/move change
    setSelected(null);
  }, [chain.moveCount, chain.turnPlayerId, canPlay]);

  useEffect(() => {
    if (!selected) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-chain-cell]")) return;
      setSelection(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selected, setSelection]);

  const commitPick = useCallback(
    (row: number, col: number) => {
      if (!canPlay) return;
      if (!confirmMoves) {
        setSelection(null);
        onPlace(row, col);
        return;
      }
      const current = selectedRef.current;
      if (current?.row === row && current?.col === col) {
        setSelection(null);
        onPlace(row, col);
        return;
      }
      setSelection({ row, col });
    },
    [canPlay, confirmMoves, onPlace, setSelection],
  );

  const commitRef = useRef(commitPick);
  useEffect(() => {
    commitRef.current = commitPick;
  }, [commitPick]);

  const cancelBurst = useCallback(() => {
    const burst = burstRef.current;
    if (burst.timer !== null) {
      window.clearTimeout(burst.timer);
      burst.timer = null;
    }
    burst.taps = [];
  }, []);

  const flushBurst = useCallback(() => {
    const burst = burstRef.current;
    if (burst.timer !== null) {
      window.clearTimeout(burst.timer);
      burst.timer = null;
    }
    const taps = burst.taps;
    burst.taps = [];
    for (const tap of taps) commitRef.current(tap.row, tap.col);
  }, []);

  /**
   * Pointer moves wait just long enough to tell a triple-tap from a move. If a
   * third tap lands in time we drop the queued placement instead of firing it.
   */
  const queuePointerPick = useCallback(
    (row: number, col: number) => {
      if (performance.now() < suppressClicksUntilRef.current) return;
      const burst = burstRef.current;
      burst.taps.push({ row, col });
      if (burst.timer !== null) window.clearTimeout(burst.timer);
      burst.timer = window.setTimeout(() => {
        burst.timer = null;
        flushBurst();
      }, BURST_FLUSH_MS);
    },
    [flushBurst],
  );

  useEffect(() => () => cancelBurst(), [cancelBurst]);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // The browser may already have left fullscreen.
      }
    }
    setFullscreenMode(null);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const frame = frameRef.current;
    if (!frame) return;
    if (typeof frame.requestFullscreen === "function") {
      try {
        await frame.requestFullscreen({ navigationUI: "hide" });
        setFullscreenMode("native");
        return;
      } catch {
        // iOS Safari and some embedded browsers refuse arbitrary elements.
      }
    }
    setFullscreenMode("fallback");
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      void exitFullscreen();
    } else {
      void enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, isFullscreen]);

  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement === frameRef.current) {
        setFullscreenMode("native");
      } else {
        setFullscreenMode((current) => (current === "native" ? null : current));
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // The CSS fallback has to lock the page itself; native fullscreen handles it.
  useEffect(() => {
    if (fullscreenMode !== "fallback") return;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreenMode(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreenMode]);

  const handleStagePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  }, []);

  const handleStagePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const down = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!down || down.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 14) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".board-stage")) return;
      const now = performance.now();
      const recent = tapTimesRef.current.filter((time) => now - time < TRIPLE_TAP_WINDOW_MS);
      recent.push(now);
      tapTimesRef.current = recent;
      if (recent.length < 3) return;
      tapTimesRef.current = [];
      suppressClicksUntilRef.current = now + CLICK_SUPPRESS_MS;
      cancelBurst();
      toggleFullscreen();
    },
    [cancelBurst, toggleFullscreen],
  );

  const legendText = selected
    ? "Selected — tap again to confirm"
    : canPlay
      ? gridStyle === "3d"
        ? "Your turn — tap a cell or use arrows + Enter"
        : "Your turn — tap any open cell"
      : gridStyle === "3d"
        ? "The table updates after every move"
        : "The board updates after every move";

  const legendMeta =
    gridStyle === "3d"
      ? `Corner 2 · Edge 3 · Middle 4 · ${chain.rows} × ${chain.cols}`
      : "Corner 2 · Edge 3 · Middle 4";

  return (
    <div
      ref={frameRef}
      className={[
        "board-block",
        gridStyle === "3d" ? "board-block--3d" : "board-block--2d",
        isFullscreen ? "board-block--fullscreen" : "",
        fullscreenMode === "fallback" ? "board-block--fallback" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-fullscreen={isFullscreen ? "true" : "false"}
      style={{ ["--board-ratio" as string]: chain.cols / chain.rows }}
      onPointerDownCapture={handleStagePointerDown}
      onPointerUpCapture={handleStagePointerUp}
      onPointerCancelCapture={() => {
        pointerDownRef.current = null;
      }}
    >
      <div className={`board-stage board-stage--${gridStyle}`}>
        {gridStyle === "3d" ? (
          <Board3D
            chain={chain}
            players={players}
            meId={meId}
            canPlay={canPlay}
            onPlace={queuePointerPick}
            onPlaceNow={commitPick}
            flash={flash}
            selected={selected}
            onCancel={() => setSelection(null)}
            theme={theme}
          />
        ) : (
          <Board2D
            chain={chain}
            players={players}
            meId={meId}
            canPlay={canPlay}
            onPick={queuePointerPick}
            flash={flash}
            selected={selected}
          />
        )}
      </div>
      <div className="board-foot">
        <span className="legend-row">
          <span className="legend-dot" style={{ background: "var(--accent)" }} />
          {legendText}
        </span>
        <span className="board-foot-actions">
          <span className="board-legend num">{legendMeta}</span>
          <button
            type="button"
            className="board-fullscreen-btn"
            onClick={toggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen board" : "Enter fullscreen board"}
            title={isFullscreen ? "Exit fullscreen (triple-tap the grid)" : "Fullscreen (or triple-tap the grid)"}
          >
            {isFullscreen ? <CollapseIcon size={14} /> : <ExpandIcon size={14} />}
            <span>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
          </button>
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {selected ? `Row ${selected.row + 1}, column ${selected.col + 1} selected.` : ""}
      </p>
    </div>
  );
}

function Board2D({
  chain,
  players,
  meId,
  canPlay,
  onPick,
  flash,
  selected,
}: {
  chain: ChainState;
  players: Player[];
  meId: string | null;
  canPlay: boolean;
  onPick: (row: number, col: number) => void;
  flash: Set<string>;
  selected: ChainCellSelection | null;
}) {
  const byId = new Map(players.map((player) => [player.id, player]));
  const me = meId ? byId.get(meId) : undefined;
  const last = chain.lastMove;

  return (
    <div className="board" data-my-turn={canPlay ? "true" : "false"} data-chain-surface="true">
      <div
        className="board-grid"
        style={{ gridTemplateColumns: `repeat(${chain.cols}, minmax(0, 1fr))` }}
      >
        {chain.cells.map((cell, index) => {
          const row = Math.floor(index / chain.cols);
          const col = index % chain.cols;
          const owner = cell.ownerId ? byId.get(cell.ownerId) : undefined;
          const mass = criticalMass(row, col, chain.rows, chain.cols);
          const armed = Boolean(owner) && cell.orbs === mass - 1;
          const playable = isPlayableCell(chain, meId, canPlay, row, col);
          const isLast = last?.row === row && last?.col === col;
          const isFlashing = flash.has(`${row}:${col}`);
          const isSelected = selected?.row === row && selected?.col === col;
          const orbColor = owner?.color ?? "var(--text)";
          const bevel = cellBevel(row, col, chain.rows, chain.cols);
          const spots = orbSpots(cell.orbs);

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              data-chain-cell="true"
              className={[
                "cell",
                armed ? "cell--armed" : "",
                isLast ? "cell--last" : "",
                isFlashing ? "cell--flash" : "",
                isSelected ? "cell--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-playable={playable ? "true" : "false"}
              data-owner={owner ? "true" : "false"}
              data-selected={isSelected ? "true" : "false"}
              style={{
                ["--cell-bevel-x" as string]: `${bevel.x}%`,
                ["--cell-bevel-y" as string]: `${bevel.y}%`,
                ["--cell-owner" as string]: owner?.color ?? "transparent",
                ["--cell-me" as string]: me?.color ?? "var(--text)",
              }}
              onClick={() => {
                if (!playable) return;
                onPick(row, col);
              }}
              disabled={!playable}
              title={`Row ${row + 1}, column ${col + 1} · critical mass ${mass}${
                armed ? " · one orb from exploding" : ""
              }`}
              aria-label={`Row ${row + 1}, column ${col + 1}${
                owner ? `, ${owner.nickname} with ${cell.orbs} orbs` : ", empty"
              }${isSelected ? ", selected — activate again to confirm" : ""}`}
              aria-pressed={isSelected}
            >
              <span className="cell-orbs" data-count={cell.orbs}>
                {spots.map((spot, orb) => (
                  <i
                    key={orb}
                    className="orb"
                    style={{
                      left: `${spot.x}%`,
                      top: `${spot.y}%`,
                      width: `${spot.size}%`,
                      height: `${spot.size}%`,
                      background: orbBackground(orbColor),
                      boxShadow: orbShadow(orbColor),
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChainState, ChainTheme, Player } from "@yaply/shared/types";
import {
  criticalMass,
  isPlayableCell,
  type ChainCellPoint,
} from "@/lib/chain-grid";
import { Board3D } from "./board-3d";

export type ChainCellSelection = ChainCellPoint;

export type BoardProps = {
  chain: ChainState;
  players: Player[];
  meId: string | null;
  canPlay: boolean;
  onPlace: (row: number, col: number) => void;
  flash: Set<string>;
  confirmMoves?: boolean;
  theme?: ChainTheme;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

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

export { criticalMass, isPlayableCell };

export function Board({
  chain,
  players,
  meId,
  canPlay,
  onPlace,
  flash,
  confirmMoves = false,
  theme = "dark",
  fullscreen = false,
  onToggleFullscreen,
}: BoardProps) {
  const [selected, setSelected] = useState<ChainCellSelection | null>(null);

  const selectedRef = useRef<ChainCellSelection | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const suppressClicksUntilRef = useRef(0);
  const burstRef = useRef<TapBurst>({ taps: [], timer: null });
  const pointerDownRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

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
      setSelection(null);
      onToggleFullscreen?.();
    },
    [cancelBurst, onToggleFullscreen, setSelection],
  );

  return (
    <div
      className={`board-block ${fullscreen ? "board-block--fullscreen" : ""}`}
      data-fullscreen={fullscreen ? "true" : "false"}
      style={{ ["--board-ratio" as string]: chain.cols / chain.rows }}
      onPointerDownCapture={handleStagePointerDown}
      onPointerUpCapture={handleStagePointerUp}
      onPointerCancelCapture={() => {
        pointerDownRef.current = null;
      }}
    >
      <div className="board-stage">
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
      </div>
      {selected && (
        <div className="board-selection-hint" role="status">
          Cell selected — tap it again to place
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {selected ? `Row ${selected.row + 1}, column ${selected.col + 1} selected.` : ""}
      </p>
    </div>
  );
}

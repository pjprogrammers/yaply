"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ChainState, ChainTheme, Player } from "@yaply/shared/types";
import { ChainScene, type ChainSceneState } from "@/lib/chain-scene";
import { isPlayableCell, type ChainCellPoint } from "@/lib/chain-grid";

type Board3DProps = {
  chain: ChainState;
  players: Player[];
  meId: string | null;
  canPlay: boolean;
  /** Pointer/tap placement, funneled through the board's triple-tap guard. */
  onPlace: (row: number, col: number) => void;
  /** Keyboard placement — should resolve immediately. */
  onPlaceNow: (row: number, col: number) => void;
  flash: Set<string>;
  selected: ChainCellPoint | null;
  onCancel: () => void;
  theme: ChainTheme;
};

export function Board3D({
  chain,
  players,
  meId,
  canPlay,
  onPlace,
  onPlaceNow,
  flash,
  selected,
  onCancel,
  theme,
}: Board3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ChainScene | null>(null);
  const hoverRef = useRef<ChainCellPoint | null>(null);
  const cursorRef = useRef<ChainCellPoint>({ row: 0, col: 0 });
  const focusedRef = useRef(false);
  const propsRef = useRef<Board3DProps>({
    chain,
    players,
    meId,
    canPlay,
    onPlace,
    onPlaceNow,
    flash,
    selected,
    onCancel,
    theme,
  });

  useEffect(() => {
    propsRef.current = {
      chain,
      players,
      meId,
      canPlay,
      onPlace,
      onPlaceNow,
      flash,
      selected,
      onCancel,
      theme,
    };
  }, [
    chain,
    players,
    meId,
    canPlay,
    onPlace,
    onPlaceNow,
    flash,
    selected,
    onCancel,
    theme,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const initial: ChainSceneState = {
      chain: propsRef.current.chain,
      players: propsRef.current.players,
      meId: propsRef.current.meId,
      canPlay: propsRef.current.canPlay,
      selected: propsRef.current.selected,
      flash: propsRef.current.flash,
      theme: propsRef.current.theme,
    };
    const scene = new ChainScene(canvas, initial);
    sceneRef.current = scene;

    const observer = new ResizeObserver(() => scene.resize());
    observer.observe(wrapper);
    const onWindowResize = () => scene.resize();
    window.addEventListener("resize", onWindowResize);
    scene.resize();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.update({
      chain,
      players,
      meId,
      canPlay,
      selected,
      flash,
      theme,
    });
  }, [chain, players, meId, canPlay, selected, flash, theme]);

  useEffect(() => {
    sceneRef.current?.pulseCells(flash);
  }, [flash]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const cell = scene.pick(event.clientX, event.clientY);
    const previous = hoverRef.current;
    if (previous?.row === cell?.row && previous?.col === cell?.col) return;
    hoverRef.current = cell;
    if (cell) cursorRef.current = cell;
    scene.setHover(cell);
    scene.setCursor(focusedRef.current && !cell ? cursorRef.current : null);
  }, []);

  const handlePointerLeave = useCallback(() => {
    hoverRef.current = null;
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setHover(null);
    scene.setCursor(focusedRef.current ? cursorRef.current : null);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const cell = scene.pick(event.clientX, event.clientY);
    const props = propsRef.current;
    if (!cell) {
      props.onCancel();
      return;
    }
    if (!isPlayableCell(props.chain, props.meId, props.canPlay, cell.row, cell.col)) {
      // Tapping a cell that cannot take an orb also clears a pending confirmation.
      props.onCancel();
      return;
    }
    props.onPlace(cell.row, cell.col);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const props = propsRef.current;
    const cursor = cursorRef.current;
    const transposed = sceneRef.current?.isTransposed ?? false;
    const next = { ...cursor };
    if (event.key === "ArrowLeft") {
      if (transposed) next.row = Math.max(0, cursor.row - 1);
      else next.col = Math.max(0, cursor.col - 1);
    } else if (event.key === "ArrowRight") {
      if (transposed) next.row = Math.min(props.chain.rows - 1, cursor.row + 1);
      else next.col = Math.min(props.chain.cols - 1, cursor.col + 1);
    } else if (event.key === "ArrowUp") {
      if (transposed) next.col = Math.max(0, cursor.col - 1);
      else next.row = Math.max(0, cursor.row - 1);
    } else if (event.key === "ArrowDown") {
      if (transposed) next.col = Math.min(props.chain.cols - 1, cursor.col + 1);
      else next.row = Math.min(props.chain.rows - 1, cursor.row + 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isPlayableCell(props.chain, props.meId, props.canPlay, cursor.row, cursor.col)) {
        props.onPlaceNow(cursor.row, cursor.col);
      }
      return;
    } else if (event.key === "Escape") {
      props.onCancel();
      return;
    } else {
      return;
    }
    event.preventDefault();
    cursorRef.current = next;
    hoverRef.current = null;
    sceneRef.current?.setHover(null);
    sceneRef.current?.setCursor(next);
  }, []);

  const label = selected
    ? `Chain Reaction 3D board. Row ${selected.row + 1}, column ${selected.col + 1} selected. Activate it again to confirm.`
    : canPlay
      ? "Chain Reaction 3D board. Use arrow keys to move and Enter to place an orb."
      : "Chain Reaction 3D board. Use arrow keys to move; clicking places only on your turn.";

  return (
    <div className="board-3d-shell" ref={wrapperRef} data-chain-surface="true">
      <canvas
        ref={canvasRef}
        className="board-3d"
        data-chain-cell="true"
        role="grid"
        tabIndex={0}
        aria-label={label}
        aria-rowcount={chain.rows}
        aria-colcount={chain.cols}
        onPointerDown={(event) => {
          event.currentTarget.dataset.pointerFocus = "true";
          event.currentTarget.focus({ preventScroll: true });
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onFocus={() => {
          focusedRef.current = true;
          sceneRef.current?.setCursor(cursorRef.current);
        }}
        onBlur={() => {
          focusedRef.current = false;
          sceneRef.current?.setCursor(null);
        }}
        onKeyDown={(event) => {
          delete event.currentTarget.dataset.pointerFocus;
          handleKeyDown(event);
        }}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChainGridStyle, ChainState, ChainTheme, Player } from "@yaply/shared/types";
import { orbBackground, orbShadow } from "@/lib/colors";
import { Board3D } from "./board-3d";

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

  // A new move or a new turn always clears a half-finished confirmation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on turn/move change
    setSelected(null);
  }, [chain.moveCount, chain.turnPlayerId, canPlay]);

  useEffect(() => {
    if (!selected) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-chain-cell]")) return;
      setSelected(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  const pick = useCallback(
    (row: number, col: number) => {
      if (!canPlay) return;
      if (!confirmMoves) {
        setSelected(null);
        onPlace(row, col);
        return;
      }
      if (selected?.row === row && selected?.col === col) {
        setSelected(null);
        onPlace(row, col);
        return;
      }
      setSelected({ row, col });
    },
    [canPlay, confirmMoves, onPlace, selected],
  );

  if (gridStyle === "3d") {
    return (
      <Board3D
        chain={chain}
        players={players}
        meId={meId}
        canPlay={canPlay}
        onPlace={pick}
        flash={flash}
        selected={selected}
        onCancel={() => setSelected(null)}
        theme={theme}
      />
    );
  }

  return (
    <Board2D
      chain={chain}
      players={players}
      meId={meId}
      canPlay={canPlay}
      onPick={pick}
      flash={flash}
      selected={selected}
    />
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
    <div className="board-block">
      <div
        className="board"
        data-my-turn={canPlay ? "true" : "false"}
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
                background: owner && armed ? `${owner.color}1f` : undefined,
                outlineColor: armed && owner ? `${owner.color}88` : undefined,
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
                {Array.from({ length: Math.min(cell.orbs, 8) }).map((_, orb) => (
                  <i
                    key={orb}
                    className="orb"
                    style={{ background: orbBackground(orbColor), boxShadow: orbShadow(orbColor) }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="board-foot">
        <span className="legend-row">
          <span className="legend-dot" style={{ background: "var(--accent)" }} />
          {selected
            ? "Selected — tap the same cell again to confirm"
            : canPlay
              ? "Your turn — tap a cell you own or an empty one"
              : "The board updates after every move"}
        </span>
        <span className="board-legend num">Corner 2 · Edge 3 · Middle 4</span>
      </div>
    </div>
  );
}

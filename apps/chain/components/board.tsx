"use client";

import type { ChainState, Player } from "@yaply/shared/types";

type BoardProps = {
  chain: ChainState;
  players: Player[];
  meId: string | null;
  canPlay: boolean;
  onPlace: (row: number, col: number) => void;
  flash: Set<string>;
};

function criticalMass(row: number, col: number, rows: number, cols: number): number {
  let edges = 0;
  if (row === 0) edges += 1;
  if (row === rows - 1) edges += 1;
  if (col === 0) edges += 1;
  if (col === cols - 1) edges += 1;
  return 4 - edges;
}

export function Board({ chain, players, meId, canPlay, onPlace, flash }: BoardProps) {
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
          const playable =
            canPlay && (!cell.ownerId || cell.ownerId === meId) && cell.orbs < mass;
          const isLast = last?.row === row && last?.col === col;
          const isFlashing = flash.has(`${row}:${col}`);

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              className={[
                "cell",
                armed ? "cell--armed" : "",
                isLast ? "cell--last" : "",
                isFlashing ? "cell--flash" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-playable={playable ? "true" : "false"}
              data-owner={owner ? "true" : "false"}
              style={{
                background:
                  owner && armed ? `${owner.color}1f` : undefined,
                outlineColor: armed && owner ? `${owner.color}88` : undefined,
                ["--cell-owner" as string]: owner?.color ?? "transparent",
                ["--cell-me" as string]: me?.color ?? "var(--text)",
              }}
              onClick={() => {
                if (!playable) return;
                onPlace(row, col);
              }}
              disabled={!playable}
              title={`Row ${row + 1}, column ${col + 1} · critical mass ${mass}${
                armed ? " · one orb from exploding" : ""
              }`}
              aria-label={`Row ${row + 1}, column ${col + 1}${
                owner ? `, ${owner.nickname} with ${cell.orbs} orbs` : ", empty"
              }`}
            >
              <span className="cell-orbs" data-count={cell.orbs}>
                {Array.from({ length: Math.min(cell.orbs, 4) }).map((_, orb) => (
                  <i
                    key={orb}
                    className="orb"
                    style={{ background: owner?.color ?? "var(--text)" }}
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
          {canPlay ? "Your turn — tap a cell you own or an empty one" : "The board updates after every move"}
        </span>
        <span className="board-legend num">Corner 2 · Edge 3 · Middle 4</span>
      </div>
    </div>
  );
}

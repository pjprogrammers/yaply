import type { ChainState } from "@yaply/shared/types";

export type ChainCellPoint = { row: number; col: number };

/** Corner cells pop at 2, edges at 3 and the middle at 4. */
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

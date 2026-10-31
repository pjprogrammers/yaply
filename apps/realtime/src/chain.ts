import { CHAIN_COLS, CHAIN_MAX_EXPLOSIONS, CHAIN_ROWS } from "@yaply/shared/constants";
import type { ChainCell, ChainExplosion, ChainMove, ChainState, PlayerId } from "@yaply/shared/types";

export type ChainMoveResult = {
  state: ChainState;
  move: ChainMove;
  eliminated: PlayerId[];
  winnerId: PlayerId | null;
};

export type ChainCellPosition = {
  row: number;
  col: number;
};

export function cellIndex(rows: number, cols: number, row: number, col: number): number {
  return row * cols + col;
}

export function criticalMass(
  row: number,
  col: number,
  rows: number = CHAIN_ROWS,
  cols: number = CHAIN_COLS,
): number {
  let edges = 0;
  if (row === 0) edges += 1;
  if (row === rows - 1) edges += 1;
  if (col === 0) edges += 1;
  if (col === cols - 1) edges += 1;
  return 4 - edges;
}

export function neighbors(
  row: number,
  col: number,
  rows: number = CHAIN_ROWS,
  cols: number = CHAIN_COLS,
): ChainCellPosition[] {
  const out: ChainCellPosition[] = [];
  if (row > 0) out.push({ row: row - 1, col });
  if (row < rows - 1) out.push({ row: row + 1, col });
  if (col > 0) out.push({ row, col: col - 1 });
  if (col < cols - 1) out.push({ row, col: col + 1 });
  return out;
}

export function createChainState(
  playerIds: PlayerId[],
  now: number,
  turnTimeSeconds: number,
  rows: number = CHAIN_ROWS,
  cols: number = CHAIN_COLS,
): ChainState {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows * cols }, () => ({ ownerId: null, orbs: 0 })),
    turnPlayerId: playerIds[0] ?? null,
    eliminatedPlayerIds: [],
    winnerId: null,
    lastMove: null,
    turnEndsAt: playerIds.length > 0 ? now + turnTimeSeconds * 1000 : null,
    moveCount: 0,
  };
}

export function countOrbs(cells: ChainCell[], playerId: PlayerId): number {
  let total = 0;
  for (const cell of cells) {
    if (cell.ownerId === playerId) total += cell.orbs;
  }
  return total;
}

export function countCells(cells: ChainCell[], playerId: PlayerId): number {
  let total = 0;
  for (const cell of cells) {
    if (cell.ownerId === playerId && cell.orbs > 0) total += 1;
  }
  return total;
}

export function canPlace(
  state: ChainState,
  playerId: PlayerId,
  row: number,
  col: number,
): boolean {
  if (state.winnerId) return false;
  if (state.turnPlayerId !== playerId) return false;
  if (state.eliminatedPlayerIds.includes(playerId)) return false;
  if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) return false;
  const cell = state.cells[cellIndex(state.rows, state.cols, row, col)];
  return !cell.ownerId || cell.ownerId === playerId;
}

export function activePlayerIds(state: ChainState, playerOrder: PlayerId[]): PlayerId[] {
  return playerOrder.filter((id) => !state.eliminatedPlayerIds.includes(id));
}

export function nextActivePlayer(
  state: ChainState,
  playerOrder: PlayerId[],
  afterPlayerId: PlayerId,
): PlayerId | null {
  if (playerOrder.length === 0) return null;
  const index = playerOrder.indexOf(afterPlayerId);
  // If the player is no longer in the order (left the room), start just before
  // the first seat so the loop still visits every remaining player.
  const start = index >= 0 ? index : -1;
  for (let step = 1; step <= playerOrder.length; step++) {
    const candidate = playerOrder[(start + step + playerOrder.length) % playerOrder.length];
    if (!state.eliminatedPlayerIds.includes(candidate)) return candidate;
  }
  return null;
}

function cloneCells(cells: ChainCell[]): ChainCell[] {
  return cells.map((cell) => ({ ownerId: cell.ownerId, orbs: cell.orbs }));
}

/**
 * Applies one placement and the full cascade of explosions that follows it.
 * The board is authoritative: every orb that a chain converts changes owner.
 */
export function applyChainMove(
  state: ChainState,
  playerId: PlayerId,
  row: number,
  col: number,
  playerOrder: PlayerId[],
  now: number,
  turnTimeSeconds: number,
): ChainMoveResult | null {
  if (!canPlace(state, playerId, row, col)) return null;

  const rows = state.rows;
  const cols = state.cols;
  const cells = cloneCells(state.cells);
  const beforeOwners = new Set<PlayerId>();
  for (const cell of cells) {
    if (cell.ownerId && cell.orbs > 0) beforeOwners.add(cell.ownerId);
  }

  const placedIndex = cellIndex(rows, cols, row, col);
  cells[placedIndex].ownerId = playerId;
  cells[placedIndex].orbs += 1;

  const queue: ChainCellPosition[] = [{ row, col }];
  let head = 0;
  let explosions = 0;
  let captured = 0;
  const explosionLog: ChainExplosion[] = [];

  while (head < queue.length && explosions < CHAIN_MAX_EXPLOSIONS) {
    const position = queue[head++];
    const index = cellIndex(rows, cols, position.row, position.col);
    const cell = cells[index];
    if (!cell.ownerId) continue;

    const mass = criticalMass(position.row, position.col, rows, cols);
    if (cell.orbs < mass) continue;

    const owner = cell.ownerId;
    cell.orbs -= mass;
    explosions += 1;
    explosionLog.push({ row: position.row, col: position.col, ownerId: owner });

    // A cell that still holds a critical mass explodes again after it has shed one wave.
    if (cell.orbs >= mass) {
      queue.push({ row: position.row, col: position.col });
    }

    for (const next of neighbors(position.row, position.col, rows, cols)) {
      const nextIndex = cellIndex(rows, cols, next.row, next.col);
      const target = cells[nextIndex];
      if (target.ownerId && target.ownerId !== owner && target.orbs > 0) {
        captured += target.orbs;
      }
      target.ownerId = owner;
      target.orbs += 1;
      queue.push(next);
    }
  }

  const eliminated: PlayerId[] = [];
  for (const owner of beforeOwners) {
    if (state.eliminatedPlayerIds.includes(owner)) continue;
    if (countOrbs(cells, owner) === 0) eliminated.push(owner);
  }

  const eliminatedPlayerIds = [...state.eliminatedPlayerIds, ...eliminated];
  const active = playerOrder.filter((id) => !eliminatedPlayerIds.includes(id));
  const winnerId = active.length <= 1 ? active[0] ?? playerId : null;
  const nextTurnPlayerId = winnerId ? null : nextActivePlayer(
    { ...state, eliminatedPlayerIds },
    playerOrder,
    playerId,
  );

  const move: ChainMove = {
    playerId,
    row,
    col,
    explosions: explosionLog,
    captured,
    orbsPlaced: 1,
  };

  return {
    state: {
      ...state,
      cells,
      eliminatedPlayerIds,
      winnerId,
      lastMove: move,
      turnPlayerId: nextTurnPlayerId,
      turnEndsAt: winnerId ? null : now + turnTimeSeconds * 1000,
      moveCount: state.moveCount + 1,
    },
    move,
    eliminated,
    winnerId,
  };
}

/** Removes a player from the board. Used for a surrender or a player who left for good. */
export function removeChainPlayer(
  state: ChainState,
  playerId: PlayerId,
  playerOrder: PlayerId[],
  now: number,
  turnTimeSeconds: number,
): ChainState | null {
  if (state.eliminatedPlayerIds.includes(playerId) || state.winnerId) return null;

  const cells = cloneCells(state.cells).map((cell) =>
    cell.ownerId === playerId ? { ownerId: null, orbs: 0 } : cell,
  );
  const eliminatedPlayerIds = [...state.eliminatedPlayerIds, playerId];
  const active = playerOrder.filter((id) => !eliminatedPlayerIds.includes(id));
  const winnerId = active.length <= 1 ? active[0] ?? null : null;
  const nextTurnPlayerId =
    state.turnPlayerId === playerId && !winnerId
      ? nextActivePlayer({ ...state, eliminatedPlayerIds }, playerOrder, playerId)
      : winnerId
        ? null
        : state.turnPlayerId;

  return {
    ...state,
    cells,
    eliminatedPlayerIds,
    winnerId,
    turnPlayerId: nextTurnPlayerId,
    turnEndsAt: winnerId ? null : now + turnTimeSeconds * 1000,
  };
}

/** Picks a legal cell for a turn that ran out. Own cells that are one orb from exploding go first. */
export function pickAutoMove(state: ChainState, playerId: PlayerId): ChainCellPosition | null {
  const options: ChainCellPosition[] = [];
  const dangerous: ChainCellPosition[] = [];

  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.cols; col++) {
      if (!canPlace(state, playerId, row, col)) continue;
      const cell = state.cells[cellIndex(state.rows, state.cols, row, col)];
      const position = { row, col };
      options.push(position);
      if (cell.ownerId === playerId) {
        const mass = criticalMass(row, col, state.rows, state.cols);
        if (cell.orbs + 1 >= mass) dangerous.push(position);
      }
    }
  }

  const pool = dangerous.length > 0 ? dangerous : options;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function rankChainPlayers(
  state: ChainState,
  playerOrder: PlayerId[],
): PlayerId[] {
  if (state.winnerId) {
    const rest = [...state.eliminatedPlayerIds].reverse();
    const survivors = playerOrder
      .filter((id) => id !== state.winnerId && !state.eliminatedPlayerIds.includes(id))
      .sort((a, b) => countOrbs(state.cells, b) - countOrbs(state.cells, a));
    return [state.winnerId, ...survivors, ...rest];
  }

  return [...playerOrder].sort((a, b) => {
    const eliminatedA = state.eliminatedPlayerIds.includes(a);
    const eliminatedB = state.eliminatedPlayerIds.includes(b);
    if (eliminatedA !== eliminatedB) return eliminatedA ? 1 : -1;
    if (eliminatedA && eliminatedB) {
      return state.eliminatedPlayerIds.indexOf(b) - state.eliminatedPlayerIds.indexOf(a);
    }
    return countOrbs(state.cells, b) - countOrbs(state.cells, a);
  });
}

import { CHAIN_COLS, CHAIN_ROWS, PLAYER_COLORS } from "@yaply/shared/constants";

type MiniBoardProps = {
  rows?: number;
  cols?: number;
  /** Optional palette so the preview matches the selected table colours. */
  colors?: string[];
};

type MiniSeed = { row: number; col: number; slot: number; count: number };

/**
 * Decorative starting position, expressed as fractions of the board. It reads
 * the same at every board preset and never claims to be a real game state.
 */
const SEEDS: MiniSeed[] = [
  { row: 0.14, col: 0.1, slot: 0, count: 1 },
  { row: 0.27, col: 0.09, slot: 0, count: 2 },
  { row: 0.16, col: 0.3, slot: 0, count: 1 },
  { row: 0.36, col: 0.46, slot: 1, count: 2 },
  { row: 0.5, col: 0.52, slot: 1, count: 1 },
  { row: 0.66, col: 0.28, slot: 2, count: 2 },
  { row: 0.46, col: 0.18, slot: 2, count: 1 },
  { row: 0.5, col: 0.78, slot: 3, count: 1 },
  { row: 0.68, col: 0.86, slot: 3, count: 1 },
  { row: 0.2, col: 0.9, slot: 4, count: 1 },
];

export function MiniBoard({ rows = CHAIN_ROWS, cols = CHAIN_COLS, colors }: MiniBoardProps) {
  const palette = colors && colors.length > 0 ? colors : PLAYER_COLORS;
  const cells = new Map<string, { slot: number; count: number }>();

  for (const seed of SEEDS) {
    const row = Math.min(rows - 1, Math.floor(seed.row * rows));
    const col = Math.min(cols - 1, Math.floor(seed.col * cols));
    const key = `${row}-${col}`;
    const existing = cells.get(key);
    cells.set(key, {
      slot: seed.slot,
      count: Math.min(3, (existing?.count ?? 0) + seed.count),
    });
  }

  return (
    <div
      className="mini-board"
      aria-hidden
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows * cols }).map((_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const orb = cells.get(`${row}-${col}`);
        const count = orb?.count ?? 0;
        const color = palette[(orb?.slot ?? 0) % palette.length];
        return (
          <span className="mini-cell" data-armed={count === 2 ? "true" : "false"} key={index}>
            <span style={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
              {Array.from({ length: count }).map((_, dot) => (
                <i className="mini-orb" style={{ background: color }} key={dot} />
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

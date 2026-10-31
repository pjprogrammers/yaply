import { CHAIN_COLS, CHAIN_ROWS } from "@yaply/shared/constants";

type MiniOrb = { color: string; count?: number };

const BLUE = "#4cb3f0";
const AMBER = "#f2b33d";
const RED = "#e5484d";
const LIME = "#c6f24e";

const PATTERN: Record<string, MiniOrb> = {
  "1-1": { color: BLUE },
  "1-2": { color: BLUE },
  "2-1": { color: BLUE, count: 2 },
  "2-4": { color: AMBER },
  "3-4": { color: AMBER, count: 2 },
  "3-5": { color: AMBER },
  "4-2": { color: RED },
  "4-3": { color: RED },
  "5-2": { color: RED, count: 2 },
  "4-7": { color: LIME },
  "5-7": { color: LIME },
  "2-8": { color: "#e6e6e6" },
};

export function MiniBoard() {
  return (
    <div className="mini-board" aria-hidden>
      {Array.from({ length: CHAIN_ROWS * CHAIN_COLS }).map((_, index) => {
        const row = Math.floor(index / CHAIN_COLS);
        const col = index % CHAIN_COLS;
        const orb = PATTERN[`${row}-${col}`];
        const count = orb?.count ?? (orb ? 1 : 0);
        return (
          <span className="mini-cell" data-armed={count === 2 ? "true" : "false"} key={index}>
            <span style={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
              {Array.from({ length: count }).map((_, dot) => (
                <i className="mini-orb" style={{ background: orb?.color }} key={dot} />
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

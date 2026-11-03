"use client";

import { useEffect, useState } from "react";
import { PLAYER_COLORS } from "@yaply/shared/constants";
import { PlayIcon } from "./icons";

const ROWS = 6;
const COLS = 9;
const TRIGGER = { row: 0, col: 0, player: 0 };
const NAMES = ["Mara", "Jules", "Niko", "Ari"];
const PLAYERS = [0, 1, 2, 3];

/** A mid-game position with the top-left corner one orb from popping. */
const SEEDS: Array<[row: number, col: number, owner: number, count: number]> = [
  [0, 0, 0, 1],
  [0, 1, 0, 2],
  [0, 2, 1, 2],
  [1, 0, 0, 2],
  [1, 1, 1, 2],
  [1, 2, 2, 3],
  [2, 2, 2, 2],
  [2, 4, 3, 1],
  [3, 4, 1, 1],
  [3, 6, 2, 1],
  [3, 7, 3, 1],
  [4, 7, 2, 2],
  [4, 8, 2, 1],
  [5, 6, 3, 2],
  [5, 8, 3, 1],
  [2, 6, 1, 1],
];

type DemoCell = { owner: number | null; count: number };
type DemoFrame = {
  cells: DemoCell[];
  popped: [number, number] | null;
  changed: string[];
};

const index = (row: number, col: number) => row * COLS + col;
const keyOf = (row: number, col: number) => `${row}:${col}`;
const cloneCells = (cells: DemoCell[]) => cells.map((cell) => ({ ...cell }));

function criticalMassAt(row: number, col: number): number {
  let edges = 0;
  if (row === 0) edges += 1;
  if (row === ROWS - 1) edges += 1;
  if (col === 0) edges += 1;
  if (col === COLS - 1) edges += 1;
  return 4 - edges;
}

function neighboursOf(row: number, col: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (row > 0) out.push([row - 1, col]);
  if (row < ROWS - 1) out.push([row + 1, col]);
  if (col > 0) out.push([row, col - 1]);
  if (col < COLS - 1) out.push([row, col + 1]);
  return out;
}

function changedBetween(before: DemoCell[], after: DemoCell[]): string[] {
  const changed: string[] = [];
  for (let i = 0; i < after.length; i++) {
    if (before[i].owner !== after[i].owner || before[i].count !== after[i].count) {
      changed.push(`${Math.floor(i / COLS)}:${i % COLS}`);
    }
  }
  return changed;
}

function buildDemo() {
  const cells: DemoCell[] = Array.from({ length: ROWS * COLS }, () => ({
    owner: null,
    count: 0,
  }));
  for (const [row, col, owner, count] of SEEDS) {
    cells[index(row, col)] = { owner, count };
  }
  const initial = cloneCells(cells);

  cells[index(TRIGGER.row, TRIGGER.col)] = {
    owner: TRIGGER.player,
    count: cells[index(TRIGGER.row, TRIGGER.col)].count + 1,
  };

  const frames: DemoFrame[] = [
    {
      cells: cloneCells(cells),
      popped: null,
      changed: [keyOf(TRIGGER.row, TRIGGER.col)],
    },
  ];

  const queue: Array<[number, number]> = [[TRIGGER.row, TRIGGER.col]];
  let head = 0;
  let pops = 0;

  while (head < queue.length && pops < 60) {
    const [row, col] = queue[head++];
    const cell = cells[index(row, col)];
    if (cell.owner === null) continue;
    const mass = criticalMassAt(row, col);
    if (cell.count < mass) continue;

    const before = cloneCells(cells);
    const owner = cell.owner;
    cell.count -= mass;
    pops += 1;

    if (cell.count >= mass) queue.push([row, col]);

    for (const [nextRow, nextCol] of neighboursOf(row, col)) {
      const target = cells[index(nextRow, nextCol)];
      target.owner = owner;
      target.count += 1;
      queue.push([nextRow, nextCol]);
    }

    frames.push({
      cells: cloneCells(cells),
      popped: [row, col],
      changed: changedBetween(before, cells),
    });
  }

  const totals = PLAYERS.map((player) =>
    cells
      .filter((cell) => cell.owner === player)
      .reduce((total, cell) => total + cell.count, 0),
  );

  return { initial, frames, totals };
}

const DEMO = buildDemo();

function totalsFor(cells: DemoCell[]): number[] {
  return PLAYERS.map((player) =>
    cells
      .filter((cell) => cell.owner === player)
      .reduce((total, cell) => total + cell.count, 0),
  );
}

export function ChainHeroBoard() {
  const [step, setStep] = useState(-1);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");

  const frame = step < 0 ? null : DEMO.frames[step];
  const cells = frame?.cells ?? DEMO.initial;
  const totals = totalsFor(cells);
  const popped = frame?.popped ?? null;
  const pops = step < 0 ? 0 : DEMO.frames.slice(0, step + 1).filter((item) => item.popped).length;
  const finished = phase === "done";
  const playing = phase === "playing";

  useEffect(() => {
    if (phase !== "playing") return;
    const last = DEMO.frames.length - 1;
    const delay = step === 0 ? 680 : 340;
    const timer = window.setTimeout(() => {
      if (step >= last) {
        setPhase("done");
      } else {
        setStep(step + 1);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [phase, step]);

  const run = () => {
    if (playing) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStep(DEMO.frames.length - 1);
      setPhase("done");
      return;
    }
    setStep(0);
    setPhase("playing");
  };

  const caption = playing
    ? step === 0
      ? "Orb placed. The corner hits critical mass."
      : `Chain running — ${pops} ${pops === 1 ? "pop" : "pops"} so far.`
    : finished
      ? `The chain settles. Blue owns ${totals[0]} orbs.`
      : "Mara's corner is one orb from popping. Run it.";

  const boardKey = step < 0 ? "initial" : `frame-${step}`;

  return (
    <div className="cr-demo-wrap">
      <div className="cr-demo">
        <div className="cr-demo-head">
          <span className="cr-demo-room">
            <i className="cr-demo-live" aria-hidden />
            Demo table · FUSE42
          </span>
          <span className="cr-demo-meta">
            {pops > 0 ? `${pops} ${pops === 1 ? "pop" : "pops"}` : "6 × 9"} · turn 12
          </span>
        </div>

        <div className="cr-demo-board-shell">
          <div className="cr-demo-board" key={boardKey} aria-hidden>
            {cells.map((cell, cellIndex) => {
              const row = Math.floor(cellIndex / COLS);
              const col = cellIndex % COLS;
              const cellKey = keyOf(row, col);
              const isPopped = popped?.[0] === row && popped?.[1] === col;
              const isChanged = Boolean(frame?.changed.includes(cellKey));
              const isArmed = step < 0 && row === TRIGGER.row && col === TRIGGER.col;
              return (
                <span
                  className={[
                    "cr-demo-cell",
                    isArmed ? "is-armed" : "",
                    isPopped ? "is-popped" : "",
                    isChanged && !isPopped ? "is-changed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={cellKey}
                >
                  {cell.owner !== null && cell.count > 0 && (
                    <span className="cr-demo-orbs">
                      {Array.from({ length: Math.min(cell.count, 6) }).map((_, orb) => (
                        <i
                          key={orb}
                          style={{ background: PLAYER_COLORS[cell.owner as number] }}
                        />
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div className="cr-demo-players">
          {NAMES.map((name, player) => (
            <span className="cr-demo-chip" key={name}>
              <i style={{ background: PLAYER_COLORS[player] }} aria-hidden />
              {name}
              <b>{totals[player]}</b>
            </span>
          ))}
        </div>

        <div className="cr-demo-foot">
          <p className="cr-demo-caption" aria-live="polite">
            {caption}
          </p>
          <button
            className="cr-demo-run"
            type="button"
            onClick={run}
            disabled={playing}
          >
            <PlayIcon size={12} />
            {playing ? "Chaining…" : finished ? "Run it again" : "Run the chain"}
          </button>
        </div>
      </div>
    </div>
  );
}

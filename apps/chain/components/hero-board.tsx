"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "@yaply/shared/constants";
import type { ChainMove, ChainState, Player } from "@yaply/shared/types";
import { ChainScene, type ChainSceneState } from "@/lib/chain-scene";
import { PlayIcon } from "./icons";

const ROWS = 6;
const COLS = 11;
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
  [2, 7, 1, 1],
  [2, 9, 0, 1],
  [3, 4, 1, 1],
  [3, 6, 2, 1],
  [3, 8, 3, 1],
  [3, 10, 2, 2],
  [4, 5, 3, 2],
  [4, 8, 2, 2],
  [4, 10, 2, 1],
  [5, 3, 1, 2],
  [5, 6, 3, 2],
  [5, 9, 1, 1],
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
const MAX_POPS = DEMO.frames.length - 1;

const demoPlayerId = (player: number) => `hero-${player}`;

const DEMO_PLAYERS: Player[] = PLAYERS.map((player) => ({
  id: demoPlayerId(player),
  nickname: NAMES[player],
  avatar: "",
  color: PLAYER_COLORS[player],
  score: 0,
  connected: true,
  guessedCorrectly: false,
  joinedAt: 0,
}));

function demoChain(
  cells: DemoCell[],
  moveCount: number,
  lastMove: ChainMove | null,
): ChainState {
  return {
    rows: ROWS,
    cols: COLS,
    cells: cells.map((cell) => ({
      ownerId: cell.owner === null ? null : demoPlayerId(cell.owner),
      orbs: cell.count,
    })),
    turnPlayerId: demoPlayerId(TRIGGER.player),
    eliminatedPlayerIds: [],
    winnerId: null,
    lastMove,
    turnEndsAt: null,
    moveCount,
  };
}

function demoLastMove(step: number): ChainMove | null {
  if (step === 0) {
    return {
      playerId: demoPlayerId(TRIGGER.player),
      row: TRIGGER.row,
      col: TRIGGER.col,
      explosions: [],
      captured: 0,
      orbsPlaced: 1,
    };
  }

  const popped = step > 0 ? DEMO.frames[step]?.popped : null;
  if (!popped) return null;

  const [row, col] = popped;
  const owner =
    DEMO.frames[step - 1]?.cells[index(row, col)].owner ?? TRIGGER.player;
  return {
    playerId: demoPlayerId(owner),
    row,
    col,
    explosions: [{ row, col, ownerId: demoPlayerId(owner) }],
    captured: 0,
    orbsPlaced: 0,
  };
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ChainScene | null>(null);

  const frame = step < 0 ? null : DEMO.frames[step];
  const cells = frame?.cells ?? DEMO.initial;
  const totals = totalsFor(cells);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const state: ChainSceneState = {
      chain: demoChain(DEMO.initial, 0, null),
      players: DEMO_PLAYERS,
      meId: null,
      canPlay: false,
      selected: { row: TRIGGER.row, col: TRIGGER.col },
      flash: new Set(),
      theme: "dark",
    };

    const scene = new ChainScene(canvas, state, { idleMotion: false });
    sceneRef.current = scene;

    const onResize = () => scene.resize();
    const observer = new ResizeObserver(onResize);
    observer.observe(stage);
    window.addEventListener("resize", onResize);
    scene.resize();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const nextFrame = step < 0 ? null : DEMO.frames[step];
    const cells = nextFrame?.cells ?? DEMO.initial;
    const flash = new Set(nextFrame?.changed ?? []);

    scene.update({
      chain: demoChain(cells, step + 1, demoLastMove(step)),
      players: DEMO_PLAYERS,
      meId: null,
      canPlay: false,
      selected: step < 0 ? { row: TRIGGER.row, col: TRIGGER.col } : null,
      flash,
      theme: "dark",
    });
    scene.pulseCells(flash);
  }, [step]);

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

  return (
    <div className="cr-demo-wrap">
      <div className="cr-demo-aura" aria-hidden />

      <div className="cr-demo-hud cr-demo-hud--timer" aria-hidden>
        <span className="cr-demo-hud-label">Turn</span>
        <strong className="cr-demo-hud-value">0:31</strong>
        <span className="cr-demo-hud-track">
          <i />
        </span>
      </div>

      <div className="cr-demo-cube" aria-hidden>
        <span className="cr-demo-cube-face cr-demo-cube-face--front">4</span>
        <span className="cr-demo-cube-face cr-demo-cube-face--right" />
        <span className="cr-demo-cube-face cr-demo-cube-face--top">Mass</span>
      </div>

      <div className="cr-demo-float">
        <div className="cr-demo-rig">
          <div className="cr-demo">
            <div className="cr-demo-head">
              <span className="cr-demo-room">
                <i className="cr-demo-live" aria-hidden />
                Demo table · FUSE42
              </span>
              <span className="cr-demo-meta">
                {pops > 0 ? `${pops} ${pops === 1 ? "pop" : "pops"}` : `${COLS} × ${ROWS}`} · turn 12
              </span>
            </div>

            <div className="cr-demo-board-shell">
              <div className="cr-demo-canvas-stage" ref={stageRef} aria-hidden>
                <canvas ref={canvasRef} className="cr-demo-canvas" />
              </div>
            </div>

            <div className="cr-demo-meter" aria-hidden>
              <span>Chain</span>
              <div>
                {Array.from({ length: MAX_POPS }).map((_, index) => (
                  <i className={index < pops ? "is-on" : ""} key={index} />
                ))}
              </div>
              <b>
                {pops}/{MAX_POPS}
              </b>
            </div>

            <div className="cr-demo-players">
              {NAMES.map((name, player) => (
                <span className="cr-demo-chip" key={name}>
                  <i style={{ background: PLAYER_COLORS[player] }} aria-hidden />
                  {name}
                  <b className={pops > 0 ? "is-live" : ""} key={totals[player]}>
                    {totals[player]}
                  </b>
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
      </div>
    </div>
  );
}

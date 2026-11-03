"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChainState, ChainTheme, Player } from "@yaply/shared/types";
import { boardTheme } from "@/lib/board-theme";
import { alpha, darken, lighten } from "@/lib/colors";
import type { ChainCellSelection } from "./board";
import { isPlayableCell } from "./board";

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
  selected: ChainCellSelection | null;
  onCancel: () => void;
  theme: ChainTheme;
};

type Layout = {
  width: number;
  height: number;
  originX: number;
  originY: number;
  cell: number;
  gridW: number;
  gridH: number;
};

type Ball = { dx: number; dy: number; r: number };

type Particle = {
  row: number;
  col: number;
  vx: number;
  vy: number;
  color: string;
  start: number;
  life: number;
  size: number;
};

type Ring = {
  row: number;
  col: number;
  color: string;
  start: number;
  life: number;
};

/** Long enough for a short cascade of delayed explosion rings. */
const ANIMATION_MS = 1400;
const MAX_ANIMATED_EXPLOSIONS = 24;

function easeOut(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - clamped, 3);
}

function makeLayout(rows: number, cols: number, width: number, height: number): Layout {
  // Keep a small breathing margin, like the reference image; then make every
  // cell a square, even when the container is not exactly board-shaped.
  const pad = Math.max(7, Math.min(width, height) * 0.032);
  const cell = Math.max(
    6,
    Math.min(
      (width - pad * 2) / Math.max(1, cols),
      (height - pad * 2) / Math.max(1, rows),
    ),
  );
  const gridW = cell * cols;
  const gridH = cell * rows;
  return {
    width,
    height,
    originX: (width - gridW) / 2,
    originY: (height - gridH) / 2,
    cell,
    gridW,
    gridH,
  };
}

/**
 * The reference is a wall of shallow cubbies. The bevel is almost invisible at
 * the centre of the wall and deepens toward every edge, which gives the grid a
 * soft lens-like bulge without using a perspective camera.
 */
function bevelFor(row: number, col: number, rows: number, cols: number, cell: number) {
  const nx = Math.abs(((col + 0.5) / cols) * 2 - 1);
  const ny = Math.abs(((row + 0.5) / rows) * 2 - 1);
  const edge = Math.max(nx, ny);
  const weight = Math.pow(edge, 1.2);
  return {
    x: cell * (0.055 + 0.145 * weight),
    y: cell * (0.07 + 0.37 * weight),
  };
}

function baseBallLayout(count: number): Ball[] {
  if (count <= 1) return [{ dx: 0, dy: 0, r: 0.3 }];
  if (count === 2) {
    return [
      { dx: -0.12, dy: -0.015, r: 0.255 },
      { dx: 0.12, dy: 0.015, r: 0.255 },
    ];
  }
  if (count === 3) {
    return [
      { dx: 0.005, dy: -0.13, r: 0.25 },
      { dx: -0.15, dy: 0.12, r: 0.225 },
      { dx: 0.16, dy: 0.11, r: 0.23 },
    ];
  }
  if (count === 4) {
    return [
      { dx: -0.145, dy: -0.135, r: 0.215 },
      { dx: 0.145, dy: -0.135, r: 0.215 },
      { dx: -0.145, dy: 0.135, r: 0.215 },
      { dx: 0.145, dy: 0.135, r: 0.215 },
    ];
  }
  const ringCount = Math.min(count, 8);
  const ringRadius = count > 6 ? 0.285 : 0.26;
  const ballRadius = count > 6 ? 0.125 : 0.145;
  return Array.from({ length: ringCount }, (_, index) => {
    const angle = (index / ringCount) * Math.PI * 2 - Math.PI / 2;
    return {
      dx: Math.cos(angle) * ringRadius,
      dy: Math.sin(angle) * ringRadius,
      r: ballRadius,
    };
  });
}

/** A little deterministic wobble keeps the clusters from looking machine-made. */
function clusterBalls(count: number, row: number, col: number): Ball[] {
  return baseBallLayout(count)
    .map((ball, index) => {
      const wobble = Math.sin(row * 12.9898 + col * 78.233 + index * 37.719);
      const wobble2 = Math.sin(row * 4.13 + col * 93.27 + index * 11.7);
      return {
        dx: ball.dx + wobble * 0.012,
        dy: ball.dy + wobble2 * 0.01,
        r: ball.r * (0.97 + (wobble + 1) * 0.03),
      };
    })
    .sort((a, b) => a.dy - b.dy);
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  neon: boolean,
): void {
  if (radius < 0.5) return;

  const gradient = ctx.createRadialGradient(
    x - radius * 0.34,
    y - radius * 0.38,
    radius * 0.02,
    x,
    y,
    radius * 1.04,
  );
  gradient.addColorStop(0, lighten(color, 0.18));
  gradient.addColorStop(0.32, color);
  gradient.addColorStop(0.66, color);
  gradient.addColorStop(0.86, darken(color, 0.24));
  gradient.addColorStop(1, darken(color, 0.5));

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (neon) {
    ctx.shadowColor = alpha(color, 0.58);
    ctx.shadowBlur = radius * 1.1;
  }
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Broad, soft sheen rather than a hard specular dot.
  const sheen = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.34,
    0,
    x - radius * 0.3,
    y - radius * 0.34,
    radius * 0.62,
  );
  sheen.addColorStop(0, alpha(lighten(color, 0.34), 0.28));
  sheen.addColorStop(1, alpha(lighten(color, 0.34), 0));
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = sheen;
  ctx.fill();

  // Elastic dark rim.
  ctx.strokeStyle = alpha(darken(color, 0.58), 0.58);
  ctx.lineWidth = Math.max(0.6, radius * 0.07);
  ctx.stroke();

  // A soft reflected edge along the bottom keeps the gummy volume readable.
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.84, Math.PI * 0.2, Math.PI * 0.82);
  ctx.strokeStyle = alpha(darken(color, 0.46), 0.22);
  ctx.lineWidth = Math.max(0.5, radius * 0.07);
  ctx.stroke();
}

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
  const hoverRef = useRef<{ row: number; col: number } | null>(null);
  const cursorRef = useRef<{ row: number; col: number }>({ row: 0, col: 0 });
  const animationStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const drawRef = useRef<(now: number) => void>(() => {});
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
  }, [chain, players, meId, canPlay, onPlace, onPlaceNow, flash, selected, onCancel, theme]);

  const palette = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of players) map.set(player.id, player.color);
    return map;
  }, [players]);

  const colors = useMemo(() => boardTheme(theme), [theme]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) return;
    const tick = (now: number) => {
      rafRef.current = null;
      drawRef.current(now);
      if (now - animationStartRef.current < ANIMATION_MS) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };
    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width <= 0 || height <= 0) return;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const props = propsRef.current;
      const board = props.chain;
      const layout = makeLayout(board.rows, board.cols, width, height);
      const { originX, originY, cell, gridW, gridH } = layout;
      const selectedCell = props.selected;
      const hovered = hoverRef.current;
      const lastMove = board.lastMove;
      const elapsed = now - animationStartRef.current;
      const placementScale =
        lastMove && elapsed < 340 ? 0.55 + easeOut(elapsed / 340) * 0.45 : 1;
      const cursor = cursorRef.current;

      // The reference's quiet vertical wash.
      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, colors.gradientTop);
      background.addColorStop(0.32, colors.gradientMid);
      background.addColorStop(0.68, colors.gradientMid);
      background.addColorStop(1, colors.gradientBottom);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(
        width / 2,
        height * 0.16,
        0,
        width / 2,
        height * 0.16,
        Math.max(width, height) * 0.74,
      );
      glow.addColorStop(0, colors.haze);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // A barely perceptible tint separates the lattice from the outer wash.
      ctx.fillStyle = colors.cellTint;
      ctx.fillRect(originX, originY, gridW, gridH);

      // Cell fills sit beneath every line.
      for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
          const isSelected = selectedCell?.row === row && selectedCell?.col === col;
          const isHovered = hovered?.row === row && hovered?.col === col;
          const playable = isPlayableCell(props.chain, props.meId, props.canPlay, row, col);
          if (!isSelected && !(isHovered && playable)) continue;
          ctx.fillStyle = isSelected ? colors.selectedFill : colors.hoverFill;
          ctx.fillRect(
            originX + col * cell,
            originY + row * cell,
            cell,
            cell,
          );
        }
      }

      // Cubbies: one shallow top/left wall, drawn only with hairlines.
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1;
      for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
          const x0 = originX + col * cell;
          const y0 = originY + row * cell;
          const x1 = x0 + cell;
          const y1 = y0 + cell;
          const bevel = bevelFor(row, col, board.rows, board.cols, cell);
          const cornerX = x0 + bevel.x;
          const cornerY = y0 + bevel.y;

          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(cornerX, cornerY);
          ctx.lineTo(cornerX, y1);
          ctx.moveTo(cornerX, cornerY);
          ctx.lineTo(x1, cornerY);
          ctx.stroke();
        }
      }

      // The main lattice.
      ctx.strokeStyle = colors.gridLine;
      for (let col = 0; col <= board.cols; col++) {
        const x = Math.round(originX + col * cell) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, originY);
        ctx.lineTo(x, originY + gridH);
        ctx.stroke();
      }
      for (let row = 0; row <= board.rows; row++) {
        const y = Math.round(originY + row * cell) + 0.5;
        ctx.beginPath();
        ctx.moveTo(originX, y);
        ctx.lineTo(originX + gridW, y);
        ctx.stroke();
      }

      // Outer rim, a touch brighter than the interior.
      ctx.strokeStyle = colors.gridLineStrong;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(
        Math.round(originX) + 0.5,
        Math.round(originY) + 0.5,
        Math.round(gridW) - 1,
        Math.round(gridH) - 1,
      );

      // Last move is a quiet owner-coloured edge, not a heavy ring.
      if (lastMove) {
        const color = palette.get(lastMove.playerId) ?? colors.accent;
        ctx.strokeStyle = alpha(color, 0.72);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          originX + lastMove.col * cell + 1,
          originY + lastMove.row * cell + 1,
          cell - 2,
          cell - 2,
        );
      }

      if (selectedCell) {
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          originX + selectedCell.col * cell + 1,
          originY + selectedCell.row * cell + 1,
          cell - 2,
          cell - 2,
        );
      } else if (
        hovered &&
        isPlayableCell(board, props.meId, props.canPlay, hovered.row, hovered.col)
      ) {
        ctx.strokeStyle = alpha(colors.accent, 0.58);
        ctx.lineWidth = 1.2;
        ctx.strokeRect(
          originX + hovered.col * cell + 1,
          originY + hovered.row * cell + 1,
          cell - 2,
          cell - 2,
        );
      }

      // Rings left by explosions.
      ringsRef.current = ringsRef.current.filter((ring) => now - ring.start < ring.life);
      for (const ring of ringsRef.current) {
        if (now < ring.start) continue;
        const age = (now - ring.start) / ring.life;
        const cx = originX + (ring.col + 0.5) * cell;
        const cy = originY + (ring.row + 0.5) * cell;
        const radius = cell * (0.12 + age * 0.48);
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius, radius * 0.88, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(ring.color, (1 - age) * 0.6);
        ctx.lineWidth = Math.max(1, 2.4 * (1 - age));
        ctx.stroke();
      }

      // Balls, painted as overlapping gummy clusters.
      for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
          const cellState = board.cells[row * board.cols + col];
          if (cellState.orbs <= 0) continue;
          const color = (cellState.ownerId ? palette.get(cellState.ownerId) : undefined) ?? colors.text;
          const count = Math.min(cellState.orbs, 8);
          const balls = clusterBalls(count, row, col);
          const isLastCell = lastMove?.row === row && lastMove?.col === col;
          const scale = isLastCell ? placementScale : 1;
          const centerX = originX + (col + 0.5) * cell;
          const centerY = originY + (row + 0.5) * cell;
          const bevel = bevelFor(row, col, board.rows, board.cols, cell);

          // Nudge the cluster toward the back face just enough to sit in the cubby.
          const clusterX = centerX + bevel.x * 0.12;
          const clusterY = centerY + bevel.y * 0.1;

          for (const ball of balls) {
            drawBall(
              ctx,
              clusterX + ball.dx * cell,
              clusterY + ball.dy * cell,
              ball.r * cell * scale,
              color,
              theme === "neon",
            );
          }
        }
      }

      // Explosion droplets.
      particlesRef.current = particlesRef.current.filter(
        (particle) => now - particle.start < particle.life,
      );
      for (const particle of particlesRef.current) {
        if (now < particle.start) continue;
        const age = (now - particle.start) / particle.life;
        const seconds = (now - particle.start) / 1000;
        const x = originX + (particle.col + 0.5 + particle.vx * seconds) * cell;
        const y =
          originY + (particle.row + 0.5 + particle.vy * seconds + 1.9 * seconds * seconds) * cell;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, particle.size * cell * (1 - age * 0.55)), 0, Math.PI * 2);
        ctx.fillStyle = alpha(particle.color, (1 - age) * 0.9);
        ctx.fill();
      }

      // Keyboard cursor.
      if (
        document.activeElement === canvas &&
        !selectedCell &&
        !(hovered?.row === cursor.row && hovered?.col === cursor.col)
      ) {
        ctx.strokeStyle = alpha(colors.text, 0.38);
        ctx.lineWidth = 1.2;
        ctx.strokeRect(
          originX + cursor.col * cell + 2,
          originY + cursor.row * cell + 2,
          cell - 4,
          cell - 4,
        );
      }
    },
    [colors, palette, theme],
  );

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const observer = new ResizeObserver(() => scheduleDraw());
    observer.observe(wrapper);
    scheduleDraw();
    return () => {
      observer.disconnect();
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [scheduleDraw]);

  useEffect(() => {
    scheduleDraw();
  }, [chain, players, canPlay, selected, theme, flash, scheduleDraw]);

  useEffect(() => {
    const lastMove = chain.lastMove;
    if (!lastMove) return;
    const now = performance.now();
    animationStartRef.current = now;
    const colorsByPlayer = new Map(players.map((player) => [player.id, player.color]));
    const rings: Ring[] = [];
    const particles: Particle[] = [];
    // A long cascade can log hundreds of explosions. Animate the first few so
    // low-end phones stay smooth; the board state is already fully resolved.
    for (const [index, explosion] of lastMove.explosions.slice(0, MAX_ANIMATED_EXPLOSIONS).entries()) {
      const color = colorsByPlayer.get(explosion.ownerId) ?? "#ffffff";
      const start = now + index * 28;
      rings.push({ row: explosion.row, col: explosion.col, color, start, life: 560 });
      const count = 7;
      for (let particleIndex = 0; particleIndex < count; particleIndex++) {
        const angle = (particleIndex / count) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 0.55 + Math.random() * 1.25;
        particles.push({
          row: explosion.row,
          col: explosion.col,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          start,
          life: 520 + Math.random() * 260,
          size: 0.035 + Math.random() * 0.045,
        });
      }
    }
    ringsRef.current = rings;
    particlesRef.current = particles;
    scheduleDraw();
  }, [chain.lastMove, chain, players, scheduleDraw]);

  const cellFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const board = propsRef.current.chain;
      const layout = makeLayout(board.rows, board.cols, rect.width, rect.height);
      const x = clientX - rect.left - layout.originX;
      const y = clientY - rect.top - layout.originY;
      if (x < 0 || y < 0 || x >= layout.gridW || y >= layout.gridH) return null;
      const col = Math.floor(x / layout.cell);
      const row = Math.floor(y / layout.cell);
      if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) return null;
      return { row, col };
    },
    [],
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellFromPoint(event.clientX, event.clientY);
    const previous = hoverRef.current;
    if (previous?.row === cell?.row && previous?.col === cell?.col) return;
    hoverRef.current = cell;
    if (cell) cursorRef.current = cell;
    scheduleDraw();
  };

  const handlePointerLeave = () => {
    if (!hoverRef.current) return;
    hoverRef.current = null;
    scheduleDraw();
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = cellFromPoint(event.clientX, event.clientY);
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
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const props = propsRef.current;
    const board = props.chain;
    const cursor = cursorRef.current;
    const next = { ...cursor };
    if (event.key === "ArrowLeft") next.col = Math.max(0, cursor.col - 1);
    else if (event.key === "ArrowRight") next.col = Math.min(board.cols - 1, cursor.col + 1);
    else if (event.key === "ArrowUp") next.row = Math.max(0, cursor.row - 1);
    else if (event.key === "ArrowDown") next.row = Math.min(board.rows - 1, cursor.row + 1);
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isPlayableCell(board, props.meId, props.canPlay, cursor.row, cursor.col)) {
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
    hoverRef.current = next;
    scheduleDraw();
  };

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
        onKeyDown={(event) => {
          delete event.currentTarget.dataset.pointerFocus;
          handleKeyDown(event);
        }}
      />
    </div>
  );
}

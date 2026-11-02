"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChainState, ChainTheme, Player } from "@yaply/shared/types";
import { boardTheme, type BoardTheme } from "@/lib/board-theme";
import { alpha, darken, lighten } from "@/lib/colors";
import type { ChainCellSelection } from "./board";
import { isPlayableCell } from "./board";

type Vec3 = { x: number; y: number; z: number };

type Camera = {
  eye: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
  f: number;
  aspect: number;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

type Projected = { x: number; y: number; depth: number };

type Particle = {
  position: Vec3;
  velocity: Vec3;
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

type Board3DProps = {
  chain: ChainState;
  players: Player[];
  meId: string | null;
  canPlay: boolean;
  onPlace: (row: number, col: number) => void;
  flash: Set<string>;
  selected: ChainCellSelection | null;
  onCancel: () => void;
  theme: ChainTheme;
};

const BOARD_THICKNESS = 0.62;
const ANIMATION_MS = 900;
const FOV = (40 * Math.PI) / 180;

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function mul(a: Vec3, scalar: number): Vec3 {
  return { x: a.x * scalar, y: a.y * scalar, z: a.z * scalar };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / length, y: a.y / length, z: a.z / length };
}

function makeCamera(rows: number, cols: number, width: number, height: number): Camera {
  const eye: Vec3 = {
    x: 0,
    y: Math.max(7.4, rows * 0.98 + 3.4),
    z: Math.max(9.5, rows * 1.12 + cols * 0.34 + 2.4),
  };
  const forward = normalize(sub({ x: 0, y: -0.1, z: 0 }, eye));
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = normalize(cross(right, forward));
  const f = 1 / Math.tan(FOV / 2);
  const aspect = width / Math.max(1, height);

  const camera: Camera = {
    eye,
    forward,
    right,
    up,
    f,
    aspect,
    width,
    height,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  const halfW = cols / 2;
  const halfD = rows / 2;
  const corners: Vec3[] = [];
  for (const x of [-halfW, halfW]) {
    for (const z of [-halfD, halfD]) {
      corners.push({ x, y: 0, z });
      corners.push({ x, y: -BOARD_THICKNESS, z });
    }
  }
  const projected = corners.map((corner) => projectRaw(camera, corner));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = Math.max(18, Math.min(width, height) * 0.075);
  const scale = Math.max(
    0.08,
    Math.min(
      (width - pad * 2) / Math.max(1, maxX - minX),
      (height - pad * 2) / Math.max(1, maxY - minY),
    ),
  );
  camera.scale = Math.min(scale, 4);
  camera.offsetX = width / 2 - ((minX + maxX) / 2) * camera.scale;
  camera.offsetY = height / 2 - ((minY + maxY) / 2) * camera.scale;
  return camera;
}

function projectRaw(camera: Camera, point: Vec3): Projected {
  const delta = sub(point, camera.eye);
  const viewX = dot(delta, camera.right);
  const viewY = dot(delta, camera.up);
  const viewZ = Math.max(0.05, dot(delta, camera.forward));
  const ndcX = ((camera.f / camera.aspect) * viewX) / viewZ;
  const ndcY = (camera.f * viewY) / viewZ;
  return {
    x: (ndcX * 0.5 + 0.5) * camera.width,
    y: (0.5 - ndcY * 0.5) * camera.height,
    depth: viewZ,
  };
}

function project(camera: Camera, point: Vec3): Projected {
  const raw = projectRaw(camera, point);
  return {
    x: raw.x * camera.scale + camera.offsetX,
    y: raw.y * camera.scale + camera.offsetY,
    depth: raw.depth,
  };
}

function worldRadius(camera: Camera, radius: number, depth: number): number {
  return ((camera.f * radius) / Math.max(0.05, depth)) * (camera.height / 2) * camera.scale;
}

function cellWorld(chain: ChainState, row: number, col: number): Vec3 {
  return {
    x: col - (chain.cols - 1) / 2,
    z: row - (chain.rows - 1) / 2,
    y: 0,
  };
}

function orbOffsets(count: number): { x: number; z: number }[] {
  if (count <= 1) return [{ x: 0, z: 0 }];
  if (count === 2) {
    return [
      { x: -0.18, z: 0 },
      { x: 0.18, z: 0 },
    ];
  }
  if (count === 3) {
    return [
      { x: 0, z: -0.17 },
      { x: -0.16, z: 0.12 },
      { x: 0.16, z: 0.12 },
    ];
  }
  if (count === 4) {
    return [
      { x: -0.17, z: -0.17 },
      { x: 0.17, z: -0.17 },
      { x: -0.17, z: 0.17 },
      { x: 0.17, z: 0.17 },
    ];
  }
  const radius = count > 6 ? 0.28 : 0.23;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  });
}

function orbRadiusFor(count: number): number {
  if (count <= 1) return 0.2;
  if (count === 2) return 0.155;
  if (count === 3) return 0.14;
  if (count === 4) return 0.12;
  return count > 6 ? 0.08 : 0.095;
}

function easeOut(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - clamped, 3);
}

function quadPath(
  ctx: CanvasRenderingContext2D,
  points: Projected[],
): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index++) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
}

function rayToCell(
  camera: Camera,
  chain: ChainState,
  screenX: number,
  screenY: number,
): { row: number; col: number } | null {
  const rawX = (screenX - camera.offsetX) / camera.scale;
  const rawY = (screenY - camera.offsetY) / camera.scale;
  const ndcX = (rawX / camera.width) * 2 - 1;
  const ndcY = 1 - (rawY / camera.height) * 2;
  const direction = normalize(
    add(
      camera.forward,
      add(
        mul(camera.right, (ndcX * camera.aspect) / camera.f),
        mul(camera.up, ndcY / camera.f),
      ),
    ),
  );
  if (Math.abs(direction.y) < 0.0001) return null;
  const t = -camera.eye.y / direction.y;
  if (t <= 0) return null;
  const point = add(camera.eye, mul(direction, t));
  const col = Math.floor(point.x + chain.cols / 2);
  const row = Math.floor(point.z + chain.rows / 2);
  if (row < 0 || row >= chain.rows || col < 0 || col >= chain.cols) return null;
  return { row, col };
}

export function Board3D({
  chain,
  players,
  meId,
  canPlay,
  onPlace,
  flash,
  selected,
  onCancel,
  theme,
}: Board3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const propsRef = useRef<Board3DProps>({
    chain,
    players,
    meId,
    canPlay,
    onPlace,
    flash,
    selected,
    onCancel,
    theme,
  });
  propsRef.current = { chain, players, meId, canPlay, onPlace, flash, selected, onCancel, theme };

  const hoverRef = useRef<{ row: number; col: number } | null>(null);
  const cursorRef = useRef<{ row: number; col: number }>({ row: 0, col: 0 });
  const animationStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const drawRef = useRef<(now: number) => void>(() => {});

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
      const camera = makeCamera(board.rows, board.cols, width, height);
      cameraRef.current = camera;
      const selectedCell = props.selected;
      const hovered = hoverRef.current;
      const halfW = board.cols / 2;
      const halfD = board.rows / 2;

      // Table glow behind the board.
      const glow = ctx.createRadialGradient(
        width / 2,
        height * 0.5,
        10,
        width / 2,
        height * 0.5,
        Math.max(width, height) * 0.62,
      );
      glow.addColorStop(0, colors.haze);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const topCorners = [
        { x: -halfW, y: 0, z: -halfD },
        { x: halfW, y: 0, z: -halfD },
        { x: halfW, y: 0, z: halfD },
        { x: -halfW, y: 0, z: halfD },
      ];
      const bottomCorners = topCorners.map((corner) => ({ ...corner, y: -BOARD_THICKNESS }));
      const top = topCorners.map((corner) => project(camera, corner));
      const bottom = bottomCorners.map((corner) => project(camera, corner));

      // Visible slab faces: front, left and right.
      const faces: Projected[][] = [
        [top[3], top[2], bottom[2], bottom[3]],
        [top[0], top[3], bottom[3], bottom[0]],
        [top[1], top[2], bottom[2], bottom[1]],
      ];
      for (const face of faces) {
        quadPath(ctx, face);
        const minY = Math.min(...face.map((point) => point.y));
        const maxY = Math.max(...face.map((point) => point.y));
        const gradient = ctx.createLinearGradient(0, minY, 0, maxY);
        gradient.addColorStop(0, colors.tableSide);
        gradient.addColorStop(1, colors.tableEdge);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = alpha(colors.text, 0.06);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Top surface.
      quadPath(ctx, top);
      const topGradient = ctx.createLinearGradient(0, Math.min(...top.map((p) => p.y)), 0, Math.max(...top.map((p) => p.y)));
      topGradient.addColorStop(0, colors.tableTop);
      topGradient.addColorStop(1, colors.tableTopAlt);
      ctx.fillStyle = topGradient;
      ctx.fill();

      const cellQuads = (row: number, col: number): Projected[] => {
        const x0 = col - halfW;
        const x1 = x0 + 1;
        const z0 = row - halfD;
        const z1 = z0 + 1;
        return [
          project(camera, { x: x0, y: 0, z: z0 }),
          project(camera, { x: x1, y: 0, z: z0 }),
          project(camera, { x: x1, y: 0, z: z1 }),
          project(camera, { x: x0, y: 0, z: z1 }),
        ];
      };

      ctx.save();
      quadPath(ctx, top);
      ctx.clip();

      for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
          const cell = board.cells[row * board.cols + col];
          const owner = cell.ownerId ? palette.get(cell.ownerId) : undefined;
          const points = cellQuads(row, col);
          quadPath(ctx, points);
          ctx.fillStyle = (row + col) % 2 === 0 ? colors.tableTop : colors.tableTopAlt;
          ctx.fill();
          if (owner && cell.orbs > 0) {
            ctx.fillStyle = alpha(owner, theme === "light" ? 0.16 : 0.13);
            ctx.fill();
          }
          const isSelected = selectedCell?.row === row && selectedCell?.col === col;
          const isHovered = hovered?.row === row && hovered?.col === col;
          if (isSelected) {
            ctx.fillStyle = alpha(colors.accent, 0.24);
            ctx.fill();
          } else if (isHovered && props.canPlay) {
            ctx.fillStyle = alpha(colors.accent, 0.09);
            ctx.fill();
          }
        }
      }

      // Grid lines clipped to the table top.
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1;
      for (let col = 0; col <= board.cols; col++) {
        const x = col - halfW;
        const a = project(camera, { x, y: 0, z: -halfD });
        const b = project(camera, { x, y: 0, z: halfD });
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let row = 0; row <= board.rows; row++) {
        const z = row - halfD;
        const a = project(camera, { x: -halfW, y: 0, z });
        const b = project(camera, { x: halfW, y: 0, z });
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();

      // Outer edge.
      quadPath(ctx, top);
      ctx.strokeStyle = colors.gridLineStrong;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Selected / last-move cell rings.
      const ringFor = (row: number, col: number, color: string, width = 2) => {
        const points = cellQuads(row, col);
        quadPath(ctx, points);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
      };
      if (selectedCell) {
        ringFor(selectedCell.row, selectedCell.col, colors.accent, 2.6);
      } else if (hovered && props.canPlay) {
        ringFor(hovered.row, hovered.col, alpha(colors.accent, 0.6), 1.6);
      }
      const lastMove = board.lastMove;
      if (lastMove) {
        const ownerColor = palette.get(lastMove.playerId) ?? colors.accent;
        ringFor(lastMove.row, lastMove.col, alpha(ownerColor, 0.85), 1.8);
      }

      const elapsed = now - animationStartRef.current;
      const placementScale =
        lastMove && elapsed < 320
          ? 0.55 + easeOut(elapsed / 320) * 0.45
          : 1;

      // Rings left by explosions.
      ringsRef.current = ringsRef.current.filter((ring) => now - ring.start < ring.life);
      for (const ring of ringsRef.current) {
        const age = (now - ring.start) / ring.life;
        const center = cellWorld(board, ring.row, ring.col);
        const centerProjected = project(camera, { ...center, y: 0.02 });
        const radius = worldRadius(camera, 0.15 + age * 0.9, centerProjected.depth);
        ctx.beginPath();
        ctx.ellipse(
          centerProjected.x,
          centerProjected.y,
          radius,
          radius * 0.46,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = alpha(ring.color, (1 - age) * 0.7);
        ctx.lineWidth = Math.max(1, 3 * (1 - age));
        ctx.stroke();
      }

      // Orbs: project, sort far to near, then paint shaded spheres.
      const orbs: {
        x: number;
        y: number;
        radius: number;
        color: string;
        depth: number;
        scale: number;
      }[] = [];
      for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
          const cell = board.cells[row * board.cols + col];
          if (cell.orbs <= 0) continue;
          const color = (cell.ownerId ? palette.get(cell.ownerId) : undefined) ?? colors.text;
          const center = cellWorld(board, row, col);
          const count = Math.min(cell.orbs, 12);
          const offsets = orbOffsets(count);
          const radius = orbRadiusFor(count);
          const isLastCell = lastMove?.row === row && lastMove?.col === col;
          for (let index = 0; index < count; index++) {
            const offset = offsets[index] ?? { x: 0, z: 0 };
            const jitter =
              Math.sin(row * 12.9898 + col * 78.233 + index * 37.719) * 0.008;
            const point = {
              x: center.x + offset.x + jitter,
              y: radius,
              z: center.z + offset.z + jitter,
            };
            const projected = project(camera, point);
            const scale = isLastCell ? placementScale : 1;
            orbs.push({
              x: projected.x,
              y: projected.y,
              radius: worldRadius(camera, radius * scale, projected.depth),
              color,
              depth: projected.depth,
              scale,
            });
          }
        }
      }
      orbs.sort((a, b) => b.depth - a.depth);
      for (const orb of orbs) {
        if (orb.radius < 0.4) continue;
        // Contact shadow on the table.
        const shadowCenter = {
          x: orb.x,
          y: orb.y + orb.radius * 0.72,
        };
        ctx.beginPath();
        ctx.ellipse(
          shadowCenter.x,
          shadowCenter.y,
          orb.radius * 0.95,
          orb.radius * 0.34,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = colors.shadow;
        ctx.globalAlpha = 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;

        const gradient = ctx.createRadialGradient(
          orb.x - orb.radius * 0.34,
          orb.y - orb.radius * 0.4,
          orb.radius * 0.04,
          orb.x,
          orb.y,
          orb.radius * 1.04,
        );
        gradient.addColorStop(0, lighten(orb.color, 0.78));
        gradient.addColorStop(0.28, lighten(orb.color, 0.24));
        gradient.addColorStop(0.68, orb.color);
        gradient.addColorStop(1, darken(orb.color, 0.58));
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        if (theme === "neon") {
          ctx.shadowColor = alpha(orb.color, 0.6);
          ctx.shadowBlur = orb.radius * 0.9;
        }
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = alpha(darken(orb.color, 0.7), 0.55);
        ctx.lineWidth = Math.max(0.5, orb.radius * 0.07);
        ctx.stroke();

        // Specular highlight.
        ctx.beginPath();
        ctx.arc(
          orb.x - orb.radius * 0.34,
          orb.y - orb.radius * 0.42,
          Math.max(0.5, orb.radius * 0.17),
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fill();
      }

      // Particles from explosions.
      particlesRef.current = particlesRef.current.filter((particle) => now - particle.start < particle.life);
      for (const particle of particlesRef.current) {
        const age = (now - particle.start) / particle.life;
        const seconds = (now - particle.start) / 1000;
        const point = {
          x: particle.position.x + particle.velocity.x * seconds,
          y: Math.max(
            0.02,
            particle.position.y + particle.velocity.y * seconds - 4.2 * seconds * seconds,
          ),
          z: particle.position.z + particle.velocity.z * seconds,
        };
        const projected = project(camera, point);
        const radius = worldRadius(camera, particle.size * (1 - age * 0.6), projected.depth);
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, Math.max(0.4, radius), 0, Math.PI * 2);
        ctx.fillStyle = alpha(particle.color, (1 - age) * 0.9);
        ctx.fill();
      }

      // Keyboard cursor.
      const cursor = cursorRef.current;
      const cursorCell = board.cells[cursor.row * board.cols + cursor.col];
      if (
        document.activeElement === canvas &&
        !selectedCell &&
        !(hovered?.row === cursor.row && hovered?.col === cursor.col)
      ) {
        const points = cellQuads(cursor.row, cursor.col);
        quadPath(ctx, points);
        ctx.strokeStyle = alpha(colors.text, 0.4);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        if (cursorCell.orbs === 0) {
          const center = project(camera, { ...cellWorld(board, cursor.row, cursor.col), y: 0.12 });
          const radius = worldRadius(camera, 0.07, center.depth);
          ctx.beginPath();
          ctx.arc(center.x, center.y, Math.max(1, radius), 0, Math.PI * 2);
          ctx.fillStyle = alpha(colors.accent, 0.55);
          ctx.fill();
        }
      }
    },
    [colors, palette, theme],
  );

  drawRef.current = draw;

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
    for (const explosion of lastMove.explosions.slice(0, 28)) {
      const center = cellWorld(chain, explosion.row, explosion.col);
      const color = colorsByPlayer.get(explosion.ownerId) ?? "#ffffff";
      rings.push({ row: explosion.row, col: explosion.col, color, start: now, life: 560 });
      const count = 7;
      for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 1.1 + Math.random() * 2.2;
        particles.push({
          position: {
            x: center.x + (Math.random() - 0.5) * 0.2,
            y: 0.18,
            z: center.z + (Math.random() - 0.5) * 0.2,
          },
          velocity: {
            x: Math.cos(angle) * speed,
            y: 1.2 + Math.random() * 2.4,
            z: Math.sin(angle) * speed,
          },
          color,
          start: now,
          life: 520 + Math.random() * 260,
          size: 0.035 + Math.random() * 0.05,
        });
      }
    }
    ringsRef.current = rings;
    particlesRef.current = particles;
    scheduleDraw();
  }, [chain.lastMove, chain, players, scheduleDraw]);

  const cellFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return null;
    const rect = canvas.getBoundingClientRect();
    return rayToCell(
      camera,
      propsRef.current.chain,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellFromEvent(event);
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

  const handleClick = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellFromEvent(event);
    const props = propsRef.current;
    if (!cell) {
      props.onCancel();
      return;
    }
    if (!isPlayableCell(props.chain, props.meId, props.canPlay, cell.row, cell.col)) return;
    props.onPlace(cell.row, cell.col);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const props = propsRef.current;
    const board = props.chain;
    const cursor = cursorRef.current;
    let next = { ...cursor };
    if (event.key === "ArrowLeft") next.col = Math.max(0, cursor.col - 1);
    else if (event.key === "ArrowRight") next.col = Math.min(board.cols - 1, cursor.col + 1);
    else if (event.key === "ArrowUp") next.row = Math.max(0, cursor.row - 1);
    else if (event.key === "ArrowDown") next.row = Math.min(board.rows - 1, cursor.row + 1);
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isPlayableCell(board, props.meId, props.canPlay, cursor.row, cursor.col)) {
        props.onPlace(cursor.row, cursor.col);
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
    : "Chain Reaction 3D board. Use arrow keys to move and Enter to place an orb.";

  return (
    <div className="board-block board-block--3d" ref={wrapperRef}>
      <div className="board-3d-shell">
        <canvas
          ref={canvasRef}
          className="board-3d"
          data-chain-cell="true"
          role="grid"
          tabIndex={0}
          aria-label={label}
          aria-rowcount={chain.rows}
          aria-colcount={chain.cols}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="board-foot">
        <span className="legend-row">
          <span className="legend-dot" style={{ background: "var(--accent)" }} />
          {selected
            ? "Selected — tap the same cell again to confirm"
            : canPlay
              ? "Your turn — tap an orb cell, or use the arrow keys and Enter"
              : "The 3D table updates after every move"}
        </span>
        <span className="board-legend num">
          Corner 2 · Edge 3 · Middle 4 · {chain.rows} × {chain.cols}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {selected ? `Row ${selected.row + 1}, column ${selected.col + 1} selected.` : ""}
      </p>
    </div>
  );
}

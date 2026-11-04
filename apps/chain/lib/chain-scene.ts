import * as THREE from "three";
import type { ChainMove, ChainState, ChainTheme, Player } from "@yaply/shared/types";
import { boardTheme } from "./board-theme";
import { isPlayableCell, type ChainCellPoint } from "./chain-grid";
import { mix } from "./colors";

export type ChainSceneState = {
  chain: ChainState;
  players: Player[];
  meId: string | null;
  canPlay: boolean;
  selected: ChainCellPoint | null;
  flash: Set<string>;
  theme: ChainTheme;
};

type OrbOffset = { x: number; y: number };

type Flight = {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
  delay: number;
  duration: number;
};

type Ring = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  start: number;
  life: number;
};

const CELL_HALF = 0.5;
const CELL_DEPTH = 0.5;
const GRID_FILL = 0.995;
const MAX_CELL_ASPECT = 1.2;
const FLIGHT_MS = 270;
const FLIGHT_LIFT = 0.46;
const PLACEMENT_MS = 340;
const FLASH_MS = 520;
const MAX_ANIMATED_EXPLOSIONS = 24;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function easeOut(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - clamped, 3);
}

function smoothStep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

/** The reference's compact gummy clusters. */
function orbOffsets(count: number): OrbOffset[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0 }];
  if (count === 2) {
    return [
      { x: -0.17, y: 0 },
      { x: 0.17, y: 0 },
    ];
  }
  if (count === 3) {
    return Array.from({ length: 3 }, (_, index) => {
      const angle = Math.PI / 2 + index * ((Math.PI * 2) / 3);
      return { x: Math.cos(angle) * 0.17, y: Math.sin(angle) * 0.17 - 0.03 };
    });
  }
  if (count === 4) {
    const radius = 0.145;
    return [
      { x: -radius, y: -radius },
      { x: radius, y: -radius },
      { x: -radius, y: radius },
      { x: radius, y: radius },
    ];
  }
  const ringCount = Math.min(count, 8);
  const radius = 0.18;
  return Array.from({ length: ringCount }, (_, index) => {
    const angle = Math.PI / 2 + index * ((Math.PI * 2) / ringCount);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

function cellSignature(cell: { orbs: number; ownerId: string | null }, color: string): string {
  return `${cell.orbs}:${cell.ownerId ?? ""}:${color}`;
}

function phaseFor(row: number, col: number): number {
  return (Math.sin(row * 12.9898 + col * 78.233) * 43758.5453) % (Math.PI * 2);
}

/**
 * Owns the Three.js renderer for one Chain Reaction board. React only mounts
 * the canvas and feeds state in; the scene handles camera fitting, picking,
 * tumbling clusters and explosion flights.
 */
export class ChainScene {
  readonly canvas: HTMLCanvasElement;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  private gridRoot = new THREE.Group();
  private cellRoot = new THREE.Group();
  private overlayRoot = new THREE.Group();
  private fxRoot = new THREE.Group();

  private gridGeometry: THREE.BufferGeometry | null = null;
  private gridMaterial = new THREE.LineBasicMaterial({
    color: 0xf2e4ea,
    transparent: true,
    opacity: 0.8,
  });

  private orbGeometry = new THREE.SphereGeometry(0.24, 28, 20);
  private orbMaterials = new Map<string, THREE.MeshPhongMaterial>();
  private ringGeometry = new THREE.RingGeometry(0.3, 0.42, 48);

  private cellEdgeGeometry: THREE.EdgesGeometry;
  private hoverFill: THREE.Mesh;
  private hoverMaterial: THREE.MeshBasicMaterial;
  private selectionFill: THREE.Mesh;
  private selectionMaterial: THREE.MeshBasicMaterial;
  private selectionEdges: THREE.LineSegments;
  private selectionEdgeMaterial: THREE.LineBasicMaterial;
  private lastEdges: THREE.LineSegments;
  private lastEdgeMaterial: THREE.LineBasicMaterial;
  private cursorEdges: THREE.LineSegments;
  private cursorEdgeMaterial: THREE.LineBasicMaterial;

  private cellGroups: THREE.Group[] = [];
  private placementStarts: number[] = [];
  private flashStarts: number[] = [];

  private flights: Flight[] = [];
  private rings: Ring[] = [];

  private hover: ChainCellPoint | null = null;
  private cursor: ChainCellPoint | null = null;

  private state: ChainSceneState;
  private rows = 0;
  private cols = 0;
  private cellWidth = 1;
  private cellHeight = 1;
  private orbScale = 1;
  private transposed = false;
  private frame: number | null = null;
  private reducedMotion = false;

  constructor(canvas: HTMLCanvasElement, initial: ChainSceneState) {
    this.canvas = canvas;
    this.state = initial;
    this.transposed = this.orientationFor(
      canvas.clientWidth,
      canvas.clientHeight,
      initial.chain.rows,
      initial.chain.cols,
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(-3, 6, 10);
    this.scene.add(keyLight);

    this.scene.add(this.gridRoot);
    this.scene.add(this.cellRoot);
    this.scene.add(this.overlayRoot);
    this.scene.add(this.fxRoot);

    const edgeSource = new THREE.BoxGeometry(0.96, 0.96, 1.02);
    this.cellEdgeGeometry = new THREE.EdgesGeometry(edgeSource);
    edgeSource.dispose();

    this.hoverMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.hoverFill = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), this.hoverMaterial);
    this.hoverFill.position.z = -0.03;
    this.hoverFill.visible = false;
    this.hoverFill.renderOrder = 1;
    this.overlayRoot.add(this.hoverFill);

    this.selectionMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.selectionFill = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), this.selectionMaterial);
    this.selectionFill.position.z = -0.02;
    this.selectionFill.visible = false;
    this.selectionFill.renderOrder = 1;
    this.overlayRoot.add(this.selectionFill);

    this.selectionEdgeMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.95,
    });
    this.selectionEdges = new THREE.LineSegments(this.cellEdgeGeometry, this.selectionEdgeMaterial);
    this.selectionEdges.visible = false;
    this.selectionEdges.renderOrder = 2;
    this.overlayRoot.add(this.selectionEdges);

    this.lastEdgeMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.58,
    });
    this.lastEdges = new THREE.LineSegments(this.cellEdgeGeometry, this.lastEdgeMaterial);
    this.lastEdges.visible = false;
    this.lastEdges.renderOrder = 2;
    this.overlayRoot.add(this.lastEdges);

    this.cursorEdgeMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.34,
    });
    this.cursorEdges = new THREE.LineSegments(this.cellEdgeGeometry, this.cursorEdgeMaterial);
    this.cursorEdges.visible = false;
    this.cursorEdges.renderOrder = 2;
    this.overlayRoot.add(this.cursorEdges);

    if (typeof window !== "undefined") {
      this.reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    }

    this.buildBoard(initial.chain.rows, initial.chain.cols);
    this.syncCells(initial);
    this.updateGridColor();
    this.updateHighlights();
    this.resize();

    this.tick = this.tick.bind(this);
    this.frame = window.requestAnimationFrame(this.tick);
  }

  update(state: ChainSceneState): void {
    const previous = this.state;
    const dimensionChanged =
      previous.chain.rows !== state.chain.rows || previous.chain.cols !== state.chain.cols;

    this.state = state;
    if (dimensionChanged) {
      this.buildBoard(state.chain.rows, state.chain.cols);
      this.syncCells(state);
      this.resize();
    } else {
      this.syncCells(state);
    }
    this.updateGridColor();
    this.updateHighlights();

    if (previous.chain !== state.chain) {
      this.handleLastMove(previous.chain, state);
    }
  }

  setHover(cell: ChainCellPoint | null): void {
    this.hover = cell;
    this.updateHighlights();
  }

  setCursor(cell: ChainCellPoint | null): void {
    this.cursor = cell;
    this.updateHighlights();
  }

  /** True when the board is drawn rotated to run tall on a portrait screen. */
  get isTransposed(): boolean {
    return this.transposed;
  }

  pulseCells(cells: Set<string>): void {
    if (cells.size === 0) return;
    const now = performance.now();
    for (const key of cells) {
      const [row, col] = key.split(":").map(Number);
      if (!Number.isFinite(row) || !Number.isFinite(col)) continue;
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) continue;
      this.flashStarts[row * this.cols + col] = now;
    }
  }

  resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width <= 0 || height <= 0) return;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);

    // Draw the long side of the board along the long side of the screen. That
    // keeps portrait boards tall on phones and wide on desktop.
    const nextTransposed = this.orientationFor(width, height, this.rows, this.cols);
    if (nextTransposed !== this.transposed) {
      this.transposed = nextTransposed;
      this.buildBoard(this.rows, this.cols);
      this.syncCells(this.state);
    }

    const aspect = width / height;
    const displayRows = this.transposed ? this.cols : this.rows;
    const displayCols = this.transposed ? this.rows : this.cols;
    // Fill the viewport with the grid, but keep every cubby close to square:
    // portrait phones rotate the board, then cells only stretch a little.
    const stretch = (aspect * displayRows) / Math.max(1, displayCols);
    const cellHeight = 1;
    const cellWidth = Math.min(
      MAX_CELL_ASPECT,
      Math.max(1 / MAX_CELL_ASPECT, stretch),
    );
    const minCell = Math.min(cellWidth, cellHeight);
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.orbScale = Math.min(1, minCell);

    const depthScale = this.orbScale;
    this.gridRoot.scale.set(cellWidth, cellHeight, depthScale);
    this.layoutCells();

    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const frontDepth = CELL_DEPTH * depthScale;
    const distanceForHeight =
      (displayRows * cellHeight) / (2 * tan * GRID_FILL);
    const distanceForWidth =
      (displayCols * cellWidth) / (2 * tan * aspect * GRID_FILL);
    const distance = Math.max(distanceForHeight, distanceForWidth) + frontDepth;
    this.camera.aspect = aspect;
    this.camera.position.set(0, 0, distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    (window as unknown as { __chainDebug?: unknown }).__chainDebug = {
      width,
      height,
      aspect,
      displayRows,
      displayCols,
      cellWidth,
      cellHeight,
      orbScale: this.orbScale,
      distance,
      fov: this.camera.fov,
      transposed: this.transposed,
    };
    this.hoverFill.scale.set(cellWidth, cellHeight, 1);
    this.selectionFill.scale.set(cellWidth, cellHeight, 1);
    this.selectionEdges.scale.set(cellWidth, cellHeight, 1);
    this.lastEdges.scale.set(cellWidth, cellHeight, 1);
    this.cursorEdges.scale.set(cellWidth, cellHeight, 1);
    this.updateHighlights();
  }

  private orientationFor(
    width: number,
    height: number,
    rows: number,
    cols: number,
  ): boolean {
    return width > height ? rows > cols : cols > rows;
  }

  private layoutCells(): void {
    const displayRows = this.transposed ? this.cols : this.rows;
    const displayCols = this.transposed ? this.rows : this.cols;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const group = this.cellGroups[row * this.cols + col];
        if (!group) continue;
        const displayRow = this.transposed ? col : row;
        const displayCol = this.transposed ? row : col;
        group.position.set(
          (displayCol - displayCols / 2 + 0.5) * this.cellWidth,
          (displayRows / 2 - displayRow - 0.5) * this.cellHeight,
          0,
        );
      }
    }
  }

  /** Raycast a pointer position to a board cell. */
  pick(clientX: number, clientY: number): ChainCellPoint | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(pointer, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, point)) return null;

    const displayRows = this.transposed ? this.cols : this.rows;
    const displayCols = this.transposed ? this.rows : this.cols;
    const displayCol = Math.floor(
      point.x / Math.max(0.0001, this.cellWidth) + displayCols / 2,
    );
    const displayRow = Math.floor(
      displayRows / 2 - point.y / Math.max(0.0001, this.cellHeight),
    );
    if (displayRow < 0 || displayRow >= displayRows) return null;
    if (displayCol < 0 || displayCol >= displayCols) return null;
    const row = this.transposed ? displayCol : displayRow;
    const col = this.transposed ? displayRow : displayCol;
    return { row, col };
  }

  dispose(): void {
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;

    for (const flight of this.flights) this.fxRoot.remove(flight.mesh);
    this.flights = [];
    for (const ring of this.rings) {
      this.fxRoot.remove(ring.mesh);
      ring.material.dispose();
    }
    this.rings = [];

    this.gridGeometry?.dispose();
    this.gridMaterial.dispose();
    this.orbGeometry.dispose();
    this.ringGeometry.dispose();
    for (const material of this.orbMaterials.values()) material.dispose();
    this.orbMaterials.clear();

    this.cellEdgeGeometry.dispose();
    this.hoverMaterial.dispose();
    this.selectionMaterial.dispose();
    this.selectionEdgeMaterial.dispose();
    this.lastEdgeMaterial.dispose();
    this.cursorEdgeMaterial.dispose();
    this.hoverFill.geometry.dispose();
    this.selectionFill.geometry.dispose();

    this.scene.clear();
    this.renderer.dispose();
  }

  private buildBoard(rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;

    this.gridGeometry?.dispose();
    this.gridRoot.clear();
    this.cellRoot.clear();
    this.fxRoot.clear();
    this.flights = [];
    this.rings = [];

    const positions: number[] = [];
    const displayRows = this.transposed ? cols : rows;
    const displayCols = this.transposed ? rows : cols;
    for (let row = 0; row < displayRows; row++) {
      for (let col = 0; col < displayCols; col++) {
        const x = col - displayCols / 2 + 0.5;
        const y = displayRows / 2 - row - 0.5;
        const half = CELL_HALF;
        const vertices: number[][] = [];
        for (const z of [CELL_DEPTH, -CELL_DEPTH]) {
          for (const [a, b] of [
            [-half, -half],
            [half, -half],
            [half, half],
            [-half, half],
          ]) {
            vertices.push([x + a, y + b, z]);
          }
        }
        for (let index = 0; index < 4; index++) {
          positions.push(...vertices[index], ...vertices[(index + 1) % 4]);
          positions.push(...vertices[4 + index], ...vertices[4 + ((index + 1) % 4)]);
          positions.push(...vertices[index], ...vertices[4 + index]);
        }
      }
    }

    this.gridGeometry = new THREE.BufferGeometry();
    this.gridGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.gridRoot.add(new THREE.LineSegments(this.gridGeometry, this.gridMaterial));

    this.cellGroups = [];
    this.placementStarts = new Array(rows * cols).fill(0);
    this.flashStarts = new Array(rows * cols).fill(0);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const group = new THREE.Group();
        group.userData.n = 0;
        group.userData.phase = phaseFor(row, col);
        group.userData.signature = "";
        this.cellRoot.add(group);
        this.cellGroups.push(group);
      }
    }
    this.layoutCells();

    this.hover = null;
    this.cursor = null;
  }

  private syncCells(state: ChainSceneState): void {
    const palette = new Map(state.players.map((player) => [player.id, player.color]));
    const fallback = boardTheme(state.theme).text;

    for (let index = 0; index < state.chain.cells.length; index++) {
      const cell = state.chain.cells[index];
      const group = this.cellGroups[index];
      if (!group) continue;

      const color = (cell.ownerId ? palette.get(cell.ownerId) : undefined) ?? fallback;
      const signature = cellSignature(cell, color);
      if (group.userData.signature === signature) continue;
      group.userData.signature = signature;

      group.clear();
      group.rotation.set(0, 0, 0);
      const count = cell.orbs;
      group.userData.n = count;
      if (count <= 0) continue;

      const material = this.orbMaterial(color);
      for (const offset of orbOffsets(count)) {
        const orb = new THREE.Mesh(this.orbGeometry, material);
        orb.position.set(offset.x, offset.y, 0);
        group.add(orb);
      }
      group.scale.setScalar(this.orbScale);
    }
  }

  private orbMaterial(color: string): THREE.MeshPhongMaterial {
    const existing = this.orbMaterials.get(color);
    if (existing) return existing;
    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 70,
      specular: 0x886666,
    });
    this.orbMaterials.set(color, material);
    return material;
  }

  private updateGridColor(): void {
    const theme = boardTheme(this.state.theme);
    const player = this.state.players.find(
      (entry) => entry.id === this.state.chain.turnPlayerId,
    );
    const base = player?.color ?? theme.accent;
    this.gridMaterial.color.set(mix(base, theme.gridLineTarget, 0.55));
    this.gridMaterial.opacity = this.state.theme === "light" ? 0.72 : 0.8;
  }

  private updateHighlights(): void {
    const theme = boardTheme(this.state.theme);
    const hover =
      this.hover &&
      isPlayableCell(
        this.state.chain,
        this.state.meId,
        this.state.canPlay,
        this.hover.row,
        this.hover.col,
      )
        ? this.hover
        : null;
    const selected = this.state.selected;
    const lastMove = this.state.chain.lastMove;

    if (hover) {
      this.hoverFill.visible = true;
      this.positionCell(this.hoverFill, hover.row, hover.col, -0.03);
      this.hoverMaterial.color.set(theme.accent);
    } else {
      this.hoverFill.visible = false;
    }

    if (selected) {
      this.selectionFill.visible = true;
      this.selectionEdges.visible = true;
      this.positionCell(this.selectionFill, selected.row, selected.col, -0.02);
      this.positionCell(this.selectionEdges, selected.row, selected.col, 0);
      this.selectionMaterial.color.set(theme.accent);
      this.selectionEdgeMaterial.color.set(theme.accent);
    } else {
      this.selectionFill.visible = false;
      this.selectionEdges.visible = false;
    }

    if (
      lastMove &&
      !(selected && selected.row === lastMove.row && selected.col === lastMove.col)
    ) {
      const color =
        this.state.players.find((player) => player.id === lastMove.playerId)?.color ??
        theme.accent;
      this.lastEdges.visible = true;
      this.lastEdgeMaterial.color.set(color);
      this.positionCell(this.lastEdges, lastMove.row, lastMove.col, 0);
    } else {
      this.lastEdges.visible = false;
    }

    if (this.cursor && !hover && !selected) {
      this.cursorEdges.visible = true;
      this.cursorEdgeMaterial.color.set(theme.text);
      this.positionCell(this.cursorEdges, this.cursor.row, this.cursor.col, 0);
    } else {
      this.cursorEdges.visible = false;
    }
  }

  private positionCell(object: THREE.Object3D, row: number, col: number, z: number): void {
    const displayRow = this.transposed ? col : row;
    const displayCol = this.transposed ? row : col;
    const displayRows = this.transposed ? this.cols : this.rows;
    const displayCols = this.transposed ? this.rows : this.cols;
    object.position.set(
      (displayCol - displayCols / 2 + 0.5) * this.cellWidth,
      (displayRows / 2 - displayRow - 0.5) * this.cellHeight,
      z,
    );
  }

  private cellPoint(row: number, col: number, z = 0): THREE.Vector3 {
    const displayRow = this.transposed ? col : row;
    const displayCol = this.transposed ? row : col;
    const displayRows = this.transposed ? this.cols : this.rows;
    const displayCols = this.transposed ? this.rows : this.cols;
    return new THREE.Vector3(
      (displayCol - displayCols / 2 + 0.5) * this.cellWidth,
      (displayRows / 2 - displayRow - 0.5) * this.cellHeight,
      z,
    );
  }

  private handleLastMove(previous: ChainState, next: ChainSceneState): void {
    const move = next.chain.lastMove;
    if (!move) return;

    const previousKey = previous.lastMove
      ? `${previous.lastMove.row}:${previous.lastMove.col}:${previous.moveCount}`
      : "";
    const nextKey = `${move.row}:${move.col}:${next.chain.moveCount}`;
    if (previousKey === nextKey) return;

    const now = performance.now();
    const index = move.row * this.cols + move.col;
    if (index >= 0 && index < this.placementStarts.length) {
      this.placementStarts[index] = now;
    }
    this.spawnExplosions(move, next);
  }

  private spawnExplosions(move: ChainMove, state: ChainSceneState): void {
    const now = performance.now();
    const palette = new Map(state.players.map((player) => [player.id, player.color]));
    const fallback = boardTheme(state.theme).accent;
    const explosions = move.explosions.slice(0, MAX_ANIMATED_EXPLOSIONS);

    explosions.forEach((explosion, explosionIndex) => {
      const color = palette.get(explosion.ownerId) ?? fallback;
      const source = this.cellPoint(explosion.row, explosion.col);
      const cellIndex = explosion.row * this.cols + explosion.col;
      const delay = explosionIndex * 22;
      if (cellIndex >= 0 && cellIndex < this.flashStarts.length) {
        this.flashStarts[cellIndex] = now + delay;
      }

      const ringMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
      ring.position.copy(source);
      ring.position.z = 0.55 * this.orbScale;
      ring.scale.setScalar(0.7 * this.orbScale);
      ring.visible = false;
      this.fxRoot.add(ring);
      this.rings.push({
        mesh: ring,
        material: ringMaterial,
        start: now + delay,
        life: 560,
      });

      const neighbours: ChainCellPoint[] = [];
      if (explosion.row > 0) neighbours.push({ row: explosion.row - 1, col: explosion.col });
      if (explosion.row < this.rows - 1) {
        neighbours.push({ row: explosion.row + 1, col: explosion.col });
      }
      if (explosion.col > 0) neighbours.push({ row: explosion.row, col: explosion.col - 1 });
      if (explosion.col < this.cols - 1) {
        neighbours.push({ row: explosion.row, col: explosion.col + 1 });
      }

      neighbours.forEach((neighbour, neighbourIndex) => {
        const orbMaterial = this.orbMaterial(color);
        const mesh = new THREE.Mesh(this.orbGeometry, orbMaterial);
        mesh.position.copy(source);
        mesh.scale.setScalar(0.78 * this.orbScale);
        mesh.visible = false;
        this.fxRoot.add(mesh);
        this.flights.push({
          mesh,
          from: source.clone(),
          to: this.cellPoint(neighbour.row, neighbour.col),
          start: now,
          delay: delay + neighbourIndex * 8,
          duration: FLIGHT_MS,
        });
      });
    });
  }

  private updateFlights(now: number): void {
    if (this.flights.length === 0) return;
    const remaining: Flight[] = [];

    for (const flight of this.flights) {
      const age = now - flight.start - flight.delay;
      if (age < 0) {
        flight.mesh.visible = false;
        remaining.push(flight);
        continue;
      }
      flight.mesh.visible = true;
      const progress = Math.min(1, age / flight.duration);
      const eased = smoothStep(progress);
      flight.mesh.position.lerpVectors(flight.from, flight.to, eased);
      flight.mesh.position.z = Math.sin(progress * Math.PI) * FLIGHT_LIFT * this.orbScale;
      if (progress >= 1) {
        this.fxRoot.remove(flight.mesh);
      } else {
        remaining.push(flight);
      }
    }

    this.flights = remaining;
  }

  private updateRings(now: number): void {
    if (this.rings.length === 0) return;
    const remaining: Ring[] = [];

    for (const ring of this.rings) {
      const age = now - ring.start;
      if (age < 0) {
        remaining.push(ring);
        continue;
      }
      const progress = age / ring.life;
      if (progress >= 1) {
        this.fxRoot.remove(ring.mesh);
        ring.material.dispose();
        continue;
      }
      ring.mesh.visible = true;
      ring.mesh.scale.setScalar((0.7 + easeOut(progress) * 1.05) * this.orbScale);
      ring.material.opacity = (1 - progress) * 0.62;
      remaining.push(ring);
    }

    this.rings = remaining;
  }

  private tick(now: number): void {
    this.frame = window.requestAnimationFrame(this.tick);
    const seconds = now / 1000;

    for (let index = 0; index < this.cellGroups.length; index++) {
      const group = this.cellGroups[index];
      const count = group.userData.n as number;
      if (!group.children.length) continue;

      if (!this.reducedMotion && count > 1) {
        const speed = count === 2 ? 1.8 : 2.3;
        const phase = group.userData.phase as number;
        group.rotation.x = seconds * speed * 0.8 + phase;
        group.rotation.y = seconds * speed;
        group.rotation.z = seconds * speed * 0.5;
      }

      let scale = 1;
      const placementStart = this.placementStarts[index];
      if (placementStart > 0 && now - placementStart < PLACEMENT_MS) {
        scale *= 0.55 + easeOut((now - placementStart) / PLACEMENT_MS) * 0.45;
      }
      const flashStart = this.flashStarts[index];
      if (flashStart > 0 && now - flashStart < FLASH_MS) {
        const progress = (now - flashStart) / FLASH_MS;
        scale *= 1 + Math.sin(progress * Math.PI) * 0.12;
      }
      group.scale.setScalar(scale * this.orbScale);
    }

    this.updateFlights(now);
    this.updateRings(now);
    this.renderer.render(this.scene, this.camera);
  }
}

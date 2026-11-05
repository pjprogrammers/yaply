import { KART, OBSTACLE_RULES } from "./constants";
import { roadMetrics, roadNetwork, sampleRoad, type RoadMetrics } from "./roads";
import { SURFACES } from "./surfaces";
import { groundHeightAt, maximumTerrainSlope, terrainHeightAt } from "./terrain";
import type {
  HazardDef,
  MapDef,
  MapRoute,
  ObstacleDef,
  PlatformDef,
  RampDef,
  SurfaceKind,
} from "./types";

/**
 * Yaply Arena Design Standard v2.
 *
 * Derived directly from maps.md. The hard requirements are route count and
 * width, local obstacle density, 100% pickup/spawn accessibility, valid ramp
 * transitions and zero unintended disconnected platforms. Occupancy budgets
 * are reported separately because maps.md explicitly calls them a planning
 * budget rather than a per-cell requirement.
 */
export const ARENA_STANDARD = {
  arena: {
    ratios: [1, 1.2, 1.25, 1.5, 1.7],
    minWidth: 80,
  },
  lane: {
    mainMin: 8,
    secondaryMin: 5,
  },
  obstacleDensity: { max: 0.25, window: 15 },
  occupancy: {
    /** maps.md planning budget, percentages of total arena area. */
    drivable: 0.55,
    solid: 0.15,
    hazard: 0.08,
    ramp: 0.12,
    decoration: 0.1,
  },
  pickup: {
    min: 7,
    max: 10,
    minSpacing: 12,
    clearance: 1.5,
    spawnClearance: 6,
    boostClearance: 4,
    respawnSeconds: 9,
  },
  boost: { clearance: 1.2, spawnClearance: 6, pickupClearance: 4 },
  ramp: {
    minAngle: 10,
    maxAngle: 35,
    targetMin: 15,
    targetMax: 30,
    landingDistance: 8,
    landingClearance: 1.1,
    bridgeClearance: 1.7,
  },
  routes: { min: 3 },
  spawn: { clearance: KART.radius + 0.6, separation: 5 },
  terrain: { maxSlope: 32 },
} as const;

export interface MapAuditIssue {
  code: string;
  message: string;
  severity: "critical" | "review";
}

export type MapQuality = "PASS" | "REVIEW" | "REJECT";

export function arenaArea(map: MapDef): number {
  return map.size * map.depth;
}

export function obstacleArea(obstacle: ObstacleDef): number {
  return obstacle.hx * obstacle.hz * 4;
}

export function platformArea(platform: PlatformDef): number {
  return platform.hx * platform.hz * 4;
}

export function rampArea(ramp: RampDef): number {
  return ramp.hx * ramp.hz * 4;
}

/** Solid footprint includes obstacles, raised decks and their ramps. Decorative
 * props are excluded exactly as maps.md section 8 requires. */
export function solidFootprintArea(map: MapDef): number {
  return (
    map.obstacles.reduce(
      (total, obstacle) =>
        total +
        (obstacle.category === "decorative" || obstacle.category === "climbable"
          ? 0
          : obstacleArea(obstacle)),
      0,
    ) +
    map.platforms.reduce((total, platform) => total + platformArea(platform), 0) +
    map.ramps.reduce((total, ramp) => total + rampArea(ramp), 0)
  );
}

export function solidFootprintPercent(map: MapDef): number {
  return solidFootprintArea(map) / arenaArea(map);
}

export function hazardArea(hazard: HazardDef): number {
  if (hazard.radius !== undefined) {
    return Math.PI * hazard.radius * hazard.radius;
  }
  return (hazard.hx ?? 0) * (hazard.hz ?? 0) * 4;
}

export function hazardPercent(map: MapDef): number {
  return (
    map.hazards.reduce((total, hazard) => total + hazardArea(hazard), 0) /
    arenaArea(map)
  );
}

export function rampRun(ramp: RampDef): number {
  return 2 * (ramp.axis === "x" ? ramp.hx : ramp.hz);
}

export function rampAngleDegrees(ramp: RampDef): number {
  return (Math.atan2(ramp.height, rampRun(ramp)) * 180) / Math.PI;
}

function rotatePoint(dx: number, dz: number, rot: number): [number, number] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return [dx * cos - dz * sin, dx * sin + dz * cos];
}

function distanceToRect(
  x: number,
  z: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number,
  rot = 0,
): number {
  const [localX, localZ] = rotatePoint(x - cx, z - cz, -rot);
  const outsideX = Math.max(Math.abs(localX) - hx, 0);
  const outsideZ = Math.max(Math.abs(localZ) - hz, 0);
  return Math.hypot(outsideX, outsideZ);
}

function insideRect(
  x: number,
  z: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number,
  rot = 0,
): boolean {
  const [localX, localZ] = rotatePoint(x - cx, z - cz, -rot);
  return Math.abs(localX) <= hx && Math.abs(localZ) <= hz;
}

function distanceToHazard(hazard: HazardDef, x: number, z: number): number {
  if (hazard.radius !== undefined) {
    return Math.max(0, Math.hypot(x - hazard.x, z - hazard.z) - hazard.radius);
  }
  return distanceToRect(x, z, hazard.x, hazard.z, hazard.hx ?? 0, hazard.hz ?? 0);
}

export interface ClearanceOptions {
  hazards?: boolean;
  platforms?: boolean;
  /** Height of the driving surface being queried. */
  y?: number;
}

/**
 * Distance from a kart centre to the nearest solid or dangerous edge.
 *
 * When `y` is supplied the query is 3D-aware: an obstacle below the deck, a
 * hazard under a bridge, or the deck the route is already driving on does not
 * narrow the lane. This is what makes elevated routes and bridges auditable.
 */
export function clearanceAt(
  map: MapDef,
  x: number,
  z: number,
  options: ClearanceOptions = {},
): number {
  const includeHazards = options.hazards ?? true;
  const includePlatforms = options.platforms ?? true;
  const y = options.y;
  let best = Math.min(map.size / 2 - Math.abs(x), map.depth / 2 - Math.abs(z));

  for (const obstacle of map.obstacles) {
    if (obstacle.category === "decorative") continue;
    if (!OBSTACLE_RULES[obstacle.kind].solid) continue;
    const base = obstacle.base ?? 0;
    const top = base + obstacle.h;
    if (y !== undefined) {
      if (top <= y + 0.35) continue;
      if (base > y + 1.8) continue;
    } else if (base > 0.5) {
      // Props stacked on a deck sit above a ground-level lane.
      continue;
    }
    best = Math.min(best, distanceToRect(x, z, obstacle.x, obstacle.z, obstacle.hx, obstacle.hz, obstacle.rot ?? 0));
  }

  if (includePlatforms) {
    for (const platform of map.platforms) {
      // A bridge deck is an overpass. Its headroom is audited separately; it
      // never narrows the lane that runs under or onto it.
      if ((platform.clearance ?? 0) >= ARENA_STANDARD.ramp.bridgeClearance) continue;
      if (y !== undefined) {
        // Standing on (or above) this deck: it is the surface, not a wall.
        if (platform.height <= y + 0.35) continue;
      }
      best = Math.min(
        best,
        distanceToRect(x, z, platform.x, platform.z, platform.hx, platform.hz, platform.rot ?? 0),
      );
    }
  }

  if (includeHazards) {
    for (const hazard of map.hazards) {
      if (y !== undefined && (hazard.base ?? 0) + 0.45 < y - 0.4) continue;
      best = Math.min(best, distanceToHazard(hazard, x, z));
    }
  }
  return Math.max(0, best);
}

export function pointInHazard(map: MapDef, x: number, z: number): boolean {
  return map.hazards.some((hazard) => distanceToHazard(hazard, x, z) === 0);
}

function bridgeOver(map: MapDef, x: number, z: number): boolean {
  return map.platforms.some(
    (platform) =>
      (platform.clearance ?? 0) >= 1.6 &&
      insideRect(x, z, platform.x, platform.z, platform.hx, platform.hz, platform.rot ?? 0),
  );
}

export function polylineClearance(
  map: MapDef,
  points: Array<[number, number]>,
  options: ClearanceOptions = {},
  closed = true,
): number {
  if (points.length === 0) return 0;
  let best = Number.POSITIVE_INFINITY;
  const segments = closed ? points.length : Math.max(0, points.length - 1);
  for (let index = 0; index < segments; index += 1) {
    const [x1, z1] = points[index];
    const [x2, z2] = points[(index + 1) % points.length];
    const length = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(1, Math.ceil(length / 0.5));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const y = options.y ?? groundHeightAt(map, x, z);
      best = Math.min(best, clearanceAt(map, x, z, { ...options, y }));
    }
  }
  return best;
}

export function routeClearance(map: MapDef, route: MapRoute): number {
  return polylineClearance(map, route.waypoints, {}, route.closed);
}

export function routeWidth(map: MapDef, route: MapRoute): number {
  return routeClearance(map, route) * 2;
}

export function pickupSpacing(map: MapDef): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < map.pickups.length; i += 1) {
    for (let j = i + 1; j < map.pickups.length; j += 1) {
      best = Math.min(
        best,
        Math.hypot(map.pickups[i][0] - map.pickups[j][0], map.pickups[i][1] - map.pickups[j][1]),
      );
    }
  }
  return best;
}

export function spawnSeparation(map: MapDef): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < map.spawns.length; i += 1) {
    for (let j = i + 1; j < map.spawns.length; j += 1) {
      best = Math.min(
        best,
        Math.hypot(map.spawns[i][0] - map.spawns[j][0], map.spawns[i][1] - map.spawns[j][1]),
      );
    }
  }
  return best;
}

function cellCenter(index: number, step: number, half: number): number {
  return -half + (index + 0.5) * step;
}

/** Flood-fills the drivable floor from every spawn. */
export function unreachablePoints(
  map: MapDef,
  points: Array<[number, number]>,
  radius = 2,
): Array<[number, number]> {
  const step = 1;
  const cols = Math.ceil(map.size / step);
  const rows = Math.ceil(map.depth / step);
  const passable = new Uint8Array(cols * rows);
  const reachable = new Uint8Array(cols * rows);
  const minClearance = KART.radius * 0.9;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = cellCenter(col, step, map.size / 2);
      const z = cellCenter(row, step, map.depth / 2);
      // Decks are reached from their ramps, so connectivity is evaluated on
      // the floor plane. Deck edges are audited separately by route clearance
      // and ramp-landing checks; treating them as walls here would mark every
      // legitimate route waypoint on a raised bridge as disconnected.
      if (clearanceAt(map, x, z, { platforms: false }) >= minClearance) {
        passable[row * cols + col] = 1;
      }
    }
  }

  const queue: number[] = [];
  const push = (col: number, row: number) => {
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    const index = row * cols + col;
    if (!passable[index] || reachable[index]) return;
    reachable[index] = 1;
    queue.push(index);
  };

  for (const [x, z] of map.spawns) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor((x + map.size / 2) / step)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor((z + map.depth / 2) / step)));
    push(col, row);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const col = index % cols;
    const row = Math.floor(index / cols);
    push(col + 1, row);
    push(col - 1, row);
    push(col, row + 1);
    push(col, row - 1);
  }

  return points.filter(([x, z]) => {
    const minCol = Math.max(0, Math.floor((x - radius + map.size / 2) / step));
    const maxCol = Math.min(cols - 1, Math.floor((x + radius + map.size / 2) / step));
    const minRow = Math.max(0, Math.floor((z - radius + map.depth / 2) / step));
    const maxRow = Math.min(rows - 1, Math.floor((z + radius + map.depth / 2) / step));
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (reachable[row * cols + col]) return false;
      }
    }
    return true;
  });
}

export function unreachablePickups(map: MapDef): Array<[number, number]> {
  return unreachablePoints(map, map.pickups, 2);
}

export function unreachableSpawns(map: MapDef): Array<[number, number]> {
  return unreachablePoints(map, map.spawns, 1.5);
}

export function unreachableRoutePoints(map: MapDef): Array<[number, number]> {
  return unreachablePoints(
    map,
    map.routes.flatMap((route) => route.waypoints),
    2.2,
  );
}

function rampHighEdge(ramp: RampDef): [number, number] {
  if (ramp.axis === "x") return [ramp.x + ramp.dir * ramp.hx, ramp.z];
  return [ramp.x, ramp.z + ramp.dir * ramp.hz];
}

/** A ramp belongs to a deck when its high edge meets that deck's footprint. */
export function rampConnectsToPlatform(ramp: RampDef, platform: PlatformDef): boolean {
  if (Math.abs(ramp.height - platform.height) > 0.3) return false;
  const [x, z] = rampHighEdge(ramp);
  return (
    distanceToRect(x, z, platform.x, platform.z, platform.hx, platform.hz, platform.rot ?? 0) <= 1.6
  );
}

function landingAreaClear(map: MapDef, ramp: RampDef): boolean {
  if (map.platforms.some((platform) => rampConnectsToPlatform(ramp, platform))) return true;
  const [edgeX, edgeZ] = rampHighEdge(ramp);
  const dirX = ramp.axis === "x" ? ramp.dir : 0;
  const dirZ = ramp.axis === "z" ? ramp.dir : 0;
  const acrossX = ramp.axis === "x" ? 0 : 1;
  const acrossZ = ramp.axis === "x" ? 1 : 0;
  const halfWidth = Math.max(1.4, (ramp.axis === "x" ? ramp.hz : ramp.hx) - 1);
  for (let distance = 1; distance <= ARENA_STANDARD.ramp.landingDistance; distance += 1.5) {
    for (const offset of [-halfWidth, 0, halfWidth]) {
      const x = edgeX + dirX * distance + acrossX * offset;
      const z = edgeZ + dirZ * distance + acrossZ * offset;
      if (Math.abs(x) > map.size / 2 || Math.abs(z) > map.depth / 2) return false;
      if (pointInHazard(map, x, z)) return false;
      const y = Math.max(terrainHeightAt(map, x, z), ramp.height - distance * 0.25);
      if (clearanceAt(map, x, z, { y, hazards: true }) < 0.7) return false;
    }
  }
  return true;
}

/** Ramps with neither a deck connection nor a usable landing run. */
export function detachedRamps(map: MapDef): RampDef[] {
  return map.ramps.filter((ramp) => !landingAreaClear(map, ramp));
}

export function localDensityMax(map: MapDef, step = 5): number {
  const window = ARENA_STANDARD.obstacleDensity.window;
  let maximum = 0;
  for (let x = -map.size / 2 + step / 2; x < map.size / 2; x += step) {
    for (let z = -map.depth / 2 + step / 2; z < map.depth / 2; z += step) {
      const half = window / 2;
      let area = 0;
      for (const obstacle of map.obstacles) {
        if (obstacle.category === "decorative" || obstacle.category === "climbable") continue;
        if (!OBSTACLE_RULES[obstacle.kind].solid) continue;
        const [localX, localZ] = rotatePoint(
          x - obstacle.x,
          z - obstacle.z,
          -(obstacle.rot ?? 0),
        );
        const overlapX = Math.max(
          0,
          Math.min(half, localX + obstacle.hx) - Math.max(-half, localX - obstacle.hx),
        );
        const overlapZ = Math.max(
          0,
          Math.min(half, localZ + obstacle.hz) - Math.max(-half, localZ - obstacle.hz),
        );
        area += overlapX * overlapZ;
      }
      maximum = Math.max(maximum, area / (window * window));
    }
  }
  return maximum;
}

export type CellClass =
  | "drivable"
  | "solid"
  | "hazard"
  | "ramp"
  | "elevated"
  | "decoration"
  | "out";

export interface OccupancyReport {
  drivable: number;
  solid: number;
  hazard: number;
  ramp: number;
  elevated: number;
  decoration: number;
  out: number;
  /** Solid obstacle share used by the planning budget. */
  footprint: number;
  localDensity: number;
}

/** Classifies a 1x1 grid over the arena, exactly as described in maps.md. */
export function occupancyReport(map: MapDef): OccupancyReport {
  const step = 1;
  let drivable = 0;
  let solid = 0;
  let hazard = 0;
  let ramp = 0;
  let elevated = 0;
  let decoration = 0;
  let out = 0;
  for (let x = -map.size / 2 + step / 2; x < map.size / 2; x += step) {
    for (let z = -map.depth / 2 + step / 2; z < map.depth / 2; z += step) {
      if (Math.abs(x) > map.size / 2 || Math.abs(z) > map.depth / 2) {
        out += 1;
        continue;
      }
      // Priority: built surfaces hide the hazard/floor beneath them.
      const onRamp = map.ramps.some(
        (rampDef) =>
          insideRect(x, z, rampDef.x, rampDef.z, rampDef.hx, rampDef.hz) &&
          rampDef.height > 0.2,
      );
      if (onRamp) {
        ramp += 1;
        continue;
      }
      const deck = map.platforms.find((platform) =>
        insideRect(x, z, platform.x, platform.z, platform.hx, platform.hz, platform.rot ?? 0),
      );
      if (deck && deck.height > KART.stepHeight) {
        elevated += 1;
        continue;
      }
      let blocked = false;
      for (const obstacle of map.obstacles) {
        if (!insideRect(x, z, obstacle.x, obstacle.z, obstacle.hx, obstacle.hz, obstacle.rot ?? 0)) {
          continue;
        }
        if (obstacle.category === "climbable") {
          // Category 2: a continuous traversable top, not solid cover.
          drivable += 1;
          blocked = true;
          break;
        }
        if (obstacle.category === "decorative" || !OBSTACLE_RULES[obstacle.kind].solid) {
          decoration += 1;
          blocked = true;
          break;
        }
        solid += 1;
        blocked = true;
        break;
      }
      if (blocked) continue;
      if (pointInHazard(map, x, z)) {
        hazard += 1;
        continue;
      }
      drivable += 1;
    }
  }
  const total = Math.max(1, map.size * map.depth);
  return {
    drivable: drivable / total,
    solid: solid / total,
    hazard: hazard / total,
    ramp: ramp / total,
    elevated: elevated / total,
    decoration: decoration / total,
    out: out / total,
    footprint: solidFootprintPercent(map),
    localDensity: localDensityMax(map),
  };
}

function obstacleOverlap(a: ObstacleDef, b: ObstacleDef): number {
  if (a.category === "decorative" || b.category === "decorative") return 0;
  const ax1 = a.x - a.hx;
  const ax2 = a.x + a.hx;
  const az1 = a.z - a.hz;
  const az2 = a.z + a.hz;
  const bx1 = b.x - b.hx;
  const bx2 = b.x + b.hx;
  const bz1 = b.z - b.hz;
  const bz2 = b.z + b.hz;
  const width = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const depth = Math.max(0, Math.min(az2, bz2) - Math.max(az1, bz1));
  return width * depth;
}

/** Shortest horizontal gap between two rotated deck footprints. */
export function platformGap(a: PlatformDef, b: PlatformDef): number {
  const rot = a.rot ?? 0;
  const theta = (b.rot ?? 0) - rot;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  // Project the other deck's half extents onto this deck's local axes.
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  const projectedX = b.hx * c + b.hz * s;
  const projectedZ = b.hx * s + b.hz * c;
  return Math.hypot(
    Math.max(Math.abs(localX) - a.hx - projectedX, 0),
    Math.max(Math.abs(localZ) - a.hz - projectedZ, 0),
  );
}

/**
 * Decks form a graph: two same-height decks that touch are one walkable
 * surface, and a component is grounded only when at least one of its decks has
 * a real ramp to the floor. A ground-level road passing beneath a raised deck
 * is not access, which is why routes are deliberately excluded here.
 */
export function disconnectedPlatforms(map: MapDef): PlatformDef[] {
  const platforms = map.platforms;
  const parent = platforms.map((_, index) => index);
  const find = (index: number): number => {
    let current = index;
    while (parent[current] !== current) current = parent[current];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = current;
      index = next;
    }
    return current;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  const grounded = platforms.map((platform) => {
    if (map.ramps.some((ramp) => rampConnectsToPlatform(ramp, platform))) return true;
    // A deck flush with the local terrain is reachable without a ramp.
    return platform.height <= terrainHeightAt(map, platform.x, platform.z) + KART.stepHeight + 0.2;
  });

  for (let i = 0; i < platforms.length; i += 1) {
    for (let j = i + 1; j < platforms.length; j += 1) {
      const a = platforms[i];
      const b = platforms[j];
      if (Math.abs(a.height - b.height) > 0.35) continue;
      if (platformGap(a, b) > 1) continue;
      union(i, j);
    }
  }

  const groundedRoots = new Set<number>();
  grounded.forEach((isGrounded, index) => {
    if (isGrounded) groundedRoots.add(find(index));
  });
  return platforms.filter((_, index) => !groundedRoots.has(find(index)));
}

export interface CurvatureReport {
  straight: number;
  wide: number;
  medium: number;
  tight: number;
  minimumRadius: number;
}

/**
 * Curvature distribution from the sampled road centrelines. `straight` also
 * captures numerically infinite radii so every sample lands in one bucket.
 */
export function curvatureReport(map: MapDef): CurvatureReport {
  const buckets = { straight: 0, wide: 0, medium: 0, tight: 0 };
  let total = 0;
  let minimumRadius = Number.POSITIVE_INFINITY;
  for (const geometry of roadNetwork(map)) {
    for (const sample of geometry.samples) {
      const radius = sample.radius;
      total += 1;
      minimumRadius = Math.min(minimumRadius, radius);
      if (!Number.isFinite(radius) || radius >= 120) buckets.straight += 1;
      else if (radius >= 45) buckets.wide += 1;
      else if (radius >= 18) buckets.medium += 1;
      else buckets.tight += 1;
    }
  }
  const share = (value: number) => (total > 0 ? value / total : 0);
  return {
    straight: share(buckets.straight),
    wide: share(buckets.wide),
    medium: share(buckets.medium),
    tight: share(buckets.tight),
    minimumRadius,
  };
}

/** Tightest radius the bicycle model can hold at full lock. */
export function minimumTurningRadius(): number {
  // Mirrors engine.ts: steerAngle = steer * (0.2 + 0.14 * (1 - speedRatio)).
  const fullLock = 0.2 + 0.14;
  return KART.wheelbase / Math.tan(fullLock);
}

/** Pairs of solid obstacles whose collision volumes substantially overlap. */
export function collisionOverlaps(map: MapDef): Array<[ObstacleDef, ObstacleDef]> {
  const solids = map.obstacles.filter(
    (obstacle) =>
      obstacle.category !== "decorative" &&
      obstacle.category !== "climbable" &&
      OBSTACLE_RULES[obstacle.kind].solid,
  );
  const overlaps: Array<[ObstacleDef, ObstacleDef]> = [];
  for (let i = 0; i < solids.length; i += 1) {
    for (let j = i + 1; j < solids.length; j += 1) {
      const a = solids[i];
      const b = solids[j];
      // Props stacked on a deck are authored overlaps, not collisions.
      if (Math.abs((a.base ?? 0) - (b.base ?? 0)) > 0.5) continue;
      const overlap = obstacleOverlap(a, b);
      const smallest = Math.min(obstacleArea(a), obstacleArea(b));
      if (smallest > 0.5 && overlap / smallest > 0.55) overlaps.push([a, b]);
    }
  }
  return overlaps;
}

/** Lowest drivable headroom below a bridge deck. */
export function minimumVerticalClearance(map: MapDef): number {
  const bridges = map.platforms.filter((platform) => platform.kind === "bridge");
  if (bridges.length === 0) return Number.POSITIVE_INFINITY;
  return bridges.reduce(
    (best, platform) => Math.min(best, platform.clearance ?? 0),
    Number.POSITIVE_INFINITY,
  );
}

export interface DeadEnd {
  route: string;
  x: number;
  z: number;
}

/**
 * Open routes must terminate at another carriageway, a deck or a ramp. An
 * endpoint floating in open floor is a dead end a player can be funnelled into.
 */
export function deadEndRoutes(map: MapDef): DeadEnd[] {
  const geometries = map.roads.map(sampleRoad);
  const deadEnds: DeadEnd[] = [];
  for (let i = 0; i < map.roads.length; i += 1) {
    const road = map.roads[i];
    if (road.closed ?? true) continue;
    const geometry = geometries[i];
    for (const endpoint of [
      geometry.samples[0],
      geometry.samples[geometry.samples.length - 1],
    ]) {
      let connected = false;
      for (let j = 0; j < map.roads.length && !connected; j += 1) {
        if (j === i) continue;
        const other = map.roads[j];
        // Carriageway edges count as joined when they are within a three-unit
        // junction apron; this absorbs spline sampling without hiding a real
        // dead end.
        const threshold = (road.width + other.width) / 2 + 3;
        for (const sample of geometries[j].samples) {
          if (Math.hypot(sample.x - endpoint.x, sample.z - endpoint.z) <= threshold) {
            connected = true;
            break;
          }
        }
      }
      if (!connected) {
        connected = map.platforms.some(
          (platform) =>
            distanceToRect(
              endpoint.x,
              endpoint.z,
              platform.x,
              platform.z,
              platform.hx,
              platform.hz,
              platform.rot ?? 0,
            ) <= 2.4,
        );
      }
      if (!connected) {
        connected = map.ramps.some((ramp) => {
          const [edgeX, edgeZ] = rampHighEdge(ramp);
          return Math.hypot(edgeX - endpoint.x, edgeZ - endpoint.z) <= 3;
        });
      }
      if (!connected) deadEnds.push({ route: road.name, x: endpoint.x, z: endpoint.z });
    }
  }
  return deadEnds;
}

export interface SurfaceReport {
  surface: SurfaceKind;
  grip: number;
  rolling: number;
  traction: number;
}

/**
 * Every surface the arena actually drives on. Values come from the same
 * table the physics controller reads, so the report cannot drift from the
 * simulation.
 */
export function surfaceReport(map: MapDef): SurfaceReport[] {
  const used = new Set<SurfaceKind>();
  used.add(map.terrain.surface);
  for (const road of map.roads) used.add(road.surface);
  for (const ramp of map.ramps) if (ramp.surface) used.add(ramp.surface);
  for (const platform of map.platforms) if (platform.surface) used.add(platform.surface);
  return [...used]
    .sort()
    .map((surface) => ({
      surface,
      grip: SURFACES[surface].grip,
      rolling: SURFACES[surface].rolling,
      traction: SURFACES[surface].traction,
    }));
}

export interface MapReport {
  id: string;
  name: string;
  quality: MapQuality;
  issues: MapAuditIssue[];
  /** Playable bounding box and its flat area in square units. */
  size: number;
  depth: number;
  playableArea: number;
  occupancy: OccupancyReport;
  hazardPercent: number;
  surfaces: SurfaceReport[];
  routeCount: number;
  routeWidths: Array<{ name: string; kind: MapRoute["kind"]; width: number }>;
  pickups: number;
  pickupSpacing: number;
  spawns: number;
  spawnSeparation: number;
  ramps: Array<{ x: number; z: number; angle: number; landing: boolean }>;
  detachedRamps: number;
  disconnectedPlatforms: number;
  maxTerrainSlope: number;
  /** Average/minimum carriageway width and curvature from the road splines. */
  roads: RoadMetrics;
  curvature: CurvatureReport;
  minimumTurningRadius: number;
  turningRadiusCompatible: boolean;
  collisionOverlaps: number;
  minimumVerticalClearance: number;
  deadEnds: DeadEnd[];
  decorativePercent: number;
  navigablePercent: number;
}

export function auditMap(map: MapDef): MapAuditIssue[] {
  const issues: MapAuditIssue[] = [];
  const add = (code: string, message: string, severity: MapAuditIssue["severity"] = "review") =>
    issues.push({ code, message, severity });

  const ratio = Math.max(map.size, map.depth) / Math.min(map.size, map.depth);
  if (!ARENA_STANDARD.arena.ratios.some((value) => Math.abs(value - ratio) < 0.001)) {
    add("arena-ratio", `${map.name} has an unsupported ${map.size}x${map.depth} footprint.`, "critical");
  }
  if (Math.min(map.size, map.depth) < ARENA_STANDARD.arena.minWidth) {
    add("arena-size", `${map.name} is smaller than ${ARENA_STANDARD.arena.minWidth} units.`, "critical");
  }

  if (map.routes.length < ARENA_STANDARD.routes.min) {
    add(
      "route-count",
      `${map.name} has ${map.routes.length} routes; at least ${ARENA_STANDARD.routes.min} are required.`,
      "critical",
    );
  }
  if (!map.routes.some((route) => route.kind === "main")) {
    add("route-main", `${map.name} has no designated main driving route.`, "critical");
  }
  for (const route of map.routes) {
    const width = routeWidth(map, route);
    const minimum =
      route.kind === "main" ? ARENA_STANDARD.lane.mainMin : ARENA_STANDARD.lane.secondaryMin;
    if (width < minimum) {
      add(
        "route-width",
        `${map.name} route "${route.name}" narrows to ${width.toFixed(1)} units; minimum is ${minimum}.`,
        "critical",
      );
    }
  }
  const disconnected = unreachableRoutePoints(map);
  if (disconnected.length > 0) {
    add(
      "route-disconnected",
      `${map.name} has ${disconnected.length} route waypoint(s) with no drivable connection.`,
      "critical",
    );
  }

  const density = localDensityMax(map);
  if (density > ARENA_STANDARD.obstacleDensity.max) {
    add(
      "local-density",
      `${map.name} reaches ${(density * 100).toFixed(1)}% local obstacle density; maximum is 25%.`,
      density > 0.32 ? "critical" : "review",
    );
  }

  if (map.pickups.length < ARENA_STANDARD.pickup.min || map.pickups.length > ARENA_STANDARD.pickup.max) {
    add(
      "pickup-count",
      `${map.name} has ${map.pickups.length} crates; target is ${ARENA_STANDARD.pickup.min}-${ARENA_STANDARD.pickup.max}.`,
    );
  }
  const spacing = pickupSpacing(map);
  if (Number.isFinite(spacing) && spacing < ARENA_STANDARD.pickup.minSpacing) {
    add(
      "pickup-spacing",
      `${map.name} crates are ${spacing.toFixed(1)} units apart; minimum is ${ARENA_STANDARD.pickup.minSpacing}.`,
    );
  }
  for (const [x, z] of map.pickups) {
    const ground = groundHeightAt(map, x, z);
    if (clearanceAt(map, x, z, { y: ground, hazards: false }) < ARENA_STANDARD.pickup.clearance) {
      add("pickup-clearance", `${map.name} crate at ${x},${z} is embedded in cover.`, "critical");
    }
    if (pointInHazard(map, x, z)) {
      add("pickup-hazard", `${map.name} crate at ${x},${z} sits inside a hazard.`, "critical");
    }
    for (const [spawnX, spawnZ] of map.spawns) {
      if (Math.hypot(x - spawnX, z - spawnZ) < ARENA_STANDARD.pickup.spawnClearance) {
        add("pickup-spawn", `${map.name} crate at ${x},${z} overlaps a spawn point.`);
      }
    }
    for (const pad of map.boostPads) {
      if (Math.hypot(x - pad.x, z - pad.z) < ARENA_STANDARD.pickup.boostClearance) {
        add("pickup-boost", `${map.name} crate at ${x},${z} overlaps a boost pad.`);
      }
    }
  }
  for (const [x, z] of unreachablePickups(map)) {
    add("pickup-unreachable", `${map.name} crate at ${x},${z} has no drivable approach.`, "critical");
  }

  for (const pad of map.boostPads) {
    if (clearanceAt(map, pad.x, pad.z) < ARENA_STANDARD.boost.clearance) {
      add("boost-clearance", `${map.name} boost pad at ${pad.x},${pad.z} is embedded in cover.`);
    }
    for (const [spawnX, spawnZ] of map.spawns) {
      if (Math.hypot(pad.x - spawnX, pad.z - spawnZ) < ARENA_STANDARD.boost.spawnClearance) {
        add("boost-spawn", `${map.name} boost pad at ${pad.x},${pad.z} overlaps a spawn point.`);
      }
    }
  }

  for (const [x, z] of map.spawns) {
    if (pointInHazard(map, x, z)) {
      add("spawn-hazard", `${map.name} spawn at ${x},${z} is inside a hazard.`, "critical");
    }
    if (clearanceAt(map, x, z) < ARENA_STANDARD.spawn.clearance) {
      add("spawn-clearance", `${map.name} spawn at ${x},${z} is too close to cover.`, "critical");
    }
  }
  const separation = spawnSeparation(map);
  if (Number.isFinite(separation) && separation < ARENA_STANDARD.spawn.separation) {
    add(
      "spawn-separation",
      `${map.name} spawns are ${separation.toFixed(1)} units apart; minimum is ${ARENA_STANDARD.spawn.separation}.`,
    );
  }
  if (unreachableSpawns(map).length > 0) {
    add("spawn-unreachable", `${map.name} has a spawn with no drivable exit.`, "critical");
  }

  for (const ramp of map.ramps) {
    const angle = rampAngleDegrees(ramp);
    if (angle < ARENA_STANDARD.ramp.minAngle || angle > ARENA_STANDARD.ramp.maxAngle) {
      add(
        "ramp-angle",
        `${map.name} ramp at ${ramp.x},${ramp.z} is ${angle.toFixed(1)} degrees; allowed range is ${ARENA_STANDARD.ramp.minAngle}-${ARENA_STANDARD.ramp.maxAngle}.`,
        "critical",
      );
    }
    if (!landingAreaClear(map, ramp)) {
      add(
        "ramp-landing",
        `${map.name} ramp at ${ramp.x},${ramp.z} has no usable landing area.`,
        "critical",
      );
    }
    if (ramp.height > 4.5) {
      add("ramp-height", `${map.name} ramp at ${ramp.x},${ramp.z} rises ${ramp.height} units.`);
    }
  }

  for (const obstacle of map.obstacles) {
    if (
      obstacle.category !== "decorative" &&
      obstacle.h <= KART.stepHeight &&
      OBSTACLE_RULES[obstacle.kind].solid
    ) {
      add(
        "climbable-obstacle",
        `${map.name} ${obstacle.kind} at ${obstacle.x},${obstacle.z} is below the step height but solid.`,
        "critical",
      );
    }
    if (Math.min(obstacle.hx, obstacle.hz) > 8 || obstacleArea(obstacle) > 180) {
      add("obstacle-oversized", `${map.name} ${obstacle.kind} at ${obstacle.x},${obstacle.z} is oversized.`);
    }
  }
  for (let i = 0; i < map.obstacles.length; i += 1) {
    for (let j = i + 1; j < map.obstacles.length; j += 1) {
      const overlap = obstacleOverlap(map.obstacles[i], map.obstacles[j]);
      const smallest = Math.min(obstacleArea(map.obstacles[i]), obstacleArea(map.obstacles[j]));
      if (smallest > 1 && overlap / smallest > 0.72) {
        add(
          "obstacle-duplicate",
          `${map.name} has overlapping ${map.obstacles[i].kind} obstacles at ${map.obstacles[i].x},${map.obstacles[i].z}.`,
        );
      }
    }
  }

  const disconnectedDecks = new Set(disconnectedPlatforms(map));
  for (const platform of map.platforms) {
    if (platform.height <= KART.stepHeight) {
      add(
        "platform-step",
        `${map.name} platform at ${platform.x},${platform.z} is too low to read as a deck.`,
      );
    }
    if (platform.kind === "bridge" && (platform.clearance ?? 0) < ARENA_STANDARD.ramp.bridgeClearance) {
      add(
        "bridge-clearance",
        `${map.name} bridge at ${platform.x},${platform.z} has only ${(platform.clearance ?? 0).toFixed(1)} units of headroom.`,
      );
    }
    if (disconnectedDecks.has(platform)) {
      add(
        "platform-disconnected",
        `${map.name} platform at ${platform.x},${platform.z} has no ramp or same-height deck connection to the floor.`,
        "critical",
      );
    }
  }

  for (const { surface, grip, rolling, traction } of surfaceReport(map)) {
    if (
      !Number.isFinite(grip) ||
      !Number.isFinite(rolling) ||
      !Number.isFinite(traction) ||
      grip <= 0 ||
      grip > 1.3 ||
      rolling <= 0 ||
      traction <= 0
    ) {
      add(
        "surface-friction",
        `${map.name} surface "${surface}" has an invalid friction configuration.`,
        "critical",
      );
    }
  }

  const slope = maximumTerrainSlope(map);
  if (slope > ARENA_STANDARD.terrain.maxSlope) {
    add(
      "terrain-slope",
      `${map.name} natural terrain reaches ${slope.toFixed(1)} degrees; maximum is ${ARENA_STANDARD.terrain.maxSlope}.`,
    );
  }

  const roads = roadMetrics(map);
  const turningRadius = minimumTurningRadius();
  if (Number.isFinite(roads.minimumRadius) && roads.minimumRadius < turningRadius * 0.8) {
    add(
      "turning-radius",
      `${map.name} road radius drops to ${roads.minimumRadius.toFixed(1)} units; the kart needs ${turningRadius.toFixed(1)}.`,
    );
  }
  const curvature = curvatureReport(map);
  if (curvature.tight > 0.3) {
    add(
      "curvature-hairpin",
      `${map.name} spends ${(curvature.tight * 100).toFixed(0)}% of its road samples below an 18-unit radius.`,
    );
  }
  const overlaps = collisionOverlaps(map);
  if (overlaps.length > 0) {
    add(
      "collision-overlap",
      `${map.name} has ${overlaps.length} pair(s) of solid obstacles sharing collision volume.`,
    );
  }
  const headroom = minimumVerticalClearance(map);
  if (Number.isFinite(headroom) && headroom < ARENA_STANDARD.ramp.bridgeClearance) {
    add(
      "vertical-clearance",
      `${map.name} has only ${headroom.toFixed(1)} units of clearance under its lowest bridge.`,
    );
  }
  const deadEnds = deadEndRoutes(map);
  if (deadEnds.length > 0) {
    add(
      "route-dead-end",
      `${map.name} has ${deadEnds.length} open route endpoint(s) that terminate in open floor.`,
    );
  }

  return issues;
}

export function buildMapReport(map: MapDef): MapReport {
  const issues = auditMap(map);
  const critical = issues.some((issue) => issue.severity === "critical");
  const quality: MapQuality = critical ? "REJECT" : issues.length > 0 ? "REVIEW" : "PASS";
  const occupancy = occupancyReport(map);
  const roads = roadMetrics(map);
  const turningRadius = minimumTurningRadius();
  return {
    id: map.id,
    name: map.name,
    quality,
    issues,
    size: map.size,
    depth: map.depth,
    playableArea: map.size * map.depth,
    occupancy,
    hazardPercent: hazardPercent(map),
    surfaces: surfaceReport(map),
    routeCount: map.routes.length,
    routeWidths: map.routes.map((route) => ({
      name: route.name,
      kind: route.kind,
      width: routeWidth(map, route),
    })),
    pickups: map.pickups.length,
    pickupSpacing: pickupSpacing(map),
    spawns: map.spawns.length,
    spawnSeparation: spawnSeparation(map),
    ramps: map.ramps.map((ramp) => ({
      x: ramp.x,
      z: ramp.z,
      angle: rampAngleDegrees(ramp),
      landing: landingAreaClear(map, ramp),
    })),
    detachedRamps: map.ramps.filter((ramp) => !landingAreaClear(map, ramp)).length,
    disconnectedPlatforms: disconnectedPlatforms(map).length,
    maxTerrainSlope: maximumTerrainSlope(map),
    roads,
    curvature: curvatureReport(map),
    minimumTurningRadius: turningRadius,
    turningRadiusCompatible:
      !Number.isFinite(roads.minimumRadius) || roads.minimumRadius >= turningRadius * 0.8,
    collisionOverlaps: collisionOverlaps(map).length,
    minimumVerticalClearance: minimumVerticalClearance(map),
    deadEnds: deadEndRoutes(map),
    decorativePercent: occupancy.decoration,
    navigablePercent: occupancy.drivable + occupancy.ramp + occupancy.elevated,
  };
}

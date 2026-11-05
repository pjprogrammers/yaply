import { nearestRoad, sampleRoad } from "./roads";
import { baseTerrainHeight, terrainHeightAt } from "./terrain";
import { KART, OBSTACLE_RULES } from "./constants";
import type {
  ArenaClass,
  ArenaTargets,
  BoostPadDef,
  HazardDef,
  LightDef,
  MapDef,
  MapId,
  MapRoute,
  MapTheme,
  ObstacleCategory,
  ObstacleDef,
  ObstacleKind,
  PlatformDef,
  RampDef,
  RoadDef,
  SceneryDef,
  SurfaceKind,
  TerrainDef,
} from "./types";

/** Deterministic 32-bit PRNG. Same seed on every client => same map. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CoverZone {
  x: number;
  z: number;
  rx: number;
  rz: number;
  /** Number of cover objects to place in this zone. */
  count: number;
  kinds: ObstacleKind[];
  /** Half-extent range, in world units. */
  size: [number, number];
  height: [number, number];
  /** Rotation range in radians. */
  rotation?: [number, number];
  surface?: ObstacleDef["surface"];
}

export interface ArenaBlueprint {
  id: MapId;
  name: string;
  tagline: string;
  description: string;
  arenaClass: ArenaClass;
  size: number;
  depth: number;
  seed: number;
  grip?: number;
  /** Visual-only ambient weather. */
  weather?: MapDef["weather"];
  theme: MapTheme;
  terrain: TerrainDef;
  roads: RoadDef[];
  platforms?: PlatformDef[];
  ramps?: RampDef[];
  hazards?: HazardDef[];
  obstacles?: ObstacleDef[];
  cover?: CoverZone[];
  scenery?: SceneryDef[];
  lights?: LightDef[];
  boostPads?: BoostPadDef[];
  spawns?: Array<[number, number]>;
  pickups?: Array<[number, number]>;
  targets?: Partial<ArenaTargets>;
  /** Radius of the ring used to search for spawn points. */
  spawnRing?: number;
  /** Override the number of pickups. Defaults to the area formula. */
  pickupCount?: number;
}

/**
 * Planning budget from maps.md: connected driveable surface 55%, solid
 * obstacles 15%, hazards 8%, ramps/elevated routes 12%, decoration 10%.
 * These are budgets rather than hard per-cell limits, so the acceptance test
 * validates the local 15x15 obstacle density (<=25%) and route connectivity.
 */
export const DEFAULT_TARGETS: ArenaTargets = {
  footprintMin: 0.1,
  footprintMax: 0.25,
  hazardMin: 0,
  hazardMax: 0.18,
  openCombatMin: 0.35,
};

const RAMP_ANGLE_DEGREES = 20;
const RAMP_MIN_RUN = 3.2;

const OBSTACLE_SURFACE: Partial<Record<ObstacleKind, SurfaceKind>> = {
  container: "metal",
  rock: "dirt",
  bumper: "futuristic",
  crystal: "futuristic",
  tire: "concrete",
  wreck: "metal",
  ac: "metal",
  furnace: "metal",
  log: "dirt",
};

function obstacleArea(obstacle: ObstacleDef): number {
  return obstacle.hx * obstacle.hz * 4;
}

function platformArea(platform: PlatformDef): number {
  return platform.hx * platform.hz * 4;
}

function rampArea(ramp: RampDef): number {
  return ramp.hx * ramp.hz * 4;
}

/** Solid footprint = obstacles + raised decks + their ramps. */
export function solidFootprint(
  map: Pick<MapDef, "obstacles" | "platforms" | "ramps">,
): number {
  return (
    map.obstacles.reduce(
      (total, item) =>
        total + (item.category === "decorative" || item.category === "climbable" ? 0 : obstacleArea(item)),
      0,
    ) +
    map.platforms.reduce((total, item) => total + platformArea(item), 0) +
    map.ramps.reduce((total, item) => total + rampArea(item), 0)
  );
}

export function inHazard(hazard: HazardDef, x: number, z: number, pad = 0): boolean {
  if (hazard.radius !== undefined) {
    return Math.hypot(x - hazard.x, z - hazard.z) <= hazard.radius + pad;
  }
  return (
    Math.abs(x - hazard.x) <= (hazard.hx ?? 0) + pad &&
    Math.abs(z - hazard.z) <= (hazard.hz ?? 0) + pad
  );
}

function rotatePoint(dx: number, dz: number, rot: number): [number, number] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return [dx * cos - dz * sin, dx * sin + dz * cos];
}

export function boxDistance(x: number, z: number, obstacle: ObstacleDef): number {
  const [localX, localZ] = rotatePoint(x - obstacle.x, z - obstacle.z, obstacle.rot ?? 0);
  const outsideX = Math.max(Math.abs(localX) - obstacle.hx, 0);
  const outsideZ = Math.max(Math.abs(localZ) - obstacle.hz, 0);
  return Math.hypot(outsideX, outsideZ);
}

function platformDistance(
  x: number,
  z: number,
  platform: PlatformDef,
): number {
  const [localX, localZ] = rotatePoint(
    x - platform.x,
    z - platform.z,
    -(platform.rot ?? 0),
  );
  const outsideX = Math.max(Math.abs(localX) - platform.hx, 0);
  const outsideZ = Math.max(Math.abs(localZ) - platform.hz, 0);
  return Math.hypot(outsideX, outsideZ);
}

function rampDistance(x: number, z: number, ramp: RampDef): number {
  const outsideX = Math.max(Math.abs(x - ramp.x) - ramp.hx, 0);
  const outsideZ = Math.max(Math.abs(z - ramp.z) - ramp.hz, 0);
  return Math.hypot(outsideX, outsideZ);
}

/** Distance from a point to the nearest solid object or hazard. */
export function clearanceFor(
  map: Pick<MapDef, "size" | "depth" | "obstacles" | "platforms" | "hazards">,
  x: number,
  z: number,
  options: { hazards?: boolean; platforms?: boolean } = {},
): number {
  let best = Math.min(map.size / 2 - Math.abs(x), map.depth / 2 - Math.abs(z));
  for (const obstacle of map.obstacles) {
    if (obstacle.category === "decorative") continue;
    best = Math.min(best, boxDistance(x, z, obstacle));
  }
  if (options.platforms ?? true) {
    for (const platform of map.platforms) {
      best = Math.min(best, platformDistance(x, z, platform));
    }
  }
  if (options.hazards ?? true) {
    for (const hazard of map.hazards) {
      if (hazard.radius !== undefined) {
        best = Math.min(best, Math.max(0, Math.hypot(x - hazard.x, z - hazard.z) - hazard.radius));
      } else {
        const outsideX = Math.max(Math.abs(x - hazard.x) - (hazard.hx ?? 0), 0);
        const outsideZ = Math.max(Math.abs(z - hazard.z) - (hazard.hz ?? 0), 0);
        best = Math.min(best, Math.hypot(outsideX, outsideZ));
      }
    }
  }
  return Math.max(0, best);
}

/** Local solid-obstacle density in a 15x15 sliding window (maps.md <= 0.25). */
export function localDensityAt(
  obstacles: ObstacleDef[],
  x: number,
  z: number,
  window = 15,
): number {
  const half = window / 2;
  let area = 0;
  for (const obstacle of obstacles) {
    // Decorative props never collide and climbable props are drivable surface,
    // so neither consumes the solid-cover budget.
    if (obstacle.category === "decorative" || obstacle.category === "climbable") continue;
    if (!OBSTACLE_RULES[obstacle.kind].solid) continue;
    const [localX, localZ] = rotatePoint(x - obstacle.x, z - obstacle.z, -(obstacle.rot ?? 0));
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
  return area / (window * window);
}

function resolveCategory(obstacle: ObstacleDef): ObstacleCategory {
  if (obstacle.category) return obstacle.category;
  const rules = OBSTACLE_RULES[obstacle.kind];
  if (!rules.solid) return "decorative";
  return rules.climbable ? "climbable" : "solid";
}

/**
 * Solid props shorter than the kart's step height are either promoted to a
 * real obstacle or treated as a climbable curb. This prevents invisible
 * trip hazards and accidental "ramps" made from flat crates.
 */
function normalizeObstacle(obstacle: ObstacleDef): ObstacleDef {
  const category = resolveCategory(obstacle);
  let height = Math.max(0.2, obstacle.h);
  if (category !== "decorative" && height <= KART.stepHeight) {
    height = KART.stepHeight + 0.55;
  }
  return {
    ...obstacle,
    h: height,
    category,
    surface: obstacle.surface ?? OBSTACLE_SURFACE[obstacle.kind],
    climbDegrees:
      category === "climbable" ? Math.max(10, obstacle.climbDegrees ?? 18) : obstacle.climbDegrees,
  };
}

/**
 * Keep the high edge exactly where the author placed it and extend the run
 * until the ramp sits at a comfortable 20 degrees. This preserves platform
 * connections while eliminating the 28-39 degree launches that made karts
 * bounce off the lip.
 */
function normalizeRamp(ramp: RampDef): RampDef {
  if (ramp.height <= 0.05) return ramp;
  const targetTan = Math.tan((RAMP_ANGLE_DEGREES * Math.PI) / 180);
  const run = Math.max(RAMP_MIN_RUN, ramp.height / targetTan);
  const half = run / 2;
  if (ramp.axis === "x") {
    return { ...ramp, hx: half, x: ramp.x + ramp.dir * ramp.hx - ramp.dir * half };
  }
  return { ...ramp, hz: half, z: ramp.z + ramp.dir * ramp.hz - ramp.dir * half };
}

function normalizePlatform(platform: PlatformDef): PlatformDef {
  return {
    ...platform,
    height: Math.max(KART.stepHeight + 0.5, platform.height),
    rot: platform.rot ?? 0,
    surface: platform.surface ?? (platform.kind === "bridge" ? "metal" : "concrete"),
  };
}

function overlapsRoute(
  probe: MapDef,
  x: number,
  z: number,
  radius: number,
  extra = 1.4,
): boolean {
  const hit = nearestRoad(probe, x, z, radius + extra);
  if (!hit) return false;
  return hit.distance < hit.road.width / 2 + radius + extra;
}

function fitsArena(map: MapDef, x: number, z: number, hx: number, hz: number): boolean {
  return Math.abs(x) + hx <= map.size / 2 - 1.2 && Math.abs(z) + hz <= map.depth / 2 - 1.2;
}

function blockedByHazard(map: MapDef, x: number, z: number, radius: number): boolean {
  return map.hazards.some((hazard) => inHazard(hazard, x, z, radius + 0.8));
}

function overlapsPlatform(map: MapDef, x: number, z: number, radius: number, margin = 0.8): boolean {
  return map.platforms.some((platform) => platformDistance(x, z, platform) < radius + margin);
}

function overlapsRamp(map: MapDef, x: number, z: number, radius: number, margin = 0.8): boolean {
  return map.ramps.some((ramp) => rampDistance(x, z, ramp) < radius + margin);
}

/**
 * Moves hand-authored cover off the carriageway. A map is allowed to ship a
 * rock beside a road, never in the middle of it; the nearest valid lattice
 * position wins and a prop with nowhere to go is removed from the active map.
 */
function separateAuthoredObstacles(map: MapDef): ObstacleDef[] {
  const accepted: ObstacleDef[] = [];
  for (const obstacle of map.obstacles) {
    const radius = Math.hypot(obstacle.hx, obstacle.hz);
    if (
      obstacle.category === "decorative" ||
      !overlapsRoute(map, obstacle.x, obstacle.z, radius, 0.7)
    ) {
      accepted.push(obstacle);
      continue;
    }

    let placed: ObstacleDef | null = null;
    const angles = 16;
    const step = 1.5;
    outer: for (let ring = 1; ring <= 12; ring += 1) {
      for (let index = 0; index < angles; index += 1) {
        const angle = (index / angles) * Math.PI * 2 + ring * 0.23;
        const x = obstacle.x + Math.cos(angle) * ring * step;
        const z = obstacle.z + Math.sin(angle) * ring * step;
        if (!fitsArena(map, x, z, obstacle.hx, obstacle.hz)) continue;
        if (overlapsRoute(map, x, z, radius, 0.7)) continue;
        if (blockedByHazard(map, x, z, radius)) continue;
        if (overlapsPlatform(map, x, z, radius)) continue;
        if (overlapsRamp(map, x, z, radius)) continue;
        if (
          accepted.some(
            (other) =>
              other.category !== "decorative" &&
              boxDistance(x, z, other) < radius + 1.1,
          )
        ) {
          continue;
        }
        placed = { ...obstacle, x, z };
        break outer;
      }
    }
    if (placed) accepted.push(placed);
  }
  return accepted;
}

/**
 * Hard density ceiling. The placement pass keeps most 15x15 windows below 25%,
 * but authored clusters and zone edges can still combine above it. This pass
 * removes the least valuable overlapping prop until every window complies.
 */
function pruneLocalDensity(map: MapDef, keepAuthored: boolean): ObstacleDef[] {
  let obstacles = [...map.obstacles];
  for (let guard = 0; guard < 800; guard += 1) {
    let worst = 0;
    let worstX = 0;
    let worstZ = 0;
    const window = 15;
    const half = window / 2;
    for (let x = -map.size / 2 + 1; x < map.size / 2; x += 2) {
      for (let z = -map.depth / 2 + 1; z < map.depth / 2; z += 2) {
        const density = localDensityAt(obstacles, x, z, window);
        if (density > worst) {
          worst = density;
          worstX = x;
          worstZ = z;
        }
      }
    }
    if (worst <= 0.24) break;
    // Climbable props are authored terrain features, not cover. Removing one
    // changes the drivable surface, so the density pass only ever trims the
    // solid cover and generated props.
    const candidates = obstacles
      .filter((obstacle) => {
        if (obstacle.category === "decorative" || obstacle.category === "climbable") return false;
        if (!OBSTACLE_RULES[obstacle.kind].solid) return false;
        return (
          Math.abs(obstacle.x - worstX) <= half + obstacle.hx &&
          Math.abs(obstacle.z - worstZ) <= half + obstacle.hz
        );
      })
      .sort((a, b) => {
        if (keepAuthored) {
          const areaA = obstacleArea(a);
          const areaB = obstacleArea(b);
          return areaB - areaA;
        }
        return obstacleArea(a) - obstacleArea(b);
      });
    const victim = candidates[0];
    if (!victim) break;
    obstacles = obstacles.filter((obstacle) => obstacle !== victim);
  }
  return obstacles;
}

/** Drops oversized collision boxes that would turn cover into a wall. */
function pruneOversized(map: MapDef, obstacles: ObstacleDef[]): ObstacleDef[] {
  return obstacles.filter((obstacle) => {
    if (obstacle.category === "decorative") return true;
    if (Math.min(obstacle.hx, obstacle.hz) > 8) return false;
    if (obstacleArea(obstacle) > 180) return false;
    return true;
  });
}

function rectDistance(
  x: number,
  z: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number,
  rot = 0,
): number {
  const [localX, localZ] = rotatePoint(x - cx, z - cz, -rot);
  return Math.hypot(
    Math.max(Math.abs(localX) - hx, 0),
    Math.max(Math.abs(localZ) - hz, 0),
  );
}

function routeLaneHalf(kind: MapRoute["kind"]): number {
  return kind === "main" ? 4.4 : 2.9;
}

interface LaneSample {
  x: number;
  z: number;
  /** Minimum centreline-to-edge clearance for this route. */
  half: number;
}

function collectLaneSamples(map: MapDef): LaneSample[] {
  const samples: LaneSample[] = [];
  for (const route of map.routes) {
    const half = routeLaneHalf(route.kind) + 0.15;
    const segments = route.closed ? route.waypoints.length : route.waypoints.length - 1;
    for (let index = 0; index < segments; index += 1) {
      const [x1, z1] = route.waypoints[index];
      const [x2, z2] = route.waypoints[(index + 1) % route.waypoints.length];
      const length = Math.hypot(x2 - x1, z2 - z1);
      const steps = Math.max(1, Math.ceil(length / 0.75));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        samples.push({ x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t, half });
      }
    }
  }
  return samples;
}

function laneBuckets(samples: LaneSample[], cell = 6): Map<string, LaneSample[]> {
  const buckets = new Map<string, LaneSample[]>();
  for (const sample of samples) {
    const key = `${Math.floor(sample.x / cell)},${Math.floor(sample.z / cell)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(sample);
    else buckets.set(key, [sample]);
  }
  return buckets;
}

function nearLane(
  buckets: Map<string, LaneSample[]>,
  x: number,
  z: number,
  pad = 0,
  cell = 6,
): LaneSample | null {
  const cx = Math.floor(x / cell);
  const cz = Math.floor(z / cell);
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      const bucket = buckets.get(`${cx + dx},${cz + dz}`);
      if (!bucket) continue;
      for (const sample of bucket) {
        if (Math.hypot(sample.x - x, sample.z - z) < sample.half + pad) return sample;
      }
    }
  }
  return null;
}

/**
 * maps.md requires every hazard to leave a lane-wide approach. Authored lava
 * fields and streams often cross a carriageway; this pass removes the hazard
 * cells that sit inside any route corridor and merges the survivors back into
 * the minimum number of rectangles. The visual result is a causeway: the road
 * crosses the hazard, the hazard remains intact either side of it.
 */
function clipHazardsToRoutes(map: MapDef): HazardDef[] {
  const samples = collectLaneSamples(map);
  const buckets = laneBuckets(samples);
  const kept: HazardDef[] = [];
  for (const hazard of map.hazards) {
    if (hazard.radius !== undefined) {
      let allowed = hazard.radius;
      for (const sample of samples) {
        allowed = Math.min(
          allowed,
          Math.hypot(sample.x - hazard.x, sample.z - hazard.z) - sample.half,
        );
      }
      if (allowed > 1.6) kept.push({ ...hazard, radius: allowed });
      continue;
    }

    const hx = hazard.hx ?? 0;
    const hz = hazard.hz ?? 0;
    if (hx <= 0 || hz <= 0) continue;
    const cell = 1;
    const minX = hazard.x - hx;
    const minZ = hazard.z - hz;
    const cols = Math.max(1, Math.round((hx * 2) / cell));
    const rows = Math.max(1, Math.round((hz * 2) / cell));
    const open: boolean[][] = [];
    for (let row = 0; row < rows; row += 1) {
      open[row] = [];
      for (let col = 0; col < cols; col += 1) {
        const x = minX + (col + 0.5) * cell;
        const z = minZ + (row + 0.5) * cell;
        // A 1x1 cell can protrude ~0.71 units past its centre, so pad the
        // corridor by the cell half-diagonal to keep the surviving hazard edge
        // outside the lane rather than slicing through it.
        open[row][col] = nearLane(buckets, x, z, 0.72) === null;
      }
    }

    const used: boolean[][] = open.map((row) => row.map(() => false));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!open[row][col] || used[row][col]) continue;
        let width = 1;
        while (col + width < cols && open[row][col + width] && !used[row][col + width]) {
          width += 1;
        }
        let height = 1;
        let grow = true;
        while (grow && row + height < rows) {
          for (let dx = 0; dx < width; dx += 1) {
            if (!open[row + height][col + dx] || used[row + height][col + dx]) {
              grow = false;
              break;
            }
          }
          if (grow) height += 1;
        }
        for (let dy = 0; dy < height; dy += 1) {
          for (let dx = 0; dx < width; dx += 1) used[row + dy][col + dx] = true;
        }
        if (width * height < 2) continue;
        kept.push({
          ...hazard,
          x: minX + (col + width / 2) * cell,
          z: minZ + (row + height / 2) * cell,
          hx: (width * cell) / 2,
          hz: (height * cell) / 2,
          radius: undefined,
        });
      }
    }
  }
  return kept;
}

/**
 * A reached deck is skirted by solid walls, so a route that grazes its corner
 * is not actually eight units wide. Bridge decks are excluded because they are
 * authored to pass over traffic. Any remaining deck that intrudes on a lane is
 * translated together with the ramps that serve it until the lane is clear.
 */
function separateAuthoredPlatforms(map: MapDef): PlatformDef[] {
  const samples = collectLaneSamples(map);
  const homes: PlatformDef[] = map.platforms.map((platform) => ({ ...platform }));

  return homes.map((platform) => {
    if (platform.kind === "bridge" || (platform.clearance ?? 0) >= 1.6) return platform;

    const violates = (x: number, z: number): boolean =>
      samples.some(
        (sample) =>
          rectDistance(sample.x, sample.z, x, z, platform.hx, platform.hz, platform.rot ?? 0) <
          sample.half,
      );

    if (!violates(platform.x, platform.z)) return platform;

    let found: { x: number; z: number } | null = null;
    search: for (let ring = 1; ring <= 28; ring += 1) {
      const steps = 16 + ring * 2;
      for (let index = 0; index < steps; index += 1) {
        const angle = (index / steps) * Math.PI * 2 + ring * 0.19;
        const x = platform.x + Math.cos(angle) * ring;
        const z = platform.z + Math.sin(angle) * ring;
        if (Math.abs(x) + platform.hx > map.size / 2 - 1.4) continue;
        if (Math.abs(z) + platform.hz > map.depth / 2 - 1.4) continue;
        if (violates(x, z)) continue;
        const hazardHit = map.hazards.some(
          (hazard) =>
            Math.abs(hazard.x - x) < (hazard.radius ?? hazard.hx ?? 0) + platform.hx + 1.2 &&
            Math.abs(hazard.z - z) < (hazard.radius ?? hazard.hz ?? 0) + platform.hz + 1.2,
        );
        if (hazardHit) continue;
        const crowded = homes.some(
          (other) =>
            other !== platform &&
            platformDistance(other.x, other.z, { ...platform, x, z }) < 1.4,
        );
        if (crowded) continue;
        found = { x, z };
        break search;
      }
    }
    if (!found) return platform;

    const dx = found.x - platform.x;
    const dz = found.z - platform.z;
    for (const ramp of map.ramps) {
      if (Math.abs(ramp.height - platform.height) > 0.35) continue;
      const [edgeX, edgeZ] =
        ramp.axis === "x"
          ? [ramp.x + ramp.dir * ramp.hx, ramp.z]
          : [ramp.x, ramp.z + ramp.dir * ramp.hz];
      if (
        rectDistance(
          edgeX,
          edgeZ,
          platform.x,
          platform.z,
          platform.hx,
          platform.hz,
          platform.rot ?? 0,
        ) <= 2.4
      ) {
        ramp.x += dx;
        ramp.z += dz;
      }
    }
    return { ...platform, x: found.x, z: found.z };
  });
}

function routePoints(road: RoadDef): Array<[number, number]> {
  const geometry = sampleRoad(road);
  const spacing = 6.5;
  const points: Array<[number, number]> = [];
  let travelled = 0;
  for (let i = 0; i < geometry.samples.length; i += 1) {
    const sample = geometry.samples[i];
    if (i === 0 || sample.distance - travelled >= spacing) {
      points.push([sample.x, sample.z]);
      travelled = sample.distance;
    }
  }
  if (points.length < 2) {
    for (const sample of geometry.samples) points.push([sample.x, sample.z]);
  }
  return points;
}

function zoneAt(zones: CoverZone[], x: number, z: number): CoverZone | null {
  for (const zone of zones) {
    const dx = (x - zone.x) / Math.max(0.5, zone.rx);
    const dz = (z - zone.z) / Math.max(0.5, zone.rz);
    if (dx * dx + dz * dz <= 1) return zone;
  }
  return null;
}

function fallbackKinds(map: MapDef): ObstacleKind[] {
  if (map.arenaClass === "sky") return ["ac", "crate", "barrier", "crystal"];
  if (map.id === "neon-district" || map.id === "chrome-port" || map.id === "reactor-core") {
    return ["container", "ac", "barrier", "crystal"];
  }
  const surface = map.terrain.surface;
  if (surface === "snow" || surface === "ice") return ["rock", "crate", "container"];
  if (surface === "metal" || surface === "futuristic") return ["container", "ac", "pillar", "barrier"];
  if (surface === "sand" || surface === "dirt") return ["rock", "crate", "barrier"];
  return ["crate", "concrete", "barrier", "rock"];
}

function makeCoverObstacle(
  map: MapDef,
  zone: CoverZone | null,
  rng: () => number,
  x: number,
  z: number,
): ObstacleDef {
  const kinds = zone?.kinds && zone.kinds.length > 0 ? zone.kinds : fallbackKinds(map);
  const kind = kinds[Math.floor(rng() * kinds.length) % kinds.length];
  const baseSize = zone?.size ?? [2.3, 3.3];
  const size = baseSize[0] + rng() * Math.max(0.01, baseSize[1] - baseSize[0]);
  const hx = size * (0.78 + rng() * 0.44);
  const hz = size * (0.78 + rng() * 0.44);
  const baseHeight = zone?.height ?? [1.5, 2.8];
  const height = baseHeight[0] + rng() * Math.max(0.01, baseHeight[1] - baseHeight[0]);
  const rotation = zone?.rotation
    ? zone.rotation[0] + rng() * (zone.rotation[1] - zone.rotation[0])
    : rng() * Math.PI;
  const surface =
    zone?.surface ??
    OBSTACLE_SURFACE[kind] ??
    (kind === "rock" ? map.terrain.surface : undefined);
  return normalizeObstacle({
    x,
    z,
    hx,
    hz,
    h: height,
    kind,
    rot: rotation,
    surface,
  });
}

function canPlaceCover(
  map: MapDef,
  probe: MapDef,
  all: ObstacleDef[],
  x: number,
  z: number,
  hx: number,
  hz: number,
  margin = 1.2,
): boolean {
  const radius = Math.hypot(hx, hz);
  if (Math.abs(x) + hx > map.size / 2 - 1.4) return false;
  if (Math.abs(z) + hz > map.depth / 2 - 1.4) return false;
  if (overlapsRoute(probe, x, z, radius)) return false;
  for (const hazard of map.hazards) {
    if (inHazard(hazard, x, z, radius + 1.4)) return false;
  }
  for (const platform of map.platforms) {
    if (platformDistance(x, z, platform) < radius + margin) return false;
  }
  for (const ramp of map.ramps) {
    if (rampDistance(x, z, ramp) < radius + margin) return false;
  }
  for (const other of all) {
    if (other.category === "decorative") continue;
    if (boxDistance(x, z, other) < radius + margin) return false;
  }
  // Check the candidate's own footprint, not just its centre. A prop can pass
  // a centre test and still push the edge of a 15x15 scoring window over 25%.
  for (const ox of [-hx, 0, hx]) {
    for (const oz of [-hz, 0, hz]) {
      if (localDensityAt(all, x + ox, z + oz) > 0.23) return false;
    }
  }
  return true;
}

function buildCover(
  map: MapDef,
  blueprint: ArenaBlueprint,
  probe: MapDef,
  rng: () => number,
): ObstacleDef[] {
  const placed: ObstacleDef[] = [];
  const all: ObstacleDef[] = [...map.obstacles];
  const area = map.size * map.depth;
  const targetMin = map.targets.footprintMin * area;
  const targetMax = map.targets.footprintMax * area;
  const zones = blueprint.cover ?? [];

  const tryPlace = (x: number, z: number, zone: CoverZone | null): boolean => {
    const candidate = makeCoverObstacle(map, zone, rng, x, z);
    if (!canPlaceCover(map, probe, all, x, z, candidate.hx, candidate.hz)) return false;
    candidate.base = Math.max(0, terrainHeightAt(map, x, z) - 0.1);
    placed.push(candidate);
    all.push(candidate);
    return true;
  };

  // Authored cover zones first; these give each arena its silhouette.
  for (const zone of zones) {
    let placedInZone = 0;
    for (let attempt = 0; attempt < zone.count * 48 && placedInZone < zone.count; attempt += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng());
      const x = zone.x + Math.cos(angle) * zone.rx * radius;
      const z = zone.z + Math.sin(angle) * zone.rz * radius;
      if (tryPlace(x, z, zone)) placedInZone += 1;
    }
  }

  // Deterministic fill pass. A 6-unit lattice keeps the cover spread out so
  // the local 15x15 density stays below the 25% cap even when the arena needs
  // more total footprint to hit its planning budget.
  if (solidFootprint({ ...map, obstacles: all }) < targetMin) {
    const step = 6;
    const offset = (blueprint.seed % step) / step;
    const candidates: Array<[number, number]> = [];
    for (let x = -map.size / 2 + 4; x <= map.size / 2 - 4; x += step) {
      for (let z = -map.depth / 2 + 4; z <= map.depth / 2 - 4; z += step) {
        candidates.push([x + offset, z - offset]);
      }
    }
    shuffleInPlace(candidates, rng);
    for (const [x, z] of candidates) {
      if (solidFootprint({ ...map, obstacles: all }) >= targetMin) break;
      const zone = zoneAt(zones, x, z);
      tryPlace(x, z, zone);
    }
  }

  // Never publish an arena over its planning budget. Remove the newest
  // procedural pieces first; authored obstacles are kept intact.
  let guard = 0;
  while (
    solidFootprint({ ...map, obstacles: all }) > targetMax &&
    placed.length > 0 &&
    guard < 200
  ) {
    const removed = placed.pop();
    if (!removed) break;
    const index = all.indexOf(removed);
    if (index >= 0) all.splice(index, 1);
    guard += 1;
  }

  return placed;
}

function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = items[i];
    items[i] = items[j];
    items[j] = temp;
  }
}

function hazardClear(map: MapDef, x: number, z: number, pad: number): boolean {
  return !map.hazards.some((hazard) => inHazard(hazard, x, z, pad));
}

function findSpawnNear(
  map: MapDef,
  startX: number,
  startZ: number,
  existing: Array<[number, number]>,
): [number, number] {
  const limitX = map.size / 2 - KART.radius - 1.5;
  const limitZ = map.depth / 2 - KART.radius - 1.5;
  const valid = (x: number, z: number): boolean => {
    if (Math.abs(x) > limitX || Math.abs(z) > limitZ) return false;
    if (!hazardClear(map, x, z, 3)) return false;
    if (clearanceFor(map, x, z) < KART.radius + 1.2) return false;
    if (existing.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 5.4)) return false;
    return true;
  };
  if (valid(startX, startZ)) return [startX, startZ];
  for (let ring = 1; ring <= 14; ring += 1) {
    const radius = ring * 1.4;
    const steps = 12 + ring * 2;
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2 + ring * 0.37;
      const x = startX + Math.cos(angle) * radius;
      const z = startZ + Math.sin(angle) * radius;
      if (valid(x, z)) return [x, z];
    }
  }
  return [limitX, limitZ];
}

function buildSpawns(map: MapDef, blueprint: ArenaBlueprint): Array<[number, number]> {
  const spawns: Array<[number, number]> = [];
  const authored = blueprint.spawns;
  if (authored && authored.length > 0) {
    for (const [x, z] of authored) {
      spawns.push(findSpawnNear(map, x, z, spawns));
    }
    return spawns.slice(0, 8);
  }

  const ring = blueprint.spawnRing ?? Math.min(map.size, map.depth) * 0.42;
  const count = 8;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.PI / count;
    spawns.push(findSpawnNear(map, Math.cos(angle) * ring, Math.sin(angle) * ring, spawns));
  }
  return spawns;
}

function pickupCandidate(
  map: MapDef,
  blueprint: ArenaBlueprint,
  spawns: Array<[number, number]>,
): Array<[number, number]> {
  const candidates: Array<[number, number]> = [];
  const minSide = Math.min(map.size, map.depth);

  // Central combat ring.
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    candidates.push([Math.cos(angle) * minSide * 0.2, Math.sin(angle) * minSide * 0.2]);
  }

  // Road shoulders: a crate beside a lane is more interesting than one in it.
  for (const road of blueprint.roads) {
    const points = routePoints(road);
    const offset = road.width / 2 + 2.6;
    for (let i = 0; i < 10; i += 1) {
      const point = points[Math.floor((i / 10) * points.length)];
      if (!point) continue;
      candidates.push([point[0] + offset, point[1]]);
      candidates.push([point[0] - offset, point[1]]);
      candidates.push([point[0], point[1] + offset]);
      candidates.push([point[0], point[1] - offset]);
    }
  }

  // Ramp landing areas.
  for (const ramp of map.ramps) {
    const outward = ramp.axis === "x" ? [ramp.dir, 0] : [0, ramp.dir];
    for (const distance of [4, 7]) {
      candidates.push([
        ramp.x + outward[0] * ((ramp.axis === "x" ? ramp.hx : ramp.hz) + distance),
        ramp.z + outward[1] * ((ramp.axis === "x" ? ramp.hx : ramp.hz) + distance),
      ]);
    }
  }

  // Corners.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      candidates.push([sx * (map.size / 2 - 8), sz * (map.depth / 2 - 8)]);
      candidates.push([sx * (map.size / 2 - 14), sz * (map.depth / 2 - 8)]);
      candidates.push([sx * (map.size / 2 - 8), sz * (map.depth / 2 - 14)]);
    }
  }

  // Spawn-adjacent approaches stay empty.
  return candidates.filter(
    ([x, z]) => !spawns.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 7),
  );
}

function pickupValid(
  map: MapDef,
  x: number,
  z: number,
  spawns: Array<[number, number]>,
  chosen: Array<[number, number]>,
  spacing: number,
): boolean {
  if (Math.abs(x) > map.size / 2 - 3 || Math.abs(z) > map.depth / 2 - 3) return false;
  if (!hazardClear(map, x, z, 2.4)) return false;
  if (clearanceFor(map, x, z) < 1.8) return false;
  if (spawns.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 6.5)) return false;
  if (map.boostPads.some((pad) => Math.hypot(x - pad.x, z - pad.z) < 4.5)) return false;
  if (chosen.some(([px, pz]) => Math.hypot(x - px, z - pz) < spacing)) return false;
  return true;
}

function buildPickups(
  map: MapDef,
  blueprint: ArenaBlueprint,
  spawns: Array<[number, number]>,
): Array<[number, number]> {
  if (blueprint.pickups && blueprint.pickups.length > 0) return blueprint.pickups;
  const area = map.size * map.depth;
  const count = Math.min(
    10,
    Math.max(7, blueprint.pickupCount ?? Math.round(8 * Math.sqrt(area / 10000))),
  );
  const desired = count;
  const chosen: Array<[number, number]> = [];
  const minSpacing = 12;
  const candidates = pickupCandidate(map, blueprint, spawns);
  const rng = mulberry32(map.seed ^ 0x51ed270b);
  shuffleInPlace(candidates, rng);
  for (const [x, z] of candidates) {
    if (chosen.length >= desired) break;
    if (pickupValid(map, x, z, spawns, chosen, minSpacing)) chosen.push([x, z]);
  }

  // Deterministic lattice fallback, still subject to every spacing and
  // reachability rule. The audit runs afterwards and rejects anything unsafe.
  if (chosen.length < desired) {
    for (let gx = -map.size / 2 + 7; gx < map.size / 2 - 6 && chosen.length < desired; gx += 9) {
      for (let gz = -map.depth / 2 + 7; gz < map.depth / 2 - 6 && chosen.length < desired; gz += 9) {
        if (pickupValid(map, gx, gz, spawns, chosen, minSpacing)) chosen.push([gx, gz]);
      }
    }
  }
  return chosen.slice(0, desired);
}

function buildBoostPads(map: MapDef, blueprint: ArenaBlueprint): BoostPadDef[] {
  if (blueprint.boostPads) return blueprint.boostPads;
  const pads: BoostPadDef[] = [];
  const roads = blueprint.roads.filter((road) => road.kind === "main");
  const source = roads.length > 0 ? roads : blueprint.roads.slice(0, 1);
  for (const road of source) {
    const points = routePoints(road);
    for (const fraction of [0.18, 0.68]) {
      const index = Math.floor(fraction * points.length);
      const point = points[index];
      const next = points[(index + 2) % points.length];
      if (!point || !next) continue;
      if (!hazardClear(map, point[0], point[1], 1.8)) continue;
      if (clearanceFor(map, point[0], point[1]) < 1.2) continue;
      if (map.spawns.some(([sx, sz]) => Math.hypot(sx - point[0], sz - point[1]) < 6.2)) continue;
      if (pads.some((pad) => Math.hypot(pad.x - point[0], pad.z - point[1]) < 8)) continue;
      pads.push({
        x: point[0],
        z: point[1],
        rot: Math.atan2(next[0] - point[0], next[1] - point[1]),
      });
      if (pads.length >= 4) break;
    }
    if (pads.length >= 4) break;
  }
  return pads;
}

/**
 * Turns a blueprint into the runtime map. Everything after the authored
 * geometry is deterministic: the same seed produces byte-identical obstacle,
 * spawn and pickup layouts on every client.
 */
export function buildArena(blueprint: ArenaBlueprint): MapDef {
  const platforms = (blueprint.platforms ?? []).map(normalizePlatform);
  const ramps = (blueprint.ramps ?? []).map(normalizeRamp);
  const hazards = (blueprint.hazards ?? []).map((hazard) => ({ ...hazard }));
  const obstacles = (blueprint.obstacles ?? []).map(normalizeObstacle);
  const roads = blueprint.roads.map((road) => ({ ...road }));
  const routes: MapRoute[] = roads.map((road) => ({
    name: road.name,
    kind: road.kind === "main" ? "main" : "secondary",
    waypoints: routePoints(road),
    closed: road.closed ?? true,
  }));

  const map: MapDef = {
    id: blueprint.id,
    name: blueprint.name,
    tagline: blueprint.tagline,
    description: blueprint.description,
    arenaClass: blueprint.arenaClass,
    size: blueprint.size,
    depth: blueprint.depth,
    grip: blueprint.grip,
    seed: blueprint.seed,
    weather: blueprint.weather,
    theme: blueprint.theme,
    terrain: blueprint.terrain,
    roads,
    obstacles,
    platforms,
    ramps,
    hazards,
    scenery: blueprint.scenery ?? [],
    lights: blueprint.lights ?? [],
    boostPads: [],
    spawns: [],
    waypoints: routes.flatMap((entry) => entry.waypoints),
    routes,
    pickups: [],
    targets: { ...DEFAULT_TARGETS, ...blueprint.targets },
  };

  // Hazards and reached decks are solid geometry: carve the hazards back to
  // the route corridor and slide any deck that grazes a lane out of the way
  // before cover placement starts.
  map.hazards = clipHazardsToRoutes(map);
  map.platforms = separateAuthoredPlatforms(map);

  // Road queries need a fully formed MapDef; this probe shares the authored
  // roads so procedural cover can avoid every carriageway.
  const probe: MapDef = { ...map, roads };
  const authored = pruneOversized(map, separateAuthoredObstacles({ ...map, obstacles }));
  map.obstacles = authored;
  const rng = mulberry32(blueprint.seed ^ 0x9e3779b9);
  map.obstacles = [...authored, ...buildCover(map, blueprint, probe, rng)];
  map.obstacles = pruneLocalDensity(map, false);

  // Authored obstacles resting on a mound need to be lifted with the terrain.
  map.obstacles = map.obstacles.map((obstacle) => {
    if (obstacle.base !== undefined && obstacle.base !== 0) return obstacle;
    const ground = Math.max(0, terrainHeightAt(map, obstacle.x, obstacle.z));
    return ground > 0.35 ? { ...obstacle, base: ground } : obstacle;
  });

  map.spawns = buildSpawns(map, blueprint);
  map.boostPads = buildBoostPads(map, blueprint);
  map.pickups = buildPickups(map, blueprint, map.spawns);
  return map;
}

export { routePoints };
export { terrainHeightAt, baseTerrainHeight, nearestRoad };

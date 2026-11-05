import { nearestRoad } from "./roads";
import { smootherstep, smoothstep } from "./roads";
import type {
  MapDef,
  ObstacleDef,
  RampDef,
  SurfaceKind,
  TerrainFeature,
} from "./types";

export interface TerrainSample {
  height: number;
  /** First derivatives of the height field. */
  hx: number;
  hz: number;
  /** Unit surface normal (-hx, 1, -hz) / |...|. */
  nx: number;
  ny: number;
  nz: number;
  /** Slope angle in degrees, atan(sqrt(hx² + hz²)). */
  slope: number;
  surface: SurfaceKind;
}

function rotate(dx: number, dz: number, rot: number): [number, number] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return [dx * cos - dz * sin, dx * sin + dz * cos];
}

function featureRadius(feature: TerrainFeature, x: number, z: number): number {
  const [dx, dz] = rotate(x - feature.x, z - feature.z, feature.rot ?? 0);
  return Math.hypot(dx / Math.max(0.001, feature.radiusX), dz / Math.max(0.001, feature.radiusZ));
}

/** Raw terrain without roads or built surfaces. */
export function baseTerrainHeight(map: MapDef, x: number, z: number): number {
  const seed = map.seed ?? 0;
  let height = 0;
  const undulation = map.terrain.undulation ?? 0;
  if (undulation > 0) {
    height +=
      undulation *
      0.5 *
      (Math.sin(x * 0.17 + seed * 0.013) + Math.cos(z * 0.21 + seed * 0.021));
  }

  for (const feature of map.terrain.features) {
    if (feature.kind === "plateau") {
      const radius = featureRadius(feature, x, z);
      const flat = Math.min(0.98, Math.max(0, feature.flat ?? 0.55));
      if (radius < 0.001) {
        height += feature.height;
      } else if (radius < 1) {
        const blend = 1 - smootherstep((radius - flat) / (1 - flat));
        height += feature.height * blend;
      }
      continue;
    }
    const [dx, dz] = rotate(x - feature.x, z - feature.z, feature.rot ?? 0);
    const gx = dx / Math.max(0.001, feature.radiusX);
    const gz = dz / Math.max(0.001, feature.radiusZ);
    const exponent = gx * gx + gz * gz;
    if (exponent < 12) {
      height += feature.height * Math.exp(-exponent);
    }
  }
  return height;
}

function featureSurfaceAt(map: MapDef, x: number, z: number): SurfaceKind | null {
  let best: { weight: number; surface: SurfaceKind } | null = null;
  for (const feature of map.terrain.features) {
    if (!feature.surface) continue;
    const radius = featureRadius(feature, x, z);
    if (radius >= 1.4) continue;
    const weight = feature.kind === "plateau" ? 1 - radius : Math.exp(-radius * radius * 2.2);
    if (!best || weight > best.weight) {
      best = { weight, surface: feature.surface };
    }
  }
  return best && best.weight > 0.2 ? best.surface : null;
}

/**
 * Terrain height including the smooth carving/blending of authored roads. A
 * road owns its full carriageway; a 2.5-unit shoulder blends back into the
 * surrounding heightfield with a quintic curve so karts never hit a lip.
 */
export function terrainHeightAt(map: MapDef, x: number, z: number): number {
  const base = baseTerrainHeight(map, x, z);
  const hit = nearestRoad(map, x, z, 3);
  if (!hit) return base;
  const half = hit.road.width / 2;
  if (hit.distance <= half) return hit.height;
  const shoulder = 2.5;
  if (hit.distance >= half + shoulder) return base;
  const t = (hit.distance - half) / shoulder;
  return base + (hit.height - base) * (1 - smootherstep(t));
}

export function surfaceAt(map: MapDef, x: number, z: number): SurfaceKind {
  const hit = nearestRoad(map, x, z);
  if (hit && hit.distance <= hit.road.width / 2) return hit.surface;
  const closer = nearestRoad(map, x, z, 2.5);
  const feature = featureSurfaceAt(map, x, z);
  if (feature) return feature;
  if (closer && closer.distance <= closer.road.width / 2 + 1 && closer.surface) {
    return closer.surface;
  }
  return map.terrain.surface;
}

function rampProfile(ramp: RampDef, t: number): number {
  switch (ramp.profile ?? "linear") {
    case "smooth":
      return smootherstep(t);
    case "quarter":
      return smoothstep(t) * t;
    default:
      return t;
  }
}

/** Height of a curved ramp relative to the arena floor. */
export function rampHeightAt(ramp: RampDef, x: number, z: number): number {
  if (Math.abs(x - ramp.x) > ramp.hx || Math.abs(z - ramp.z) > ramp.hz) {
    return Number.NEGATIVE_INFINITY;
  }
  const length = (ramp.axis === "x" ? ramp.hx : ramp.hz) * 2;
  const along = ramp.axis === "x" ? x - (ramp.x - ramp.hx) : z - (ramp.z - ramp.hz);
  const raw = along / Math.max(0.001, length);
  const t = ramp.dir === 1 ? raw : 1 - raw;
  return rampProfile(ramp, Math.min(1, Math.max(0, t))) * ramp.height;
}

/**
 * Climbable props expose a continuous traversable top. Logs are a ridge along
 * their local X axis; rocks and mounds are a smooth dome. Both profiles have a
 * zero gradient at their outer edge, so a kart rolls on instead of hitting a
 * step, and both are sampled by the physics height field.
 */
export function climbableHeightAt(obstacle: ObstacleDef, x: number, z: number): number {
  if (obstacle.category !== "climbable") return Number.NEGATIVE_INFINITY;
  const rot = obstacle.rot ?? 0;
  const [localX, localZ] = rotate(x - obstacle.x, z - obstacle.z, rot);
  if (Math.abs(localX) > obstacle.hx || Math.abs(localZ) > obstacle.hz) {
    return Number.NEGATIVE_INFINITY;
  }
  const u = Math.min(1, Math.abs(localZ) / Math.max(0.001, obstacle.hz));
  const v = Math.min(1, Math.abs(localX) / Math.max(0.001, obstacle.hx));
  // 1 - smoothstep: flat at the rim and at the crown.
  const profile =
    obstacle.kind === "log"
      ? 1 - smoothstep(u)
      : (1 - smoothstep(u)) * (1 - smoothstep(v));
  return (obstacle.base ?? 0) + Math.max(0, obstacle.h * profile);
}

/**
 * Walkable height at a point.
 *
 * Ramps and climbable props are always sampled. Raised decks only count once
 * the query height is close to their top, which is what lets bridges be driven
 * under as well as over.
 */
function platformRot(platform: { rot?: number }): number {
  return platform.rot ?? 0;
}

export function groundHeightAt(
  map: MapDef,
  x: number,
  z: number,
  y = Number.POSITIVE_INFINITY,
): number {
  let height = terrainHeightAt(map, x, z);

  for (const ramp of map.ramps) {
    const rampHeight = rampHeightAt(ramp, x, z);
    if (rampHeight > height) height = rampHeight;
  }

  for (const obstacle of map.obstacles) {
    const top = climbableHeightAt(obstacle, x, z);
    if (top > height) height = top;
  }

  for (const platform of map.platforms) {
    const rot = platformRot(platform);
    const [localX, localZ] = rotate(x - platform.x, z - platform.z, rot);
    if (Math.abs(localX) <= platform.hx && Math.abs(localZ) <= platform.hz) {
      // Bridges and tunnels have a real underside. A kart below that underside
      // drives through the gap; it must not be snapped onto the deck.
      if (y >= platform.height - 0.9) {
        height = Math.max(height, platform.height);
      }
    }
  }

  return height;
}

/** Surface under a kart, preferring a deck when the kart is standing on one. */
export function groundSurfaceAt(
  map: MapDef,
  x: number,
  z: number,
  y = Number.POSITIVE_INFINITY,
): SurfaceKind {
  let best = surfaceAt(map, x, z);
  for (const platform of map.platforms) {
    const [localX, localZ] = rotate(x - platform.x, z - platform.z, platformRot(platform));
    if (
      Math.abs(localX) <= platform.hx &&
      Math.abs(localZ) <= platform.hz &&
      y >= platform.height - 0.9 &&
      platform.surface
    ) {
      best = platform.surface;
    }
  }
  for (const ramp of map.ramps) {
    const rampHeight = rampHeightAt(ramp, x, z);
    if (rampHeight > Number.NEGATIVE_INFINITY && ramp.surface) {
      if (rampHeight >= groundHeightAt(map, x, z, y) - 0.05) best = ramp.surface;
    }
  }
  return best;
}

/**
 * Central-difference normal of the *collision* height field. Decorative mesh
 * normals are never used for physics.
 */
export function sampleTerrain(
  map: MapDef,
  x: number,
  z: number,
  y = Number.POSITIVE_INFINITY,
): TerrainSample {
  const step = 0.35;
  const height = groundHeightAt(map, x, z, y);
  const hx = (groundHeightAt(map, x + step, z, y) - groundHeightAt(map, x - step, z, y)) / (step * 2);
  const hz = (groundHeightAt(map, x, z + step, y) - groundHeightAt(map, x, z - step, y)) / (step * 2);
  const length = Math.hypot(hx, 1, hz);
  return {
    height,
    hx,
    hz,
    nx: -hx / length,
    ny: 1 / length,
    nz: -hz / length,
    slope: (Math.atan(Math.hypot(hx, hz)) * 180) / Math.PI,
    surface: groundSurfaceAt(map, x, z, y),
  };
}

export function groundNormalAt(
  map: MapDef,
  x: number,
  z: number,
  y = Number.POSITIVE_INFINITY,
): [number, number, number] {
  const sample = sampleTerrain(map, x, z, y);
  return [sample.nx, sample.ny, sample.nz];
}

export function slopeAt(map: MapDef, x: number, z: number, y?: number): number {
  return sampleTerrain(map, x, z, y).slope;
}

/**
 * Natural ground slope. Road carving and its 2.5-unit shoulder are engineered
 * transitions, not terrain, so this samples the raw height field. Ramp and
 * deck geometry is validated separately by ramp-angle checks.
 */
export function terrainSlopeAt(map: MapDef, x: number, z: number, step = 1): number {
  const hx = (baseTerrainHeight(map, x + step, z) - baseTerrainHeight(map, x - step, z)) / (step * 2);
  const hz = (baseTerrainHeight(map, x, z + step) - baseTerrainHeight(map, x, z - step)) / (step * 2);
  return (Math.atan(Math.hypot(hx, hz)) * 180) / Math.PI;
}

/** Maximum natural terrain slope, excluding ramps and elevated decks. */
export function maximumTerrainSlope(map: MapDef, step = 2): number {
  let maximum = 0;
  for (let x = -map.size / 2 + step / 2; x < map.size / 2; x += step) {
    for (let z = -map.depth / 2 + step / 2; z < map.depth / 2; z += step) {
      maximum = Math.max(maximum, terrainSlopeAt(map, x, z, Math.max(0.75, step / 2)));
    }
  }
  return maximum;
}

/** True when a point lies inside the authored driveable footprint. */
export function insideArena(map: MapDef, x: number, z: number): boolean {
  return Math.abs(x) < map.size / 2 && Math.abs(z) < map.depth / 2;
}

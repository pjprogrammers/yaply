import { KART, OBSTACLE_RULES } from "./constants";
import type { HazardDef, MapDef, MapRoute, ObstacleDef, PlatformDef, RampDef } from "./types";

/**
 * Yaply Arena Design Standard v1.
 *
 * These are the tuning targets the Smash Karts maps are authored and tested
 * against. They are deliberately expressed in arena units so a map can be
 * audited without booting WebGL.
 */
export const ARENA_STANDARD = {
  arena: {
    /** Width x depth ratios accepted for the current map families. */
    ratios: [1, 1.25, 1.5, 1.7],
    minWidth: 100,
  },
  lane: {
    mainMin: 8,
    mainMax: 12,
    secondaryMin: 5,
    secondaryMax: 7,
  },
  obstacleFootprint: { min: 0.15, max: 0.22 },
  hazard: { min: 0.05, max: 0.1 },
  pickup: {
    min: 7,
    max: 10,
    minSpacing: 10,
    clearance: 1.5,
    spawnClearance: 6,
    boostClearance: 4,
    respawnSeconds: 9,
  },
  boost: { clearance: 1.5, spawnClearance: 6, pickupClearance: 4 },
  ramp: { minAngle: 18, maxAngle: 26, targetMin: 20, targetMax: 25 },
  routes: { min: 3, max: 4 },
  spawn: { clearance: 3, separation: 5 },
} as const;

export interface MapAuditIssue {
  code: string;
  message: string;
}

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

/** Solid footprint includes obstacles, raised decks and their ramps. */
export function solidFootprintArea(map: MapDef): number {
  return (
    map.obstacles.reduce((total, obstacle) => total + obstacleArea(obstacle), 0) +
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

function distanceToRect(
  x: number,
  z: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number,
  rot = 0,
): number {
  const dx = x - cx;
  const dz = z - cz;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  // Inverse-rotate the sample into the box's local frame.
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const outsideX = Math.max(Math.abs(localX) - hx, 0);
  const outsideZ = Math.max(Math.abs(localZ) - hz, 0);
  return Math.hypot(outsideX, outsideZ);
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
}

/**
 * Distance from a kart centre to the nearest solid or dangerous edge. Half of
 * this value is the usable lane width when a point sits on a route centreline.
 */
export function clearanceAt(
  map: MapDef,
  x: number,
  z: number,
  options: ClearanceOptions = {},
): number {
  const includeHazards = options.hazards ?? true;
  const includePlatforms = options.platforms ?? true;
  let best = Math.min(map.size / 2 - Math.abs(x), map.depth / 2 - Math.abs(z));

  for (const obstacle of map.obstacles) {
    if (!OBSTACLE_RULES[obstacle.kind].solid) continue;
    // Props stacked on a deck sit above a ground-level lane, so they do not
    // narrow it even though they still count toward the solid footprint.
    if ((obstacle.base ?? 0) > 0.5) continue;
    best = Math.min(
      best,
      distanceToRect(x, z, obstacle.x, obstacle.z, obstacle.hx, obstacle.hz, obstacle.rot ?? 0),
    );
  }
  if (includePlatforms) {
    for (const platform of map.platforms) {
      best = Math.min(
        best,
        distanceToRect(x, z, platform.x, platform.z, platform.hx, platform.hz),
      );
    }
  }
  if (includeHazards) {
    for (const hazard of map.hazards) {
      best = Math.min(best, distanceToHazard(hazard, x, z));
    }
  }
  return Math.max(0, best);
}

export function pointInHazard(map: MapDef, x: number, z: number): boolean {
  return map.hazards.some((hazard) => distanceToHazard(hazard, x, z) === 0);
}

export function polylineClearance(
  map: MapDef,
  points: Array<[number, number]>,
  options: ClearanceOptions = {},
): number {
  if (points.length === 0) return 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, z1] = points[index];
    const [x2, z2] = points[(index + 1) % points.length];
    const length = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(1, Math.ceil(length / 0.5));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      best = Math.min(
        best,
        clearanceAt(map, x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, options),
      );
    }
  }
  return best;
}

export function routeClearance(map: MapDef, route: MapRoute): number {
  return polylineClearance(map, route.waypoints);
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

/**
 * Flood-fills the drivable floor from every spawn. A point passes when any
 * reachable cell is within `radius` units of it, which tolerates pickups placed
 * at the edge of a lane.
 */
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
      if (clearanceAt(map, x, z) >= minClearance) {
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

/** A ramp belongs to a deck when its high edge meets that deck's edge. */
export function rampConnectsToPlatform(ramp: RampDef, platform: PlatformDef): boolean {
  if (Math.abs(ramp.height - platform.height) > 0.15) return false;
  if (ramp.axis === "z") {
    const highZ = ramp.z + ramp.dir * ramp.hz;
    const platformEdge = platform.z + (ramp.dir === 1 ? -platform.hz : platform.hz);
    const overlapX = Math.abs(ramp.x - platform.x) <= platform.hx + ramp.hx - 0.5;
    return Math.abs(highZ - platformEdge) <= 1.2 && overlapX;
  }
  const highX = ramp.x + ramp.dir * ramp.hx;
  const platformEdge = platform.x + (ramp.dir === 1 ? -platform.hx : platform.hx);
  const overlapZ = Math.abs(ramp.z - platform.z) <= platform.hz + ramp.hz - 0.5;
  return Math.abs(highX - platformEdge) <= 1.2 && overlapZ;
}

export function detachedRamps(map: MapDef): RampDef[] {
  return map.ramps.filter(
    (ramp) => !map.platforms.some((platform) => rampConnectsToPlatform(ramp, platform)),
  );
}

export function auditMap(map: MapDef): MapAuditIssue[] {
  const issues: MapAuditIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });

  const ratio = Math.max(map.size, map.depth) / Math.min(map.size, map.depth);
  if (!ARENA_STANDARD.arena.ratios.some((value) => Math.abs(value - ratio) < 0.001)) {
    add("arena-ratio", `${map.name} has an unsupported ${map.size}x${map.depth} footprint.`);
  }
  if (Math.min(map.size, map.depth) < ARENA_STANDARD.arena.minWidth) {
    add("arena-size", `${map.name} is smaller than ${ARENA_STANDARD.arena.minWidth} units.`);
  }

  const footprint = solidFootprintPercent(map);
  if (
    footprint < ARENA_STANDARD.obstacleFootprint.min ||
    footprint > ARENA_STANDARD.obstacleFootprint.max
  ) {
    add(
      "obstacle-footprint",
      `${map.name} uses ${(footprint * 100).toFixed(1)}% solid footprint; target is 15-22%.`,
    );
  }

  const hazardShare = hazardPercent(map);
  if (hazardShare < ARENA_STANDARD.hazard.min || hazardShare > ARENA_STANDARD.hazard.max) {
    add(
      "hazard-share",
      `${map.name} has ${(hazardShare * 100).toFixed(1)}% hazard terrain; target is 5-10%.`,
    );
  }

  for (const ramp of map.ramps) {
    const angle = rampAngleDegrees(ramp);
    if (angle < ARENA_STANDARD.ramp.minAngle || angle > ARENA_STANDARD.ramp.maxAngle) {
      add(
        "ramp-angle",
        `${map.name} ramp at ${ramp.x},${ramp.z} is ${angle.toFixed(1)} degrees; target is 18-26.`,
      );
    }
  }
  for (const obstacle of map.obstacles) {
    if (obstacle.h <= KART.stepHeight && OBSTACLE_RULES[obstacle.kind].solid) {
      add(
        "climbable-obstacle",
        `${map.name} ${obstacle.kind} at ${obstacle.x},${obstacle.z} is below the step height but solid.`,
      );
    }
  }
  for (const platform of map.platforms) {
    if (platform.height <= KART.stepHeight) {
      add(
        "platform-step",
        `${map.name} platform at ${platform.x},${platform.z} is too low to block side entry.`,
      );
    }
  }

  if (
    map.pickups.length < ARENA_STANDARD.pickup.min ||
    map.pickups.length > ARENA_STANDARD.pickup.max
  ) {
    add(
      "pickup-count",
      `${map.name} has ${map.pickups.length} crates; target is ${ARENA_STANDARD.pickup.min}-${ARENA_STANDARD.pickup.max}.`,
    );
  }
  const spacing = pickupSpacing(map);
  if (spacing < ARENA_STANDARD.pickup.minSpacing) {
    add(
      "pickup-spacing",
      `${map.name} crates are ${spacing.toFixed(1)} units apart; minimum is ${ARENA_STANDARD.pickup.minSpacing}.`,
    );
  }
  for (const [x, z] of map.pickups) {
    if (clearanceAt(map, x, z) < ARENA_STANDARD.pickup.clearance) {
      add("pickup-clearance", `${map.name} crate at ${x},${z} is embedded in cover.`);
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
  const unreachable = unreachablePickups(map);
  for (const [x, z] of unreachable) {
    add("pickup-unreachable", `${map.name} crate at ${x},${z} has no drivable approach.`);
  }

  if (
    map.routes.length < ARENA_STANDARD.routes.min ||
    map.routes.length > ARENA_STANDARD.routes.max
  ) {
    add(
      "route-count",
      `${map.name} has ${map.routes.length} routes; target is ${ARENA_STANDARD.routes.min}-${ARENA_STANDARD.routes.max}.`,
    );
  }
  for (const route of map.routes) {
    const clearance = routeClearance(map, route);
    const minWidth =
      route.kind === "main" ? ARENA_STANDARD.lane.mainMin : ARENA_STANDARD.lane.secondaryMin;
    if (clearance * 2 < minWidth) {
      add(
        "route-width",
        `${map.name} route "${route.name}" narrows to ${(clearance * 2).toFixed(1)} units; minimum is ${minWidth}.`,
      );
    }
  }

  for (const [x, z] of map.spawns) {
    if (clearanceAt(map, x, z) < ARENA_STANDARD.spawn.clearance) {
      add("spawn-clearance", `${map.name} spawn at ${x},${z} is too close to cover.`);
    }
  }
  const separation = spawnSeparation(map);
  if (separation < ARENA_STANDARD.spawn.separation) {
    add(
      "spawn-separation",
      `${map.name} spawns are ${separation.toFixed(1)} units apart; minimum is ${ARENA_STANDARD.spawn.separation}.`,
    );
  }

  return issues;
}

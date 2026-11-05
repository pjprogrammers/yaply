import type {
  HazardDef,
  HazardKind,
  MapTheme,
  ObstacleDef,
  PlatformDef,
  RampDef,
  RoadDef,
  SurfaceKind,
} from "../types";

export const box = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  h: number,
  kind: ObstacleDef["kind"],
  color?: number,
  base?: number,
  rot?: number,
): ObstacleDef => ({ x, z, hx, hz, h, kind, color, base, rot });

/**
 * Category 2 from maps.md: a low, continuous surface a kart can drive over.
 * `climbDegrees` describes the sloped top; the engine samples it through
 * `climbableHeightAt` so collision and visuals agree.
 */
export const climbable = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  h: number,
  kind: ObstacleDef["kind"] = "log",
  color?: number,
  rot = 0,
  climbDegrees = 18,
): ObstacleDef => ({
  x,
  z,
  hx,
  hz,
  h,
  kind,
  color,
  rot,
  category: "climbable",
  climbDegrees,
});

/**
 * Category 3 from maps.md: a purely visual prop. It is rendered with the
 * obstacle meshes but never enters the collision or projectile queries.
 */
export const decorative = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  h: number,
  kind: ObstacleDef["kind"] = "planter",
  color?: number,
  rot = 0,
): ObstacleDef => ({
  x,
  z,
  hx,
  hz,
  h,
  kind,
  color,
  rot,
  category: "decorative",
});

/** Overhead tunnel shell. Collision walls are authored separately. */
export const tunnelCeiling = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  height: number,
  color?: number,
): { kind: "tunnelCeiling"; x: number; z: number; hx: number; hz: number; height: number; color?: number } => ({
  kind: "tunnelCeiling",
  x,
  z,
  hx,
  hz,
  height,
  color,
});

export const platform = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  height: number,
  kind: PlatformDef["kind"],
  color?: number,
  surface?: SurfaceKind,
  clearance?: number,
): PlatformDef => ({ x, z, hx, hz, height, kind, color, surface, clearance });

export const ramp = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  height: number,
  axis: RampDef["axis"],
  dir: RampDef["dir"],
  kind: RampDef["kind"] = "steel",
  color?: number,
  profile: RampDef["profile"] = "linear",
  surface?: SurfaceKind,
): RampDef => ({ x, z, hx, hz, height, axis, dir, kind, color, profile, surface });

export const hazard = (x: number, z: number, radius: number, kind: HazardKind): HazardDef => ({
  x,
  z,
  radius,
  kind,
});

export const rectHazard = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  kind: HazardKind,
): HazardDef => ({ x, z, hx, hz, kind });

export const road = (
  name: string,
  kind: RoadDef["kind"],
  points: RoadDef["points"],
  width: number,
  surface: SurfaceKind,
  options: Partial<Pick<RoadDef, "closed" | "banking" | "lift">> = {},
): RoadDef => ({ name, kind, points, width, surface, ...options });

export const theme = (value: MapTheme): MapTheme => value;

/** Eight spawn slots on a rounded rectangle, inset from the arena wall. */
export function gridSpawns(width: number, depth: number, inset = 6): Array<[number, number]> {
  const x = width / 2 - inset;
  const z = depth / 2 - inset;
  return [
    [x * 0.3, z],
    [x, z * 0.3],
    [x, -z * 0.3],
    [x * 0.3, -z],
    [-x * 0.3, -z],
    [-x, -z * 0.3],
    [-x, z * 0.3],
    [-x * 0.3, z],
  ];
}

/** Four corner spawns used by compact symmetrical arenas. */
export function cornerSpawns(width: number, depth: number, inset = 12): Array<[number, number]> {
  const x = width / 2 - inset;
  const z = depth / 2 - inset;
  return [
    [x, z * 0.55],
    [x, -z * 0.55],
    [x * 0.55, -z],
    [-x * 0.55, -z],
    [-x, -z * 0.55],
    [-x, z * 0.55],
    [-x * 0.55, z],
    [x * 0.55, z],
  ];
}

/** Standard rounded perimeter loop control points. */
export function perimeterLoop(
  width: number,
  depth: number,
  inset: number,
): Array<[number, number]> {
  const x = width / 2 - inset;
  const z = depth / 2 - inset;
  return [
    [-x * 0.55, z],
    [x * 0.55, z],
    [x, z * 0.55],
    [x, -z * 0.55],
    [x * 0.55, -z],
    [-x * 0.55, -z],
    [-x, -z * 0.55],
    [-x, z * 0.55],
  ];
}

export function innerLoop(
  width: number,
  depth: number,
  inset: number,
): Array<[number, number]> {
  return perimeterLoop(width, depth, inset);
}

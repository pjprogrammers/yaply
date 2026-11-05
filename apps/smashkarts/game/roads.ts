import type { MapDef, RoadDef, SurfaceKind } from "./types";

/** Clamped cubic smoothstep: 3t² - 2t³. */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Quintic smoothstep: 6t⁵ - 15t⁴ + 10t³ (zero first and second derivative). */
export function smootherstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface RoadSample {
  x: number;
  z: number;
  y: number;
  /** Unit tangent in the X/Z plane. */
  tx: number;
  tz: number;
  /** Unit lateral (left-hand) direction in the X/Z plane. */
  lx: number;
  lz: number;
  /** Curvature κ = |C' × C''| / |C'|³. */
  curvature: number;
  /** 1/κ, or Infinity when the centreline is straight. */
  radius: number;
  /** Distance travelled along the centreline. */
  distance: number;
}

export interface RoadGeometry {
  def: RoadDef;
  samples: RoadSample[];
  length: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RoadHit {
  road: RoadDef;
  geometry: RoadGeometry;
  /** Perpendicular distance to the centreline. */
  distance: number;
  /** Signed lateral offset, positive toward the left edge. */
  lateral: number;
  height: number;
  surface: SurfaceKind;
  curvature: number;
  radius: number;
  /** 0 at the centre, 1 at the edge. */
  edge: number;
}

type Point3 = [number, number, number];

function controlPoint(point: RoadDef["points"][number]): Point3 {
  return [point[0], point.length > 2 ? (point[2] as number) : 0, point[1]];
}

function catmull(p0: Point3, p1: Point3, p2: Point3, p3: Point3, t: number): Point3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 *
      (2 * p1[0] +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
    0.5 *
      (2 * p1[2] +
        (-p0[2] + p2[2]) * t +
        (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 +
        (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3),
  ];
}

/**
 * Samples a closed or open Catmull-Rom centreline. Sampling density is derived
 * from the control-polygon length so hairpins keep their geometry while long
 * straights stay cheap.
 */
export function sampleRoad(road: RoadDef): RoadGeometry {
  const points = road.points.map(controlPoint);
  const count = points.length;
  const closed = road.closed ?? true;
  if (count < 2) {
    throw new Error(`Road "${road.name}" needs at least two control points.`);
  }
  const segmentCount = closed ? count : count - 1;
  const raw: Array<{ x: number; z: number; y: number }> = [];
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const i0 = closed ? (segment - 1 + count) % count : Math.max(0, segment - 1);
    const i1 = segment;
    const i2 = closed ? (segment + 1) % count : segment + 1;
    const i3 = closed ? (segment + 2) % count : Math.min(count - 1, segment + 2);
    const p0 = points[i0];
    const p1 = points[i1];
    const p2 = points[i2];
    const p3 = points[i3];
    const planar = Math.hypot(p2[0] - p1[0], p2[2] - p1[2]);
    const steps = Math.max(4, Math.ceil(planar / 2.5));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const [x, y, z] = catmull(p0, p1, p2, p3, t);
      raw.push({ x, y, z });
    }
  }
  if (!closed) {
    const last = points[count - 1];
    raw.push({ x: last[0], y: last[1], z: last[2] });
  }
  if (raw.length < 2) {
    raw.push({ ...raw[0] });
  }

  const samples: RoadSample[] = [];
  let distance = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const prev = raw[(i - 1 + raw.length) % raw.length];
    const next = raw[(i + 1) % raw.length];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const planar = Math.hypot(dx, dz) || 1;
    const tx = dx / planar;
    const tz = dz / planar;
    if (i > 0) {
      distance += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].z - raw[i - 1].z);
    }
    samples.push({
      x: raw[i].x,
      z: raw[i].z,
      y: raw[i].y,
      tx,
      tz,
      lx: -tz,
      lz: tx,
      curvature: 0,
      radius: Number.POSITIVE_INFINITY,
      distance,
    });
  }

  // Discrete curvature from the change in heading per metre.
  for (let i = 0; i < samples.length; i += 1) {
    const prev = samples[(i - 1 + samples.length) % samples.length];
    const next = samples[(i + 1) % samples.length];
    const ax = samples[i].x - prev.x;
    const az = samples[i].z - prev.z;
    const bx = next.x - samples[i].x;
    const bz = next.z - samples[i].z;
    const cross = ax * bz - az * bx;
    const la = Math.hypot(ax, az) || 1;
    const lb = Math.hypot(bx, bz) || 1;
    const lc = Math.hypot(next.x - prev.x, next.z - prev.z) || 1;
    const curvature = Math.abs(cross) / (la * lb * lc);
    samples[i].curvature = curvature;
    samples[i].radius = curvature < 1e-5 ? Number.POSITIVE_INFINITY : 1 / curvature;
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const sample of samples) {
    minX = Math.min(minX, sample.x);
    maxX = Math.max(maxX, sample.x);
    minZ = Math.min(minZ, sample.z);
    maxZ = Math.max(maxZ, sample.z);
  }

  return {
    def: road,
    samples,
    length: distance,
    minX,
    maxX,
    minZ,
    maxZ,
  };
}

const ROAD_CACHE = new WeakMap<MapDef, RoadGeometry[]>();

export function roadNetwork(map: MapDef): RoadGeometry[] {
  const cached = ROAD_CACHE.get(map);
  if (cached) return cached;
  const geometries = map.roads.map(sampleRoad);
  ROAD_CACHE.set(map, geometries);
  return geometries;
}

function segmentHit(
  geometry: RoadGeometry,
  x: number,
  z: number,
  index: number,
): { distance: number; lateral: number; height: number; t: number } {
  const a = geometry.samples[index];
  const b = geometry.samples[(index + 1) % geometry.samples.length];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 1e-8 ? Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq)) : 0;
  const px = a.x + dx * t;
  const pz = a.z + dz * t;
  const distance = Math.hypot(x - px, z - pz);
  const length = Math.sqrt(lengthSq) || 1;
  // Left normal of this segment.
  const lx = -dz / length;
  const lz = dx / length;
  const lateral = (x - px) * lx + (z - pz) * lz;
  const height = a.y + (b.y - a.y) * t;
  return { distance, lateral, height, t };
}

/**
 * Nearest centreline hit across a road network. Bounding boxes reject most
 * roads before the segment loop, which keeps per-tick terrain queries cheap.
 */
export function nearestRoad(
  map: MapDef,
  x: number,
  z: number,
  margin = 0,
): RoadHit | null {
  let best: RoadHit | null = null;
  for (const geometry of roadNetwork(map)) {
    const road = geometry.def;
    const reach = road.width / 2 + margin;
    if (
      x < geometry.minX - reach ||
      x > geometry.maxX + reach ||
      z < geometry.minZ - reach ||
      z > geometry.maxZ + reach
    ) {
      continue;
    }
    const segments = geometry.samples.length;
    for (let index = 0; index < segments; index += 1) {
      const hit = segmentHit(geometry, x, z, index);
      if (!best || hit.distance < best.distance) {
        const sample = geometry.samples[index];
        best = {
          road,
          geometry,
          distance: hit.distance,
          lateral: hit.lateral,
          height:
            hit.height +
            (road.lift ?? 0.02) +
            Math.tan(road.banking ?? 0) * hit.lateral,
          surface: road.surface,
          curvature: sample.curvature,
          radius: sample.radius,
          edge: Math.min(1, hit.distance / Math.max(0.01, road.width / 2)),
        };
      }
    }
  }
  return best;
}

/** The road surface height when a point lies on the carriageway. */
export function roadHeightAt(map: MapDef, x: number, z: number): number | null {
  const hit = nearestRoad(map, x, z);
  if (!hit) return null;
  return hit.distance <= hit.road.width / 2 ? hit.height : null;
}

export function roadSurfaceAt(map: MapDef, x: number, z: number): SurfaceKind | null {
  const hit = nearestRoad(map, x, z);
  if (!hit) return null;
  return hit.distance <= hit.road.width / 2 ? hit.surface : null;
}

export interface RoadMetrics {
  averageWidth: number;
  minimumWidth: number;
  minimumRadius: number;
  averageCurvature: number;
  /** Tightest curvature normalised to the kart's minimum turning radius. */
  tightestTurnRatio: number;
}

export function roadMetrics(map: MapDef): RoadMetrics {
  const geometries = roadNetwork(map);
  if (geometries.length === 0) {
    return {
      averageWidth: 0,
      minimumWidth: 0,
      minimumRadius: Number.POSITIVE_INFINITY,
      averageCurvature: 0,
      tightestTurnRatio: 0,
    };
  }
  let totalWidth = 0;
  let minWidth = Number.POSITIVE_INFINITY;
  let minRadius = Number.POSITIVE_INFINITY;
  let totalCurvature = 0;
  let sampleCount = 0;
  for (const geometry of geometries) {
    totalWidth += geometry.def.width;
    minWidth = Math.min(minWidth, geometry.def.width);
    for (const sample of geometry.samples) {
      totalCurvature += sample.curvature;
      minRadius = Math.min(minRadius, sample.radius);
      sampleCount += 1;
    }
  }
  return {
    averageWidth: totalWidth / geometries.length,
    minimumWidth: minWidth,
    minimumRadius: minRadius,
    averageCurvature: sampleCount > 0 ? totalCurvature / sampleCount : 0,
    tightestTurnRatio: Number.isFinite(minRadius) ? minRadius / 5 : Number.POSITIVE_INFINITY,
  };
}

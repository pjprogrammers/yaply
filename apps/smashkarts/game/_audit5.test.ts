import { it } from "vitest";
import { writeFileSync } from "fs";
import { MAP_LIST } from "./maps";
import { rampConnectsToPlatform } from "./arena-spec";
import type { PlatformDef } from "./types";

function rotatePoint(x: number, z: number, rot: number): [number, number] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [x * c - z * s, x * s + z * c];
}

/** Shortest gap between two rotated rectangles (0 when overlapping). */
function rectGap(a: PlatformDef, b: PlatformDef): number {
  const [dx, dz] = rotatePoint(b.x - a.x, b.z - a.z, -(a.rot ?? 0));
  const ox = Math.max(Math.abs(dx) - a.hx - b.hx, 0);
  const oz = Math.max(Math.abs(dz) - a.hz - b.hz, 0);
  return Math.hypot(ox, oz);
}

function analyse(m: (typeof MAP_LIST)[number]) {
  const n = m.platforms.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };
  const grounded = new Set<number>();
  for (let i = 0; i < n; i += 1) {
    if (m.ramps.some((r) => rampConnectsToPlatform(r, m.platforms[i]))) grounded.add(i);
    for (let j = i + 1; j < n; j += 1) {
      if (Math.abs(m.platforms[i].height - m.platforms[j].height) <= 0.35 && rectGap(m.platforms[i], m.platforms[j]) <= 1) {
        union(i, j);
      }
    }
  }
  const roots = new Set([...grounded].map(find));
  return m.platforms
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => !roots.has(find(i)))
    .map(({ p }) => ({ map: m.id, kind: p.kind, x: p.x, z: p.z, h: p.height, hx: p.hx, hz: p.hz, clearance: p.clearance ?? null }));
}

it("deck reachability", () => {
  const rows = MAP_LIST.flatMap(analyse);
  writeFileSync("/tmp/opencode/unreachable-decks.json", JSON.stringify(rows, null, 1));
});

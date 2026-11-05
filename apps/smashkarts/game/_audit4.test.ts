import { it } from "vitest";
import { writeFileSync } from "fs";
import { MAP_LIST } from "./maps";
import { rampConnectsToPlatform } from "./arena-spec";

it("platform ramps", () => {
  const rows: unknown[] = [];
  for (const m of MAP_LIST) {
    for (const p of m.platforms) {
      const ramps = m.ramps.filter((r) => rampConnectsToPlatform(r, p));
      if (ramps.length === 0) {
        // nearest ramp high edge
        let best = Infinity;
        for (const r of m.ramps) {
          const ex = r.axis === "x" ? r.x + r.dir * r.hx : r.x;
          const ez = r.axis === "z" ? r.z + r.dir * r.hz : r.z;
          const ox = Math.max(Math.abs(ex - p.x) - p.hx, 0);
          const oz = Math.max(Math.abs(ez - p.z) - p.hz, 0);
          best = Math.min(best, Math.hypot(ox, oz));
        }
        rows.push({ map: m.id, kind: p.kind, x: p.x, z: p.z, h: p.height, nearestRamp: +best.toFixed(1) });
      }
    }
  }
  writeFileSync("/tmp/opencode/platforms.json", JSON.stringify(rows, null, 1));
});

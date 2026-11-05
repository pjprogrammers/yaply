import { it } from "vitest";
import { writeFileSync } from "fs";
import { MAPS } from "./maps";
import { localDensityAt } from "./arena-builder";
import { OBSTACLE_RULES } from "./constants";

it("density", () => {
  const map = MAPS["hollow-graveyard"];
  let worst = 0, wx = 0, wz = 0;
  for (let x = -map.size/2+1; x < map.size/2; x += 2) {
    for (let z = -map.depth/2+1; z < map.depth/2; z += 2) {
      const d = localDensityAt(map.obstacles, x, z, 15);
      if (d > worst) { worst = d; wx = x; wz = z; }
    }
  }
  const half = 7.5;
  const contrib = map.obstacles.filter(o => {
    if (o.category === "decorative") return false;
    if (!OBSTACLE_RULES[o.kind].solid) return false;
    return Math.abs(o.x-wx) <= half + o.hx && Math.abs(o.z-wz) <= half + o.hz;
  }).map(o => ({ x:+o.x.toFixed(1), z:+o.z.toFixed(1), hx:o.hx, hz:o.hz, kind:o.kind, cat:o.category }));
  writeFileSync("/tmp/opencode/density.json", JSON.stringify({ worst, wx, wz, contrib }, null, 1));
});

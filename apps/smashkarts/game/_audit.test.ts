import { it } from "vitest";
import { writeFileSync } from "fs";
import { MAP_LIST } from "./maps";
import { buildMapReport } from "./arena-spec";

it("audit", () => {
  const rows = MAP_LIST.map((map) => {
    const r = buildMapReport(map);
    return {
      id: map.id,
      quality: r.quality,
      issues: r.issues.map((i) => `${i.code}: ${i.message}`),
      minRadius: +r.roads.minimumRadius.toFixed(1),
      turn: +r.minimumTurningRadius.toFixed(2),
      tight: +(r.curvature.tight * 100).toFixed(1),
      overlaps: r.collisionOverlaps,
      headroom: r.minimumVerticalClearance,
      deadEnds: r.deadEnds.length,
      drivable: +(r.navigablePercent * 100).toFixed(1),
      deco: +(r.decorativePercent * 100).toFixed(1),
      solid: +(r.occupancy.solid * 100).toFixed(1),
      footprint: +(r.occupancy.footprint * 100).toFixed(1),
      climbs: map.obstacles.filter((o) => o.category === "climbable").length,
      decoObjs: map.obstacles.filter((o) => o.category === "decorative").length,
      pickups: map.pickups.length,
      spawns: map.spawns.length,
      routes: map.routes.length,
      maxSlope: +r.maxTerrainSlope.toFixed(1),
    };
  });
  writeFileSync("/tmp/opencode/metrics3.json", JSON.stringify(rows, null, 1));
});

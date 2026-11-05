import { it } from "vitest";
import { writeFileSync } from "fs";
import { MAP_LIST } from "./maps";
import { buildMapReport, disconnectedPlatforms } from "./arena-spec";

it("report", () => {
  const rows = MAP_LIST.map((m) => {
    const r = buildMapReport(m);
    return {
      id: m.id,
      quality: r.quality,
      disconnected: r.disconnectedPlatforms,
      disconnectedReal: disconnectedPlatforms(m).length,
      detached: r.detachedRamps,
      dead: r.deadEnds.length,
      headroom: +r.minimumVerticalClearance.toFixed(2),
      issues: r.issues.map((i) => `${i.code}: ${i.message}`),
    };
  });
  writeFileSync("/tmp/opencode/report6.json", JSON.stringify(rows, null, 1));
});

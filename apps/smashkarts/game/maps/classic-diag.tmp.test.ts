import { describe, it } from "vitest";
import { writeFileSync } from "node:fs";
import { buildMapReport, occupancyReport } from "../arena-spec";
import { CLASSIC_MAPS } from "./classic";

describe("diag", () => {
  it("prints", () => {
    const lines: string[] = [];
    const console = { log: (...args: unknown[]) => lines.push(args.join(" ")) };
    for (const map of CLASSIC_MAPS) {
      const r = buildMapReport(map);
      const occ = occupancyReport(map);
      console.log("\n===", map.id, map.size, "x", map.depth, "===");
      console.log("quality", r.quality, "issues", r.issues.map((i) => `${i.code}:${i.message}`));
      console.log("routes", map.routes.length, r.routeWidths.map((x) => `${x.name}=${x.width.toFixed(1)}`).join(" | "));
      console.log("pickups", r.pickups, "spacing", r.pickupSpacing.toFixed(1), map.pickups.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" / "));
      console.log("spawns", r.spawns, "sep", r.spawnSeparation.toFixed(1), map.spawns.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" / "));
      console.log("ramps", map.ramps.map((rp) => `${rp.x.toFixed(1)},${rp.z.toFixed(1)} h=${rp.height} ang=${r.ramps.find((x) => x.x === rp.x && x.z === rp.z)?.angle.toFixed(1)} land=${r.ramps.find((x) => x.x === rp.x && x.z === rp.z)?.landing}`).join(" | "));
      console.log("platforms", map.platforms.map((p) => `${p.kind}@${p.x.toFixed(1)},${p.z.toFixed(1)} h=${p.height} cl=${p.clearance ?? "-"}`).join(" | "));
      console.log("hazards", map.hazards.map((h) => `${h.kind}@${h.x.toFixed(1)},${h.z.toFixed(1)} hx=${h.hx?.toFixed(1) ?? h.radius?.toFixed(1)} hz=${h.hz?.toFixed(1) ?? ""}`).join(" | "));
      console.log("occ", JSON.stringify(occ));
      console.log("roads", map.roads.map((rd) => `${rd.name}(${rd.kind}) w=${rd.width} ${rd.surface} closed=${rd.closed ?? true} pts=${rd.points.length}`).join(" | "));
      console.log("obstacles", map.obstacles.length, "decor", map.obstacles.filter((o) => o.category === "decorative").length, "climb", map.obstacles.filter((o) => o.category === "climbable").length);
    }
    writeFileSync("/tmp/classic-diag.txt", lines.join("\n"));
  });
});

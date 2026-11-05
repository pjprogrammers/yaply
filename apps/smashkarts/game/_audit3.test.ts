import { it } from "vitest";
import { writeFileSync } from "fs";
import { MAP_LIST } from "./maps";

it("catalog", () => {
  const rows = MAP_LIST.map((m) => ({
    id: m.id,
    cls: m.arenaClass,
    size: m.size,
    depth: m.depth,
    pickups: m.pickups.length,
    pickupCount: m.pickups.length,
    spawns: m.spawns.length,
    routes: m.routes.map((r) => `${r.kind}:${r.name}`),
    main: m.routes.filter((r) => r.kind === "main").length,
    ramps: m.ramps.length,
    platforms: m.platforms.length,
    hazards: m.hazards.length,
    bridges: m.platforms.filter((p) => p.kind === "bridge").length,
    tunnels: m.scenery.filter((s) => s.kind === "tunnelCeiling").length,
    reactor: m.scenery.some((s) => s.kind === "reactor"),
    weather: m.weather ?? null,
    features: m.terrain.features.map((f) => f.kind),
    profiles: [...new Set(m.ramps.map((r) => r.profile ?? "linear"))],
    surfaces: [...new Set(m.roads.map((r) => r.surface))],
  }));
  writeFileSync("/tmp/opencode/catalog.json", JSON.stringify(rows, null, 1));
});

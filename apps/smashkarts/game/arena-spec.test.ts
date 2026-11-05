import { describe, expect, it } from "vitest";
import {
  ARENA_STANDARD,
  buildMapReport,
  detachedRamps,
  localDensityMax,
  occupancyReport,
  pickupSpacing,
  rampAngleDegrees,
  routeWidth,
  solidFootprintPercent,
  spawnSeparation,
  unreachablePickups,
  unreachablePoints,
  unreachableRoutePoints,
  unreachableSpawns,
} from "./arena-spec";
import { MAP_LIST } from "./maps";
import { roadMetrics } from "./roads";
import { maximumTerrainSlope } from "./terrain";

describe("arena design standard", () => {
  it("ships the full 22-arena catalogue from maps.md", () => {
    expect(MAP_LIST).toHaveLength(22);
    const ids = new Set(MAP_LIST.map((map) => map.id));
    expect(ids.size).toBe(22);
    expect(ids.has("quarry-clash")).toBe(true);
    expect(ids.has("chrome-port")).toBe(true);
  });

  for (const map of MAP_LIST) {
    describe(map.name, () => {
      it("passes the automated playability audit", () => {
        const report = buildMapReport(map);
        expect(report.issues, report.issues.map((issue) => issue.message).join("\n")).toEqual([]);
        expect(report.quality).toBe("PASS");
      });

      it("keeps 7-10 crates with safe spacing and a reachable approach", () => {
        expect(map.pickups.length).toBeGreaterThanOrEqual(ARENA_STANDARD.pickup.min);
        expect(map.pickups.length).toBeLessThanOrEqual(ARENA_STANDARD.pickup.max);
        expect(pickupSpacing(map)).toBeGreaterThanOrEqual(ARENA_STANDARD.pickup.minSpacing);
        expect(unreachablePickups(map)).toEqual([]);
      });

      it("offers at least three routes with lane-width clearance", () => {
        expect(map.routes.length).toBeGreaterThanOrEqual(ARENA_STANDARD.routes.min);
        for (const route of map.routes) {
          const minimum =
            route.kind === "main"
              ? ARENA_STANDARD.lane.mainMin
              : ARENA_STANDARD.lane.secondaryMin;
          expect(routeWidth(map, route), route.name).toBeGreaterThanOrEqual(minimum);
        }
        expect(unreachableRoutePoints(map)).toEqual([]);
      });

      it("keeps the road network wide enough for the kart's swept path", () => {
        const metrics = roadMetrics(map);
        expect(metrics.minimumWidth).toBeGreaterThanOrEqual(ARENA_STANDARD.arena.minWidth > 0 ? 5 : 0);
        expect(metrics.minimumRadius).toBeGreaterThan(4);
      });

      it("keeps local cover density under the 25% planning budget", () => {
        expect(localDensityMax(map)).toBeLessThanOrEqual(
          ARENA_STANDARD.obstacleDensity.max,
        );
      });

      it("classifies a coherent occupancy split", () => {
        const occupancy = occupancyReport(map);
        expect(occupancy.drivable).toBeGreaterThan(0.35);
        expect(occupancy.solid).toBeLessThan(0.4);
        expect(occupancy.hazard).toBeLessThan(0.2);
        expect(solidFootprintPercent(map)).toBeLessThan(0.4);
      });

      it("spawns every kart with room to leave the grid", () => {
        expect(map.spawns.length).toBeGreaterThanOrEqual(4);
        expect(spawnSeparation(map)).toBeGreaterThanOrEqual(ARENA_STANDARD.spawn.separation);
        expect(unreachableSpawns(map)).toEqual([]);
        expect(unreachablePoints(map, map.spawns, 1.5)).toEqual([]);
      });

      it("connects every ramp to a deck at a climbable angle", () => {
        expect(detachedRamps(map)).toEqual([]);
        for (const ramp of map.ramps) {
          const angle = rampAngleDegrees(ramp);
          expect(angle, `ramp ${ramp.x},${ramp.z}`).toBeGreaterThanOrEqual(
            ARENA_STANDARD.ramp.minAngle,
          );
          expect(angle, `ramp ${ramp.x},${ramp.z}`).toBeLessThanOrEqual(
            ARENA_STANDARD.ramp.maxAngle,
          );
        }
        for (const entry of buildMapReport(map).ramps) {
          expect(entry.landing, `ramp ${entry.x},${entry.z} landing`).toBe(true);
        }
      });

      it("gives each bridge real headroom", () => {
        for (const platform of map.platforms) {
          if (platform.kind !== "bridge") continue;
          expect(platform.clearance ?? 0).toBeGreaterThanOrEqual(
            ARENA_STANDARD.ramp.bridgeClearance,
          );
        }
      });

      it("keeps natural terrain drivable", () => {
        expect(maximumTerrainSlope(map)).toBeLessThanOrEqual(
          ARENA_STANDARD.terrain.maxSlope,
        );
      });

      it("keeps every route waypoint on drivable ground", () => {
        const points = map.routes.flatMap((route) => route.waypoints);
        expect(unreachablePoints(map, points, 1.5)).toEqual([]);
      });
    });
  }
});

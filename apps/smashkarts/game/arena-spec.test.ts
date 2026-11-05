import { describe, expect, it } from "vitest";
import {
  ARENA_STANDARD,
  auditMap,
  detachedRamps,
  hazardPercent,
  pickupSpacing,
  rampAngleDegrees,
  routeClearance,
  solidFootprintPercent,
  spawnSeparation,
  unreachablePickups,
  unreachablePoints,
} from "./arena-spec";
import { MAP_LIST } from "./maps";

describe("arena design standard", () => {
  for (const map of MAP_LIST) {
    describe(map.name, () => {
      it("passes the automated playability audit", () => {
        expect(auditMap(map)).toEqual([]);
      });

      it("keeps 7-10 crates with safe spacing and a drivable approach", () => {
        expect(map.pickups.length).toBeGreaterThanOrEqual(ARENA_STANDARD.pickup.min);
        expect(map.pickups.length).toBeLessThanOrEqual(ARENA_STANDARD.pickup.max);
        expect(pickupSpacing(map)).toBeGreaterThanOrEqual(
          ARENA_STANDARD.pickup.minSpacing,
        );
        expect(unreachablePickups(map)).toEqual([]);
      });

      it("offers 3-4 routes with lane-width clearance", () => {
        expect(map.routes.length).toBeGreaterThanOrEqual(ARENA_STANDARD.routes.min);
        expect(map.routes.length).toBeLessThanOrEqual(ARENA_STANDARD.routes.max);
        for (const route of map.routes) {
          const minimum =
            route.kind === "main"
              ? ARENA_STANDARD.lane.mainMin
              : ARENA_STANDARD.lane.secondaryMin;
          expect(routeClearance(map, route) * 2, route.name).toBeGreaterThanOrEqual(
            minimum,
          );
        }
      });

      it("balances cover and hazard footprint", () => {
        const footprint = solidFootprintPercent(map);
        expect(footprint).toBeGreaterThanOrEqual(
          ARENA_STANDARD.obstacleFootprint.min,
        );
        expect(footprint).toBeLessThanOrEqual(
          ARENA_STANDARD.obstacleFootprint.max,
        );
        const hazards = hazardPercent(map);
        expect(hazards).toBeGreaterThanOrEqual(ARENA_STANDARD.hazard.min);
        expect(hazards).toBeLessThanOrEqual(ARENA_STANDARD.hazard.max);
      });

      it("spawns every kart with room to leave the grid", () => {
        expect(spawnSeparation(map)).toBeGreaterThanOrEqual(
          ARENA_STANDARD.spawn.separation,
        );
        expect(unreachablePoints(map, map.spawns, 1.5)).toEqual([]);
      });

      it("connects every ramp to a deck at a climbable angle", () => {
        expect(detachedRamps(map)).toEqual([]);
        for (const ramp of map.ramps) {
          const angle = rampAngleDegrees(ramp);
          expect(angle).toBeGreaterThanOrEqual(ARENA_STANDARD.ramp.minAngle);
          expect(angle).toBeLessThanOrEqual(ARENA_STANDARD.ramp.maxAngle);
        }
      });

      it("keeps every route waypoint on drivable ground", () => {
        const points = map.routes.flatMap((route) => route.waypoints);
        expect(unreachablePoints(map, points, 1.5)).toEqual([]);
      });
    });
  }
});

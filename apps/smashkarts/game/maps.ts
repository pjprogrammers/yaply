import type { MapDef, MapId } from "./types";
import { CLASSIC_MAPS } from "./maps/classic";
import { SKY_MAPS } from "./maps/sky";
import { CYBER_MAPS } from "./maps/cyber";

/**
 * The complete maps.md catalogue: 10 classic arenas, 6 sky arenas and 6
 * cyberpunk arenas. The order is stable because lobbies and preview galleries
 * use it directly.
 */
export const MAP_LIST: MapDef[] = [...CLASSIC_MAPS, ...SKY_MAPS, ...CYBER_MAPS];

export const MAPS: Record<MapId, MapDef> = Object.fromEntries(
  MAP_LIST.map((map) => [map.id, map]),
) as Record<MapId, MapDef>;

export const DEFAULT_MAP: MapId = "quarry-clash";

export function getMap(id: MapId): MapDef {
  return Object.hasOwn(MAPS, id) ? MAPS[id] : MAPS[DEFAULT_MAP];
}

export { buildArena } from "./arena-builder";

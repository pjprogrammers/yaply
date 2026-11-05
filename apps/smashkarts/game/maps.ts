import type {
  HazardDef,
  HazardKind,
  MapDef,
  MapId,
  MapRoute,
  ObstacleDef,
  PlatformDef,
  RampDef,
} from "./types";

const box = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  h: number,
  kind: ObstacleDef["kind"],
  color?: number,
  base?: number,
  rot?: number,
): ObstacleDef => ({ x, z, hx, hz, h, kind, color, base, rot });

const platform = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  height: number,
  kind: PlatformDef["kind"],
  color?: number,
): PlatformDef => ({ x, z, hx, hz, height, kind, color });

const ramp = (
  x: number,
  z: number,
  hx: number,
  hz: number,
  height: number,
  axis: RampDef["axis"],
  dir: RampDef["dir"],
  kind: RampDef["kind"],
  color?: number,
): RampDef => ({ x, z, hx, hz, height, axis, dir, kind, color });

const hazard = (x: number, z: number, radius: number, kind: HazardKind): HazardDef => ({
  x,
  z,
  radius,
  kind,
});

const route = (
  name: string,
  kind: MapRoute["kind"],
  waypoints: Array<[number, number]>,
): MapRoute => ({ name, kind, waypoints });

const flatten = (routes: MapRoute[]): Array<[number, number]> =>
  routes.flatMap((entry) => entry.waypoints);

/**
 * A rectangular loop. Keeping the corners square makes the authored lanes easy
 * to reason about; props live on the islands between loops.
 */
const loop = (
  name: string,
  kind: MapRoute["kind"],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): MapRoute =>
  route(name, kind, [
    [maxX, maxZ],
    [maxX, minZ],
    [minX, minZ],
    [minX, maxZ],
  ]);

const crate = (x: number, z: number, base?: number, size = 2.5): ObstacleDef =>
  box(x, z, size, size, size * 2, "crate", undefined, base);

const FOUNDRY_ROUTES: MapRoute[] = [
  loop("Outer sweep", "main", -45, 45, -45, 45),
  loop("Slag ring", "main", -20, 20, -20, 20),
  loop("East slingshot", "secondary", 20, 34, -20, 20),
];

const FOUNDRY: MapDef = {
  id: "foundry",
  name: "Melt Shop",
  tagline: "Pour floor, bad ideas.",
  description:
    "A working foundry wrapped around a slag pool. Two service decks lift the fight above the floor, while stacked containers form three fast lanes around the burn.",
  size: 100,
  depth: 100,
  theme: {
    skyTop: 0x14161c,
    skyBottom: 0x4a2a19,
    fog: 0x2a201b,
    fogNear: 60,
    fogFar: 210,
    ground: 0x2c2a27,
    groundStyle: "concrete",
    sun: 0xffc38a,
    sunIntensity: 3.3,
    sunPosition: [38, 52, 24],
    hemiSky: 0x9aa4b8,
    hemiGround: 0x3a2416,
    hemiIntensity: 1.45,
    accent: 0xff6a2b,
    wallColor: 0x3a3733,
    wallHeight: 4.6,
  },
  platforms: [
    platform(0, 34, 5, 5, 2.2, "steel", 0x4b4740),
    platform(0, -34, 5, 5, 2.2, "steel", 0x4b4740),
  ],
  ramps: [
    ramp(0, 27, 4.5, 3, 2.2, "z", 1, "steel", 0x5a554c),
    ramp(0, -27, 4.5, 3, 2.2, "z", -1, "steel", 0x5a554c),
  ],
  hazards: [hazard(0, 0, 14, "lava")],
  obstacles: [
    // Container islands between the inner and outer lanes.
    box(-32, -32, 5, 5, 2.6, "concrete", 0x4b4740),
    box(32, -32, 5, 5, 2.6, "concrete", 0x4b4740),
    box(-32, 32, 5, 5, 2.6, "concrete", 0x4b4740),
    box(32, 32, 5, 5, 2.6, "concrete", 0x4b4740),
    box(-32, 0, 5, 5, 2.6, "concrete", 0x4b4740),
    box(-32, 20, 5, 5, 2.6, "concrete", 0x4b4740),
    box(-32, -20, 5, 5, 2.6, "concrete", 0x4b4740),
    box(-20, 32, 5, 5, 2.6, "concrete", 0x4b4740),
    box(20, 32, 5, 5, 2.6, "concrete", 0x4b4740),
    box(-20, -32, 5, 5, 2.6, "concrete", 0x4b4740),
    box(20, -32, 5, 5, 2.6, "concrete", 0x4b4740),

    // Deck cover.
    crate(-2.5, 34, 2.2),
    crate(2.5, 34, 2.2),
    crate(-2.5, -34, 2.2),
    crate(2.5, -34, 2.2),

    // Loot stacked on the container roofs.
    crate(-32, -32, 2.6),
    crate(32, -32, 2.6),
    crate(-32, 32, 2.6),
    crate(32, 32, 2.6),
  ],
  scenery: [
    { kind: "lamp", x: -46, z: -46 },
    { kind: "lamp", x: 46, z: -46 },
    { kind: "lamp", x: 46, z: 46 },
    { kind: "lamp", x: -46, z: 46 },
    { kind: "pipes", x: -28, z: -48 },
    { kind: "pipes", x: 28, z: -48 },
    { kind: "pipes", x: 0, z: 48, rot: Math.PI },
    { kind: "barrel", x: 16, z: 16, color: 0x8b3a1f },
    { kind: "barrel", x: 17.4, z: 15.2, color: 0x6b5a32 },
    { kind: "barrel", x: -16, z: -16, color: 0x8b3a1f },
    { kind: "stack", x: 44, z: -44 },
    { kind: "neon", x: 0, z: -54.2, y: 5.4, text: "MELT SHOP", color: 0xff5a1f },
  ],
  lights: [
    { x: 0, y: 5.2, z: 0, color: 0xff8a3d, intensity: 420, distance: 50 },
    { x: -42, y: 6, z: -42, color: 0xffb072, intensity: 160, distance: 38 },
    { x: 42, y: 6, z: 42, color: 0xffb072, intensity: 160, distance: 38 },
  ],
  boostPads: [
    { x: 20, z: 45, rot: Math.PI / 2 },
    { x: 45, z: 30, rot: 0 },
    { x: -20, z: -45, rot: Math.PI / 2 },
    { x: -45, z: -30, rot: 0 },
  ],
  spawns: [
    [12, 45],
    [42, 20],
    [45, 0],
    [42, -20],
    [-12, -45],
    [-42, -20],
    [-45, 0],
    [-42, 20],
  ],
  waypoints: flatten(FOUNDRY_ROUTES),
  routes: FOUNDRY_ROUTES,
  pickups: [
    [0, 20],
    [20, 0],
    [0, -20],
    [-20, 0],
    [30, 45],
    [45, -30],
    [-30, -45],
    [-45, 30],
    [34, 20],
  ],
};

const SCRAPYARD_ROUTES: MapRoute[] = [
  loop("Outer sweep", "main", -45, 45, -57, 57),
  loop("Sludge ring", "main", -21, 21, -21, 21),
  loop("East slingshot", "secondary", 21, 36, -21, 21),
];

const SCRAPYARD: MapDef = {
  id: "scrapyard",
  name: "Scrap Sea",
  tagline: "Everything here is already broken.",
  description:
    "A long sun-bleached yard of stacked wrecks and tire piles. A raised wreck plateau splits the arena into fast outer lanes, while a sludge pit guards the middle.",
  size: 100,
  depth: 125,
  theme: {
    skyTop: 0x4f87bd,
    skyBottom: 0xf0d3a6,
    fog: 0xd7bf9c,
    fogNear: 75,
    fogFar: 250,
    ground: 0x9a7a52,
    groundStyle: "sand",
    sun: 0xffe3bd,
    sunIntensity: 3.5,
    sunPosition: [-42, 58, 30],
    hemiSky: 0xcfe6ff,
    hemiGround: 0x8a6a45,
    hemiIntensity: 1.35,
    accent: 0xff8a2a,
    wallColor: 0x7c5a3c,
    wallHeight: 3,
  },
  platforms: [
    platform(0, 42, 5, 5, 2.4, "wreck", 0x8a6a45),
    platform(0, -42, 5, 5, 2.4, "wreck", 0x8a6a45),
  ],
  ramps: [
    ramp(0, 34.5, 4.5, 3, 2.4, "z", 1, "wreck", 0x9a7a52),
    ramp(0, -34.5, 4.5, 3, 2.4, "z", -1, "wreck", 0x9a7a52),
  ],
  hazards: [hazard(0, 0, 15, "sludge")],
  obstacles: [
    box(-32, -34, 5, 5, 2.6, "wreck", 0x9e5a3a),
    box(32, -34, 5, 5, 2.6, "wreck", 0x7a6a52),
    box(-32, 34, 5, 5, 2.6, "wreck", 0xa06a3e),
    box(32, 34, 5, 5, 2.6, "wreck", 0x6a7a52),

    box(-20, 42, 5, 5, 2.6, "wreck", 0x8a5a3a),
    box(20, 42, 5, 5, 2.6, "wreck", 0x7a5a42),
    box(-20, -42, 5, 5, 2.6, "wreck", 0x7a5a42),
    box(20, -42, 5, 5, 2.6, "wreck", 0x8a5a3a),

    box(-34, 0, 5, 5, 2.6, "wreck", 0x8a4a3a),
    box(-34, 22, 5, 5, 2.6, "wreck", 0x7a4a2e),
    box(-34, -22, 5, 5, 2.6, "wreck", 0x7a4a2e),
    box(-32, 12, 5, 5, 2.6, "wreck", 0x8a4a3a),
    box(-32, -12, 5, 5, 2.6, "wreck", 0x8a4a3a),

    crate(-2.5, 42, 2.4),
    crate(2.5, 42, 2.4),
    crate(-2.5, -42, 2.4),
    crate(2.5, -42, 2.4),
    crate(-32, -34, 2.6),
    crate(32, -34, 2.6),
    crate(-32, 34, 2.6),
    crate(32, 34, 2.6),
    crate(-20, 42, 2.6),
    crate(20, 42, 2.6),
    crate(-20, -42, 2.6),
    crate(20, -42, 2.6),
  ],
  scenery: [
    { kind: "crane", x: -48, z: -50 },
    { kind: "stack", x: 42, z: 46 },
    { kind: "stack", x: -42, z: 40, rot: 0.8 },
    { kind: "barrel", x: 16, z: -14, color: 0x6b5a32 },
    { kind: "barrel", x: 17, z: -13, color: 0x8b3a1f },
    { kind: "barrel", x: -20, z: 18, color: 0x4a5a32 },
    { kind: "barrel", x: -19, z: 19.2, color: 0x8b3a1f },
    { kind: "barrel", x: 34, z: 46, color: 0x6b5a32 },
    { kind: "barrel", x: 33, z: 47, color: 0x6b5a32 },
    { kind: "lamp", x: 46, z: -48 },
    { kind: "lamp", x: -46, z: 48 },
    { kind: "stack", x: 0, z: -52, rot: 0.4 },
    { kind: "stack", x: -16, z: -51, rot: 1.2 },
    { kind: "stack", x: 26, z: 51, rot: 0.2 },
    { kind: "stack", x: 52, z: 26, rot: 1.6 },
    { kind: "stack", x: -52, z: -30, rot: 0.9 },
    { kind: "neon", x: 0, z: -61.2, y: 5.6, text: "SCRAP KING", color: 0xffc233 },
  ],
  lights: [
    { x: 34, y: 7, z: -34, color: 0xffc48a, intensity: 160, distance: 36 },
    { x: -38, y: 7, z: 30, color: 0xffc48a, intensity: 160, distance: 36 },
    { x: 0, y: 6, z: 0, color: 0xffd7a0, intensity: 110, distance: 40 },
  ],
  boostPads: [
    { x: 20, z: 57, rot: Math.PI / 2 },
    { x: 45, z: 15, rot: 0 },
    { x: -20, z: -57, rot: Math.PI / 2 },
    { x: -45, z: 15, rot: 0 },
  ],
  spawns: [
    [12, 57],
    [44, 28],
    [45, 0],
    [44, -28],
    [-12, -57],
    [-44, -28],
    [-45, 0],
    [-44, 28],
  ],
  waypoints: flatten(SCRAPYARD_ROUTES),
  routes: SCRAPYARD_ROUTES,
  pickups: [
    [0, 21],
    [21, 0],
    [0, -21],
    [-21, 0],
    [30, 57],
    [45, 45],
    [-30, -57],
    [-45, -45],
    [36, 21],
    [-45, -20],
  ],
};

const ROOFTOP_ROUTES: MapRoute[] = [
  loop("Parapet sweep", "main", -45, 45, -45, 45),
  loop("Service ring", "main", -22, 22, -22, 22),
  loop("Northwest cut", "secondary", -34, -22, 22, 34),
];

const ROOFTOP: MapDef = {
  id: "rooftop",
  name: "Night Shift",
  tagline: "Forty storeys up. No rails.",
  description:
    "A neon-lit rooftop wrapped around a raised service deck. Four open vents drop into the dark, and stacked HVAC cover turns every lane into a close-quarters brawl.",
  size: 100,
  depth: 100,
  theme: {
    skyTop: 0x070a1a,
    skyBottom: 0x371741,
    fog: 0x171128,
    fogNear: 65,
    fogFar: 220,
    ground: 0x26262e,
    groundStyle: "asphalt",
    sun: 0xa8bfff,
    sunIntensity: 3.2,
    sunPosition: [24, 48, -30],
    hemiSky: 0x6a74a8,
    hemiGround: 0x1a1a24,
    hemiIntensity: 2.05,
    accent: 0xff3d81,
    wallColor: 0x24242b,
    wallHeight: 1.6,
  },
  platforms: [platform(0, 0, 9, 9, 2, "roof", 0x2e2e36)],
  ramps: [
    ramp(0, 12, 4.5, 3, 2, "z", -1, "roof", 0x35353e),
    ramp(0, -12, 4.5, 3, 2, "z", 1, "roof", 0x35353e),
  ],
  hazards: [
    hazard(0, 34, 7, "void"),
    hazard(0, -34, 7, "void"),
    hazard(34, 0, 7, "void"),
    hazard(-34, 0, 7, "void"),
  ],
  obstacles: [
    box(32, 32, 5, 5, 2.4, "ac"),
    box(32, -32, 5, 5, 2.4, "ac"),
    box(-32, -32, 5, 5, 2.4, "ac"),
    box(32, 12, 5, 5, 2.4, "ac"),
    box(32, -12, 5, 5, 2.4, "ac"),
    box(12, 32, 5, 5, 2.4, "ac"),
    box(12, -32, 5, 5, 2.4, "ac"),

    // Deck cover around the central brawl pit.
    crate(-5, 5, 2),
    crate(0, 5, 2),
    crate(5, 5, 2),
    crate(-5, 0, 2),
    crate(5, 0, 2),
    crate(-5, -5, 2),
    crate(0, -5, 2),
    crate(5, -5, 2),

    // Rooftop loot stacks.
    crate(32, 32, 2.4),
    crate(32, -32, 2.4),
    crate(-32, -32, 2.4),
    crate(32, 12, 2.4),
    crate(32, -12, 2.4),
    crate(12, 32, 2.4),
    crate(12, -32, 2.4),
    crate(30, 34, 2.4, 2),
    crate(34, 30, 2.4, 2),
    crate(-34, -30, 2.4, 2),
  ],
  scenery: [
    { kind: "neon", x: 0, z: -54.2, y: 4.9, text: "RIOT", color: 0xff3d81 },
    { kind: "neon", x: -54.2, z: 0, y: 4.3, rot: Math.PI / 2, text: "FUEL", color: 0x37f5e0 },
    { kind: "neon", x: 54.2, z: 0, y: 4.3, rot: -Math.PI / 2, text: "LATE", color: 0xffc233 },
    { kind: "neon", x: 0, z: 54.2, y: 4.9, rot: Math.PI, text: "NIGHT SHIFT", color: 0xff3d81 },
    { kind: "barrel", x: -12, z: -14, color: 0x4a4a52 },
    { kind: "barrel", x: -11, z: -13, color: 0x5a4a3a },
    { kind: "pipes", x: 18, z: -49.9, y: 2.4 },
    { kind: "pipes", x: -18, z: 49.9, y: 2.4, rot: Math.PI },
  ],
  lights: [
    { x: 0, y: 6, z: -40, color: 0xff3d81, intensity: 320, distance: 44 },
    { x: 38, y: 5, z: 0, color: 0x37f5e0, intensity: 240, distance: 38 },
    { x: -38, y: 5, z: 0, color: 0x37f5e0, intensity: 190, distance: 36 },
  ],
  boostPads: [
    { x: 0, z: 22, rot: 0 },
    { x: 22, z: 0, rot: Math.PI / 2 },
    { x: 0, z: -22, rot: 0 },
    { x: -22, z: 0, rot: Math.PI / 2 },
  ],
  spawns: [
    [40, 40],
    [45, 15],
    [45, -15],
    [40, -40],
    [-40, -40],
    [-45, -15],
    [-45, 15],
    [-40, 40],
  ],
  waypoints: flatten(ROOFTOP_ROUTES),
  routes: ROOFTOP_ROUTES,
  pickups: [
    [15, 15],
    [15, -15],
    [-15, -15],
    [-15, 15],
    [30, 45],
    [45, 45],
    [-30, -45],
    [-45, -45],
    [34, 22],
  ],
};

export const MAPS: Record<MapId, MapDef> = {
  foundry: FOUNDRY,
  scrapyard: SCRAPYARD,
  rooftop: ROOFTOP,
};

export const MAP_LIST: MapDef[] = [FOUNDRY, SCRAPYARD, ROOFTOP];

export const DEFAULT_MAP: MapId = "foundry";

export function getMap(id: MapId): MapDef {
  return MAPS[id];
}

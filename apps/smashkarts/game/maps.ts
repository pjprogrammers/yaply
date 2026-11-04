import type {
  MapDef,
  MapId,
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
): ObstacleDef => ({ x, z, hx, hz, h, kind, color, base });

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

const ring = (radius: number, count = 8, offset = 0): Array<[number, number]> =>
  Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + offset;
    return [Math.round(Math.cos(a) * radius), Math.round(Math.sin(a) * radius)] as [number, number];
  });

const FOUNDRY: MapDef = {
  id: "foundry",
  name: "Melt Shop",
  tagline: "Pour floor, bad ideas.",
  description:
    "A working foundry built around a raised furnace deck. Two long ramps open an elevated ring, while container lanes and outer chicanes keep the floor honest.",
  size: 100,
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
    platform(0, 0, 12, 12, 2.2, "steel", 0x4b4740),
  ],
  ramps: [
    ramp(0, 17, 4.5, 5, 2.2, "z", -1, "steel", 0x5a554c),
    ramp(0, -17, 4.5, 5, 2.2, "z", 1, "steel", 0x5a554c),
  ],
  obstacles: [
    // Furnace sits on the raised central deck.
    box(0, 0, 5, 5, 5.4, "furnace", undefined, 2.2),

    // Four heavy container blocks frame the inner ring.
    box(-28, -22, 7, 5, 4.4, "concrete", 0x4b4740),
    box(28, -22, 5, 7, 4.4, "concrete", 0x4b4740),
    box(-28, 22, 5, 7, 4.4, "concrete", 0x4b4740),
    box(28, 22, 7, 5, 4.4, "concrete", 0x4b4740),

    // Outer-ring chicanes.
    box(-14, -40, 5, 1, 2, "barrier"),
    box(14, -40, 5, 1, 2, "barrier"),
    box(-14, 40, 5, 1, 2, "barrier"),
    box(14, 40, 5, 1, 2, "barrier"),
    box(-40, 14, 1, 5, 2, "barrier"),
    box(-40, -14, 1, 5, 2, "barrier"),
    box(40, 14, 1, 5, 2, "barrier"),
    box(40, -14, 1, 5, 2, "barrier"),

    // Central cover and corner clutter.
    box(-22, 10, 2, 2, 2.6, "crate"),
    box(22, 10, 2, 2, 2.6, "crate"),
    box(-22, -10, 2, 2, 2.6, "crate"),
    box(22, -10, 2, 2, 2.6, "crate"),
    box(-42, 42, 2, 2, 2.6, "crate"),
    box(42, 42, 2, 2, 2.6, "crate"),
    box(-42, -42, 2, 2, 2.6, "crate"),
    box(42, -42, 2, 2, 2.6, "crate"),
  ],
  scenery: [
    { kind: "lamp", x: -44, z: -44 },
    { kind: "lamp", x: 44, z: -44 },
    { kind: "lamp", x: 44, z: 44 },
    { kind: "lamp", x: -44, z: 44 },
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
    { x: 0, z: 33, rot: 0 },
    { x: 33, z: 0, rot: Math.PI / 2 },
    { x: 0, z: -33, rot: 0 },
    { x: -33, z: 0, rot: Math.PI / 2 },
  ],
  spawns: [
    [0, 45],
    [34, 34],
    [45, 0],
    [34, -34],
    [0, -45],
    [-34, -34],
    [-45, 0],
    [-34, 34],
  ],
  waypoints: [
    ...ring(45),
    ...ring(33, 8, Math.PI / 8),
    ...ring(24),
    [34, 34],
    [-34, -34],
    [34, -34],
    [-34, 34],
  ],
  pickups: [
    [0, 28],
    [26, 0],
    [0, -28],
    [-26, 0],
    [10, 18],
    [-10, -18],
    [30, 40],
    [-30, -40],
    [36, -34],
    [-36, 34],
  ],
};

const SCRAPYARD: MapDef = {
  id: "scrapyard",
  name: "Scrap Sea",
  tagline: "Everything here is already broken.",
  description:
    "A sun-bleached yard of stacked wrecks and tire piles. A raised wreck plateau splits the arena into fast outer lanes and tight scrap chicanes.",
  size: 100,
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
    platform(0, 0, 11, 9, 2.4, "wreck", 0x8a6a45),
  ],
  ramps: [
    ramp(15.5, 0, 4.5, 4, 2.4, "x", -1, "wreck", 0x9a7a52),
    ramp(-15.5, 0, 4.5, 4, 2.4, "x", 1, "wreck", 0x9a7a52),
  ],
  obstacles: [
    // Raised plateau cover.
    box(0, 0, 3.5, 2.5, 2.2, "wreck", 0x9e5a3a, 2.4),
    box(-7, 4, 1.8, 1.8, 2, "crate", undefined, 2.4),
    box(7, -4, 1.8, 1.8, 2, "crate", undefined, 2.4),

    // Wreck clusters.
    box(-27, -22, 8, 4, 2.6, "wreck", 0x9e5a3a),
    box(27, -22, 4, 8, 2.6, "wreck", 0x7a6a52),
    box(-27, 22, 4, 8, 2.4, "wreck", 0xa06a3e),
    box(27, 22, 8, 4, 2.4, "wreck", 0x6a7a52),

    // Outer chicanes.
    box(-4, -38, 6, 3, 2.2, "wreck", 0x8a4a3a),
    box(4, 38, 6, 3, 2.2, "wreck", 0x8a4a3a),
    box(38, -4, 3, 6, 2.2, "wreck", 0x7a4a2e),
    box(-38, 4, 3, 6, 2.2, "wreck", 0x7a4a2e),

    // Tire piles.
    box(-22, 10, 2, 2, 2.4, "tire"),
    box(22, -10, 2, 2, 2.4, "tire"),
    box(10, 30, 2, 2, 2.4, "tire"),
    box(-10, -30, 2, 2, 2.4, "tire"),
    box(20, 12, 2, 2, 2.4, "tire"),
    box(-20, -12, 2, 2, 2.4, "tire"),

    // Barriers.
    box(-18, -40, 5, 1, 1.8, "barrier"),
    box(18, 40, 5, 1, 1.8, "barrier"),
    box(-40, 18, 1, 5, 1.8, "barrier"),
    box(40, -18, 1, 5, 1.8, "barrier"),
    box(-14, 16, 5, 1, 1.8, "barrier"),
    box(14, -16, 5, 1, 1.8, "barrier"),

    // Crates.
    box(-42, 30, 2, 2, 2.4, "crate"),
    box(42, -30, 2, 2, 2.4, "crate"),
    box(-30, -42, 2, 2, 2.4, "crate"),
    box(30, 42, 2, 2, 2.4, "crate"),
    box(0, 20, 2, 2, 2.4, "crate"),
    box(0, -20, 2, 2, 2.4, "crate"),
    box(-30, 0, 2, 2, 2.4, "crate"),
    box(30, 0, 2, 2, 2.4, "crate"),
  ],
  scenery: [
    { kind: "crane", x: -44, z: -46 },
    { kind: "stack", x: 42, z: 42 },
    { kind: "stack", x: -42, z: 38, rot: 0.8 },
    { kind: "barrel", x: 16, z: -14, color: 0x6b5a32 },
    { kind: "barrel", x: 17, z: -13, color: 0x8b3a1f },
    { kind: "barrel", x: -20, z: 18, color: 0x4a5a32 },
    { kind: "barrel", x: -19, z: 19.2, color: 0x8b3a1f },
    { kind: "barrel", x: 34, z: 36, color: 0x6b5a32 },
    { kind: "barrel", x: 33, z: 37, color: 0x6b5a32 },
    { kind: "lamp", x: 45, z: -45 },
    { kind: "lamp", x: -45, z: 45 },
    { kind: "stack", x: 0, z: -52, rot: 0.4 },
    { kind: "stack", x: -16, z: -51, rot: 1.2 },
    { kind: "stack", x: 26, z: 51, rot: 0.2 },
    { kind: "stack", x: 52, z: 26, rot: 1.6 },
    { kind: "stack", x: -52, z: -30, rot: 0.9 },
    { kind: "neon", x: 0, z: -54.2, y: 5.6, text: "SCRAP KING", color: 0xffc233 },
  ],
  lights: [
    { x: 34, y: 7, z: -34, color: 0xffc48a, intensity: 160, distance: 36 },
    { x: -38, y: 7, z: 30, color: 0xffc48a, intensity: 160, distance: 36 },
    { x: 0, y: 6, z: 0, color: 0xffd7a0, intensity: 110, distance: 40 },
  ],
  boostPads: [
    { x: 0, z: 32, rot: 0 },
    { x: 32, z: 0, rot: Math.PI / 2 },
    { x: 0, z: -32, rot: 0 },
    { x: -32, z: 0, rot: Math.PI / 2 },
  ],
  spawns: [
    [0, 45],
    [34, 34],
    [45, 0],
    [34, -34],
    [0, -45],
    [-34, -34],
    [-45, 0],
    [-34, 34],
  ],
  waypoints: [
    ...ring(46),
    ...ring(36, 8, Math.PI / 8),
    ...ring(28, 8, Math.PI / 8),
  ],
  pickups: [
    [0, 14],
    [26, 0],
    [0, -14],
    [-26, 0],
    [24, 14],
    [-24, -14],
    [36, 38],
    [-36, -38],
    [38, -34],
    [-38, 34],
  ],
};

const ROOFTOP: MapDef = {
  id: "rooftop",
  name: "Night Shift",
  tagline: "Forty storeys up. No rails.",
  description:
    "A neon-lit rooftop with two raised service decks, dense HVAC cover, and a central brawl pit. The ramps are the only way up, so watch the parapet.",
  size: 100,
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
  platforms: [
    platform(0, -28, 10, 6, 1.9, "roof", 0x2e2e36),
    platform(0, 28, 10, 6, 1.9, "roof", 0x2e2e36),
  ],
  ramps: [
    ramp(0, -18, 4, 4, 1.9, "z", -1, "roof", 0x35353e),
    ramp(0, 18, 4, 4, 1.9, "z", 1, "roof", 0x35353e),
  ],
  obstacles: [
    // Cover on the two service decks.
    box(-6, -28, 3, 2, 1.8, "ac", undefined, 1.9),
    box(6, -28, 1.8, 1.8, 1.6, "crate", undefined, 1.9),
    box(6, 28, 3, 2, 1.8, "ac", undefined, 1.9),
    box(-6, 28, 1.8, 1.8, 1.6, "crate", undefined, 1.9),

    // Main HVAC clusters.
    box(-24, -16, 4, 3, 1.8, "ac"),
    box(24, -16, 3, 4, 1.8, "ac"),
    box(-24, 16, 3, 4, 1.8, "ac"),
    box(24, 16, 4, 3, 1.8, "ac"),

    // Outer rooftop units.
    box(-38, -36, 3, 4, 1.6, "ac"),
    box(38, 36, 3, 4, 1.6, "ac"),
    box(-38, 36, 4, 3, 1.6, "ac"),
    box(38, -36, 4, 3, 1.6, "ac"),
    box(-20, -30, 4, 2.5, 1.8, "ac"),
    box(20, 30, 4, 2.5, 1.8, "ac"),

    // Central brawl-pit cover.
    box(-10, -6, 5, 1, 2.2, "concrete", 0x2e2e34),
    box(10, 6, 5, 1, 2.2, "concrete", 0x2e2e34),
    box(-14, 6, 1, 5, 2.2, "concrete", 0x2e2e34),
    box(14, -6, 1, 5, 2.2, "concrete", 0x2e2e34),
    box(-30, 0, 1, 6, 2.2, "concrete", 0x2e2e34),
    box(30, 0, 1, 6, 2.2, "concrete", 0x2e2e34),

    // Planters and pillars.
    box(-18, 0, 3, 1, 1.2, "planter"),
    box(18, 0, 3, 1, 1.2, "planter"),
    box(0, -10, 3, 1, 1.2, "planter"),
    box(0, 10, 3, 1, 1.2, "planter"),
    box(-40, -10, 2, 2, 2.8, "pillar"),
    box(40, 10, 2, 2, 2.8, "pillar"),
    box(-10, 40, 2, 2, 2.8, "pillar"),
    box(10, -40, 2, 2, 2.8, "pillar"),

    // Outer barriers and crates.
    box(-14, -40, 5, 1, 2.2, "concrete", 0x2e2e34),
    box(14, 40, 5, 1, 2.2, "concrete", 0x2e2e34),
    box(-40, 14, 1, 5, 2.2, "concrete", 0x2e2e34),
    box(40, -14, 1, 5, 2.2, "concrete", 0x2e2e34),
    box(-20, 36, 2, 2, 2.4, "crate"),
    box(20, -36, 2, 2, 2.4, "crate"),
    box(-28, 40, 2, 2, 2.4, "crate"),
    box(28, -40, 2, 2, 2.4, "crate"),
    box(-8, 0, 2, 2, 2.4, "crate"),
    box(8, 0, 2, 2, 2.4, "crate"),
    box(0, -6, 2, 2, 2.4, "crate"),
    box(0, 6, 2, 2, 2.4, "crate"),
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
    { x: 8, z: 14, rot: 0 },
    { x: -8, z: -14, rot: 0 },
    { x: 12, z: 0, rot: Math.PI / 2 },
    { x: -12, z: 0, rot: Math.PI / 2 },
  ],
  spawns: [
    [0, 45],
    [30, 30],
    [45, 0],
    [30, -30],
    [0, -45],
    [-30, -30],
    [-45, 0],
    [-30, 30],
  ],
  waypoints: [
    ...ring(47, 8, Math.PI / 8),
    ...ring(36, 8, Math.PI / 8),
    ...ring(20, 8, Math.PI / 8),
    [6, 12],
    [-6, -12],
  ],
  pickups: [
    [0, 0],
    [24, 0],
    [-24, 0],
    [12, 16],
    [-12, -16],
    [38, 22],
    [-38, -22],
    [26, 42],
    [-26, -42],
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

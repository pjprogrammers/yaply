import type { ObstacleKind, WeaponId, WeaponSpec } from "./types";

export const KART_COLORS = [
  { name: "Signal", hex: "#ff5a1f" },
  { name: "Toxic", hex: "#a8e10c" },
  { name: "Cyanide", hex: "#2fd4c8" },
  { name: "Bone", hex: "#f2ecdd" },
  { name: "Magenta", hex: "#e83f8b" },
  { name: "Cobalt", hex: "#3f76f0" },
  { name: "Rust", hex: "#a8442a" },
  { name: "Violet", hex: "#8b5cf6" },
] as const;

export const BOT_NAMES = [
  "Rivet",
  "Mox",
  "Crank",
  "Vex",
  "Sable",
  "Nova",
  "Grit",
  "Wrench",
  "Juno",
  "Ash",
  "Pike",
  "Tess",
] as const;

export const BOT_COLORS = [
  "#8b5cf6",
  "#2fd4c8",
  "#e83f8b",
  "#ffc233",
  "#3f76f0",
  "#a8e10c",
  "#f2ecdd",
] as const;

export const KART = {
  /** maps.md reference chassis: 3.2 long, 2.0 wide, 1.5 tall. */
  width: 2.0,
  length: 3.2,
  height: 1.5,
  wheelbase: 2.0,
  wheelRadius: 0.4,
  groundClearance: 0.25,
  mass: 180,
  centreOfMass: 0.65,
  /** Collision radius. Slightly larger than half the width so karts never
   * visually overlap during a side impact. */
  radius: 1.2,
  /** A rise above this is a wall, not a drivable step. Kept above the
   * per-frame climb of a boosted kart on a 25-degree ramp at 60 Hz. */
  stepHeight: 0.62,
  maxSpeed: 23,
  boostSpeed: 33,
  accel: 30,
  brake: 42,
  reverseMax: 9,
  drag: 0.62,
  grip: 9.2,
  driftGrip: 2.1,
  steer: 2.5,
  hp: 100,
  respawn: 3,
  spawnProtection: 2,
  boostDuration: 2.2,
  driftMin: 0.75,
  driftMax: 2.4,
} as const;

/**
 * Obstacle classification from the arena design standard. Solid objects block
 * karts; projectile blocking is separate so low cover can stop a kart without
 * stopping every shot. Ramps and hazards are modelled as their own surfaces.
 */
export const OBSTACLE_RULES: Record<
  ObstacleKind,
  { solid: boolean; climbable: boolean; blocksProjectiles: boolean }
> = {
  crate: { solid: true, climbable: false, blocksProjectiles: true },
  concrete: { solid: true, climbable: false, blocksProjectiles: true },
  pillar: { solid: true, climbable: false, blocksProjectiles: true },
  tire: { solid: true, climbable: false, blocksProjectiles: true },
  ac: { solid: true, climbable: false, blocksProjectiles: true },
  wreck: { solid: true, climbable: false, blocksProjectiles: true },
  barrier: { solid: true, climbable: false, blocksProjectiles: true },
  furnace: { solid: true, climbable: false, blocksProjectiles: true },
  // Waist-high planters stop karts but shots clear the foliage.
  planter: { solid: true, climbable: false, blocksProjectiles: false },
  rock: { solid: true, climbable: false, blocksProjectiles: true },
  container: { solid: true, climbable: false, blocksProjectiles: true },
  bumper: { solid: true, climbable: false, blocksProjectiles: true },
  log: { solid: true, climbable: true, blocksProjectiles: false },
  crystal: { solid: true, climbable: false, blocksProjectiles: true },
};

/**
 * The full Smash Karts arsenal. Every crate rolls one of these eleven weapons;
 * there is no fallback cannon, so an empty slot really is empty.
 */
export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  machinegun: {
    id: "machinegun",
    name: "Machine Gun",
    tagline: "Rapid fire that tracks nearby karts. Damage falls off with range.",
    ammo: 80,
    cooldown: 0.08,
    color: 0xffc233,
    css: "#ffc233",
    rarity: "Common",
    ammoLabel: "80 rounds · ~6.5s",
    hold: true,
  },
  bullets: {
    id: "bullets",
    name: "Bullets",
    tagline: "Three-round bursts of straight, fast rounds. Aim it yourself.",
    ammo: 27,
    cooldown: 0.075,
    color: 0xf2ecdd,
    css: "#f2ecdd",
    rarity: "Common",
    ammoLabel: "27 rounds",
    hold: true,
  },
  rockets: {
    id: "rockets",
    name: "Rockets",
    tagline: "Three forward rockets with a small blast on impact.",
    ammo: 3,
    cooldown: 0.55,
    color: 0xff5a1f,
    css: "#ff5a1f",
    rarity: "Common",
    ammoLabel: "3 rockets",
    hold: false,
  },
  cannonballs: {
    id: "cannonballs",
    name: "Cannon Balls",
    tagline: "Heavy arcing shots that punish anything in a crowded lane.",
    ammo: 6,
    cooldown: 0.4,
    color: 0xff9a3c,
    css: "#ff9a3c",
    rarity: "Common",
    ammoLabel: "6 shots",
    hold: false,
  },
  nuke: {
    id: "nuke",
    name: "Nuke",
    tagline: "One launch. One very large blast radius. Clear the room.",
    ammo: 1,
    cooldown: 1,
    color: 0xa8e10c,
    css: "#a8e10c",
    rarity: "Uncommon",
    ammoLabel: "1 nuke",
    hold: false,
  },
  grenuke: {
    id: "grenuke",
    name: "Lob-Grenuke",
    tagline: "Lobbed explosive that lands, waits, then controls the area.",
    ammo: 2,
    cooldown: 0.8,
    color: 0x7bd94a,
    css: "#7bd94a",
    rarity: "Uncommon",
    ammoLabel: "2 lobs",
    hold: false,
  },
  snowball: {
    id: "snowball",
    name: "Snowball Launcher",
    tagline: "Freezes a kart in its tracks and leaves it wide open.",
    ammo: 6,
    cooldown: 0.35,
    color: 0x7dd3fc,
    css: "#7dd3fc",
    rarity: "Uncommon",
    ammoLabel: "6 snowballs",
    hold: false,
  },
  mines: {
    id: "mines",
    name: "Mines",
    tagline: "Drop three proximity traps behind the kart. Keep driving.",
    ammo: 3,
    cooldown: 0.6,
    color: 0xe83f8b,
    css: "#e83f8b",
    rarity: "Rare",
    ammoLabel: "3 mines",
    hold: false,
  },
  spikey: {
    id: "spikey",
    name: "Spikey-Go-Round",
    tagline: "Six seconds of orbiting spiked balls. Contact hurts.",
    ammo: 1,
    cooldown: 1,
    color: 0x8b5cf6,
    css: "#8b5cf6",
    rarity: "Rare",
    ammoLabel: "6s spin",
    hold: false,
  },
  invincibility: {
    id: "invincibility",
    name: "Invincibility",
    tagline: "Five seconds of stars. Incoming damage stops. Contact kills.",
    ammo: 1,
    cooldown: 1,
    color: 0xffd166,
    css: "#ffd166",
    rarity: "Very rare",
    ammoLabel: "5s stars",
    hold: false,
  },
  fakebox: {
    id: "fakebox",
    name: "Fake Lootbox",
    tagline: "A perfect copy of a mystery crate. It explodes on contact.",
    ammo: 1,
    cooldown: 1,
    color: 0xf2a900,
    css: "#f2a900",
    rarity: "Very rare",
    ammoLabel: "1 decoy",
    hold: false,
  },
};

const WEAPON_WEIGHTS: Array<[WeaponId, number]> = [
  ["machinegun", 16],
  ["bullets", 16],
  ["rockets", 14],
  ["cannonballs", 14],
  ["nuke", 7],
  ["grenuke", 8],
  ["snowball", 8],
  ["mines", 6],
  ["spikey", 5],
  ["invincibility", 3],
  ["fakebox", 3],
];

/** A weighted bag: common weapons show up far more often than stars. */
export const PICKUP_POOL: WeaponId[] = WEAPON_WEIGHTS.flatMap(([id, count]) =>
  Array<WeaponId>(count).fill(id),
);

export const MATCH_DEFAULTS = {
  botCount: 5,
  killTarget: 20,
  duration: 300,
  bots: 5,
} as const;

export const MAX_BOTS = 7;

export const ARENA_RULES = [
  "Mystery crates hide one of eleven weapons. The contents stay secret until you touch the crate.",
  "Machine Gun tracks nearby karts. Every other weapon needs your own aim.",
  "Tap the weapon circle or press Space to fire. Hold it for rapid-fire weapons.",
  "Hard turns charge a mini-turbo automatically. Straighten out to spend it.",
  "Ramps open the high ground. Boost pads launch you and re-arm after a short cooldown.",
] as const;

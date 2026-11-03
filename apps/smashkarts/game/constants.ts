import type { WeaponId, WeaponSpec } from "./types";

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
  radius: 1.45,
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

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  pulse: {
    id: "pulse",
    name: "Pulse",
    tagline: "Twin-linked plinker. Never runs dry.",
    ammo: 0,
    cooldown: 0.26,
    color: 0xffc233,
    css: "#ffc233",
  },
  missile: {
    id: "missile",
    name: "Seeker",
    tagline: "Locks on. Does not forgive.",
    ammo: 3,
    cooldown: 0.62,
    color: 0xff5a1f,
    css: "#ff5a1f",
  },
  mine: {
    id: "mine",
    name: "Caltrop",
    tagline: "Drop one. Keep driving.",
    ammo: 2,
    cooldown: 0.85,
    color: 0xe83f8b,
    css: "#e83f8b",
  },
  shield: {
    id: "shield",
    name: "Bulwark",
    tagline: "Seven seconds of not caring.",
    ammo: 1,
    cooldown: 1,
    color: 0x2fd4c8,
    css: "#2fd4c8",
  },
  turbo: {
    id: "turbo",
    name: "Overdrive",
    tagline: "Short fuse. Long skid.",
    ammo: 1,
    cooldown: 1,
    color: 0xa8e10c,
    css: "#a8e10c",
  },
  shock: {
    id: "shock",
    name: "Arc Storm",
    tagline: "Everything nearby regrets it.",
    ammo: 1,
    cooldown: 1.1,
    color: 0x8b5cf6,
    css: "#8b5cf6",
  },
};

export const PICKUP_POOL: WeaponId[] = [
  "missile",
  "missile",
  "missile",
  "mine",
  "mine",
  "shield",
  "shield",
  "turbo",
  "turbo",
  "shock",
];

export const MATCH_DEFAULTS = {
  botCount: 5,
  killTarget: 20,
  duration: 300,
  bots: 5,
} as const;

export const MAX_BOTS = 7;

export const ARENA_RULES = [
  "Your pulse cannon never runs dry — hold fire and keep the pressure on.",
  "Grab glowing crates for heavier hardware. Ammo runs out, the pulse does not.",
  "Hard turns charge a mini-turbo automatically. Straighten out to spend it.",
  "Shields eat everything. Caltrops do not care about your shield's feelings.",
] as const;

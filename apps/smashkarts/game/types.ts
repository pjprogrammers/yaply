export type MapId = "foundry" | "scrapyard" | "rooftop";

export type WeaponId = "pulse" | "missile" | "mine" | "shield" | "turbo" | "shock";

export type ObstacleKind =
  | "crate"
  | "concrete"
  | "pillar"
  | "tire"
  | "ac"
  | "wreck"
  | "barrier"
  | "furnace"
  | "planter";

export type SceneryKind =
  | "lamp"
  | "crane"
  | "neon"
  | "tower"
  | "pipes"
  | "barrel"
  | "fan"
  | "stack"
  | "skyline";

export interface ObstacleDef {
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
  kind: ObstacleKind;
  color?: number;
}

export interface SceneryDef {
  kind: SceneryKind;
  x: number;
  z: number;
  y?: number;
  rot?: number;
  color?: number;
  text?: string;
}

export interface LightDef {
  x: number;
  y: number;
  z: number;
  color: number;
  intensity: number;
  distance: number;
}

export interface BoostPadDef {
  x: number;
  z: number;
  rot: number;
}

export interface MapTheme {
  skyTop: number;
  skyBottom: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  ground: number;
  groundStyle: "concrete" | "sand" | "asphalt";
  sun: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  accent: number;
  wallColor: number;
  wallHeight: number;
}

export interface MapDef {
  id: MapId;
  name: string;
  tagline: string;
  description: string;
  size: number;
  theme: MapTheme;
  obstacles: ObstacleDef[];
  scenery: SceneryDef[];
  lights: LightDef[];
  boostPads: BoostPadDef[];
  spawns: Array<[number, number]>;
  waypoints: Array<[number, number]>;
  pickups: Array<[number, number]>;
}

export interface GameOptions {
  mapId: MapId;
  playerName: string;
  color: string;
  botCount: number;
  killTarget: number;
  duration: number;
}

export interface VehicleInput {
  throttle: number;
  steer: number;
  drift: boolean;
  fire: boolean;
}

export interface KartSnapshot {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  x: number;
  z: number;
  yaw: number;
  hp: number;
  shield: number;
  boost: number;
  slow: number;
  weapon: WeaponId;
  ammo: number;
  kills: number;
  deaths: number;
  alive: boolean;
  respawnIn: number;
  speed: number;
  drifting: boolean;
  driftCharge: number;
  locked: boolean;
}

export interface PickupSnapshot {
  id: number;
  x: number;
  z: number;
  weapon: WeaponId;
  active: boolean;
}

export interface FeedEntry {
  id: number;
  killer: string;
  victim: string;
  weapon: WeaponId;
  self: boolean;
}

export interface GameSnapshot {
  phase: "booting" | "playing" | "paused" | "over";
  mapId: MapId;
  playerId: string | null;
  karts: KartSnapshot[];
  pickups: PickupSnapshot[];
  timeLeft: number;
  killTarget: number;
  winner: { id: string; name: string; color: string; kills: number } | null;
  feed: FeedEntry[];
  muted: boolean;
  aimTargetId: string | null;
  matchSeconds: number;
  shots: number;
  hits: number;
  fps: number;
}

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  tagline: string;
  ammo: number;
  cooldown: number;
  color: number;
  css: string;
}

export interface BotBrain {
  targetId: string | null;
  retargetIn: number;
  fireIn: number;
  jitter: number;
  waypoint: number;
  wander: boolean;
  skill: number;
}

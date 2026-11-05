import type { SmashInput, SmashMatchSnapshot, SmashWeaponId } from "@yaply/shared/types";

export type MapId = "foundry" | "scrapyard" | "rooftop";

export type WeaponId = SmashWeaponId;
export type WeaponSlot = WeaponId | "none";
export type ProjectileKind =
  | "tracer"
  | "bullet"
  | "rocket"
  | "cannonball"
  | "nuke"
  | "grenuke"
  | "snowball";

export type EngineMode = "local" | "online-host" | "online-guest";

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
  /** Vertical offset for props stacked on a platform. */
  base?: number;
  /** Heading of the box's local +X axis in the X/Z plane. */
  rot?: number;
}

export type HazardKind = "lava" | "sludge" | "void";

export interface HazardDef {
  x: number;
  z: number;
  kind: HazardKind;
  /** Circle radius. When set, hx/hz are ignored. */
  radius?: number;
  /** Rectangular half-extents, used when radius is absent. */
  hx?: number;
  hz?: number;
  /** Vertical offset for hazards placed on a raised surface. */
  base?: number;
}

export interface MapRoute {
  name: string;
  kind: "main" | "secondary";
  waypoints: Array<[number, number]>;
}

export type PlatformKind = "steel" | "wreck" | "roof";

export interface PlatformDef {
  x: number;
  z: number;
  hx: number;
  hz: number;
  height: number;
  kind: PlatformKind;
  color?: number;
}

export interface RampDef {
  x: number;
  z: number;
  hx: number;
  hz: number;
  height: number;
  /** Axis the ramp climbs along. */
  axis: "x" | "z";
  /** +1 rises toward the positive axis, -1 toward the negative axis. */
  dir: 1 | -1;
  kind: PlatformKind;
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
  /** Arena width along X. */
  size: number;
  /** Arena depth along Z. Square arenas reuse `size`. */
  depth: number;
  theme: MapTheme;
  obstacles: ObstacleDef[];
  platforms: PlatformDef[];
  ramps: RampDef[];
  hazards: HazardDef[];
  scenery: SceneryDef[];
  lights: LightDef[];
  boostPads: BoostPadDef[];
  spawns: Array<[number, number]>;
  /** Flattened route points used as a fallback for simple AI paths. */
  waypoints: Array<[number, number]>;
  routes: MapRoute[];
  pickups: Array<[number, number]>;
}

export interface OnlinePlayer {
  id: string;
  name: string;
  color: string;
  connected: boolean;
}

export interface GameOptions {
  mapId: MapId;
  playerName: string;
  color: string;
  botCount: number;
  killTarget: number;
  duration: number;
  /** Local bot matches by default; online matches pick a replication role. */
  mode?: EngineMode;
  /** The local player's room id when online. */
  localPlayerId?: string;
  /** Room roster used to build the online grid. */
  roster?: OnlinePlayer[];
  /** Current room round, used to reject stale snapshots after a rematch. */
  round?: number;
  /** Host-migration state copied into a freshly promoted host engine. */
  seedSnapshot?: SmashMatchSnapshot | null;
  /** Guest-to-host controls, sent at roughly 20 Hz. */
  onInput?: (input: SmashInput) => void;
  /** Host-to-room match snapshots, sent at roughly 10 Hz. */
  onSnapshot?: (snapshot: SmashMatchSnapshot) => void;
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
  y: number;
  z: number;
  yaw: number;
  hp: number;
  shield: number;
  boost: number;
  slow: number;
  spike: number;
  weapon: WeaponSlot;
  ammo: number;
  kills: number;
  deaths: number;
  alive: boolean;
  respawnIn: number;
  speed: number;
  drifting: boolean;
  driftCharge: number;
}

export interface PickupSnapshot {
  id: number;
  x: number;
  z: number;
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
  rarity: "Common" | "Uncommon" | "Rare" | "Very rare";
  ammoLabel: string;
  /** Hold-to-fire weapons keep shooting while the trigger is down. */
  hold: boolean;
}

export interface BotBrain {
  targetId: string | null;
  retargetIn: number;
  fireIn: number;
  jitter: number;
  waypoint: number;
  route: number;
  routePoint: number;
  wander: boolean;
  skill: number;
}

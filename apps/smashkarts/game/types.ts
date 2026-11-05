import type { SmashInput, SmashMatchSnapshot, SmashWeaponId } from "@yaply/shared/types";

/**
 * The 22 production arenas from the maps.md blueprint. IDs are stable because
 * they are the only map data synchronised over the wire: every client rebuilds
 * the exact same collision geometry from the same deterministic definition.
 */
export type MapId =
  | "quarry-clash"
  | "hollow-graveyard"
  | "ironkeep-fort"
  | "magma-crossing"
  | "drift-island"
  | "velocity-park"
  | "frost-circuit"
  | "orbital-arena"
  | "apex-speedway"
  | "glacier-slide"
  | "skyfall"
  | "pinball-core"
  | "sky-showdown"
  | "celestial-temples"
  | "sky-tunnels"
  | "cloudbreak"
  | "neon-district"
  | "circuit-underground"
  | "reactor-core"
  | "hyperlane-2099"
  | "holo-arena"
  | "chrome-port";

export type ArenaClass = "compact" | "standard" | "large" | "racing" | "vertical" | "sky";

export type SurfaceKind =
  | "asphalt"
  | "concrete"
  | "dirt"
  | "sand"
  | "snow"
  | "ice"
  | "metal"
  | "wet"
  | "futuristic";

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

/**
 * Collision categories from maps.md. Solid and climbable objects block karts;
 * decorative objects never do, even when their visual mesh is large.
 */
export type ObstacleCategory = "solid" | "climbable" | "decorative";

export type ObstacleKind =
  | "crate"
  | "concrete"
  | "pillar"
  | "tire"
  | "ac"
  | "wreck"
  | "barrier"
  | "furnace"
  | "planter"
  | "rock"
  | "container"
  | "bumper"
  | "log"
  | "crystal";

export type SceneryKind =
  | "lamp"
  | "crane"
  | "neon"
  | "tower"
  | "pipes"
  | "barrel"
  | "fan"
  | "stack"
  | "skyline"
  | "headstone"
  | "pine"
  | "palm"
  | "snowman"
  | "torii"
  | "flag"
  | "hologram"
  | "antenna"
  | "tunnelCeiling"
  | "reactor";

/** Deterministic ambient particle scheme from maps.md section 16. */
export type WeatherKind = "rain" | "snow" | "ash" | "sparks";

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
  /**
   * Explicit gameplay classification. When omitted it derives from the kind.
   * `decorative` objects are excluded from kart and projectile collision.
   */
  category?: ObstacleCategory;
  /** Climbs allowed for `climbable` objects; stored in degrees. */
  climbDegrees?: number;
  /** Surface the object presents when driven over. */
  surface?: SurfaceKind;
}

export type HazardKind = "lava" | "sludge" | "void" | "water";

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
  /** Closed loops wrap from the last waypoint back to the first. */
  closed: boolean;
}

export type PlatformKind = "steel" | "wreck" | "roof" | "bridge" | "temple" | "hologram";

export interface PlatformDef {
  x: number;
  z: number;
  hx: number;
  hz: number;
  height: number;
  kind: PlatformKind;
  color?: number;
  /** Heading of the deck's local +X axis in the X/Z plane. */
  rot?: number;
  /** Driving surface of the deck. */
  surface?: SurfaceKind;
  /**
   * Underside height. Bridges have clearance below them, so a kart can drive
   * through the gap instead of being blocked by an invisible column.
   */
  clearance?: number;
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
  /** Vertical profile. `quarter` is the classic skate-park transition. */
  profile?: "linear" | "smooth" | "quarter";
  surface?: SurfaceKind;
}

export interface SceneryDef {
  kind: SceneryKind;
  x: number;
  z: number;
  y?: number;
  rot?: number;
  color?: number;
  text?: string;
  /** Structural scenery (tunnel shells) spans these half-extents. */
  hx?: number;
  hz?: number;
  /** Structural height, measured from `y`. */
  height?: number;
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
  groundStyle: "concrete" | "sand" | "asphalt" | "snow" | "metal" | "grass";
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

/** A smooth elevation feature. Heights come from a Gaussian or plateau. */
export interface TerrainFeature {
  kind: "mound" | "depression" | "plateau";
  x: number;
  z: number;
  /** Signed peak height. Negative values sink the terrain. */
  height: number;
  /** Horizontal spread along X and Z. */
  radiusX: number;
  radiusZ: number;
  /** Fraction of the radius that stays flat (plateaus only). */
  flat?: number;
  /** Heading of the elliptical footprint. */
  rot?: number;
  surface?: SurfaceKind;
}

export interface TerrainDef {
  features: TerrainFeature[];
  /** Low-amplitude deterministic undulation, in units. */
  undulation?: number;
  /** Dominant surface where no feature or road overrides it. */
  surface: SurfaceKind;
  /** Deterministic phase for undulation. */
  seed?: number;
}

export interface RoadDef {
  name: string;
  kind: "main" | "secondary" | "connector";
  /**
   * Catmull-Rom control points. A third component is an explicit elevation;
   * omitted elevations follow the terrain beneath the centreline.
   */
  points: Array<[number, number] | [number, number, number]>;
  width: number;
  surface: SurfaceKind;
  closed?: boolean;
  /** Signed cross-slope, radians. Positive banks the left edge upward. */
  banking?: number;
  /** Height above the sampled terrain. */
  lift?: number;
}

export interface ArenaTargets {
  footprintMin: number;
  footprintMax: number;
  hazardMin: number;
  hazardMax: number;
  openCombatMin: number;
}

export interface MapDef {
  id: MapId;
  name: string;
  tagline: string;
  description: string;
  arenaClass: ArenaClass;
  /** Arena width along X. */
  size: number;
  /** Arena depth along Z. Square arenas reuse `size`. */
  depth: number;
  /** Optional preview image. Defaults fall back to a themed CSS preview. */
  preview?: string;
  /**
   * Multiplier applied to tyre grip. Slick arenas use a lower value so the
   * kart keeps lateral momentum through a corner.
   */
  grip?: number;
  /** Deterministic seed used for the map's procedural details. */
  seed: number;
  /** Ambient weather; purely visual and never affects collision. */
  weather?: WeatherKind;
  theme: MapTheme;
  terrain: TerrainDef;
  roads: RoadDef[];
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
  targets: ArenaTargets;
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
  /** Match time in seconds when the kill happened. */
  at?: number;
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

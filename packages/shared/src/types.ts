export type PlayerId = string;
export type RoomCode = string;
export type GameKind = "skribbl" | "chain" | "smashkarts";

/**
 * Word pools supported by the Skribbl dictionary. `tl` is Tagalog/Filipino,
 * `ja` is Japanese and `ko` is Korean.
 */
export type WordLanguage = "en" | "tl" | "ja" | "ko";

export type ChainBoardSize = "small" | "medium" | "large" | "xxl";
export type ChainPaletteId = "classic" | "vivid" | "pastel" | "neon" | "mono" | "custom";
export type ChainTheme = "dark" | "light" | "neon";
export type ChainGridStyle = "2d" | "3d";
export type CpuDifficulty = "easy" | "medium" | "hard";

export type SmashMapId = "foundry" | "scrapyard" | "rooftop";
export type SmashWeaponId = "pulse" | "missile" | "mine" | "shield" | "turbo" | "shock";

export type GamePhase =
  | "lobby"
  | "choosing"
  | "drawing"
  | "round-result"
  | "playing"
  | "game-over";

export type Player = {
  id: PlayerId;
  nickname: string;
  avatar: string;
  color: string;
  score: number;
  connected: boolean;
  guessedCorrectly: boolean;
  joinedAt: number;
};

export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  id: string;
  playerId: PlayerId;
  color: string;
  width: number;
  points: Point[];
};

export type GameSettings = {
  maxPlayers: number;
  rounds: number;
  drawingTimeSeconds: number;
  language: WordLanguage;
  allowLateJoin: boolean;
  wordCount?: number;
  turnTimeSeconds?: number;
  /** Desired seats for a local game. Online rooms use it as the capacity. */
  playerCount?: number;
  boardSize?: ChainBoardSize;
  palette?: ChainPaletteId;
  customColors?: string[];
  theme?: ChainTheme;
  gridStyle?: ChainGridStyle;
  confirmMoves?: boolean;
  vsCpu?: boolean;
  cpuDifficulty?: CpuDifficulty;
  /** Smash Karts arena selected by the host. */
  mapId?: SmashMapId;
  /** Smash Karts wreck target. */
  killTarget?: number;
  /** Smash Karts match clock in seconds. */
  durationSeconds?: number;
};

export type ChainCell = {
  ownerId: PlayerId | null;
  orbs: number;
};

export type ChainExplosion = {
  row: number;
  col: number;
  ownerId: PlayerId;
};

export type ChainMove = {
  playerId: PlayerId;
  row: number;
  col: number;
  explosions: ChainExplosion[];
  captured: number;
  orbsPlaced: number;
};

export type ChainState = {
  rows: number;
  cols: number;
  cells: ChainCell[];
  turnPlayerId: PlayerId | null;
  eliminatedPlayerIds: PlayerId[];
  winnerId: PlayerId | null;
  lastMove: ChainMove | null;
  turnEndsAt: number | null;
  moveCount: number;
};

export type Ranking = {
  playerId: PlayerId;
  nickname: string;
  score: number;
};

/** Controls a Smash Karts guest sends to the authoritative host. */
export type SmashInput = {
  throttle: number;
  steer: number;
  drift: boolean;
  fire: boolean;
};

export type SmashKartSnapshot = {
  id: PlayerId;
  name: string;
  color: string;
  x: number;
  z: number;
  yaw: number;
  hp: number;
  shield: number;
  boost: number;
  slow: number;
  weapon: SmashWeaponId;
  ammo: number;
  kills: number;
  deaths: number;
  shots: number;
  hits: number;
  alive: boolean;
  respawnIn: number;
  speed: number;
  drifting: boolean;
  driftCharge: number;
};

export type SmashPickupSnapshot = {
  id: number;
  active: boolean;
};

export type SmashProjectileSnapshot = {
  id: number;
  kind: "bolt" | "missile";
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type SmashMineSnapshot = {
  id: number;
  x: number;
  z: number;
};

export type SmashFeedEntry = {
  id: number;
  killer: string;
  victim: string;
  weapon: SmashWeaponId;
  self: boolean;
};

export type SmashWinner = {
  id: PlayerId;
  name: string;
  color: string;
  kills: number;
};

/**
 * Authoritative Smash Karts match state broadcast by the host. Guests render
 * this directly, which keeps the Worker free of the Three.js simulation.
 */
export type SmashMatchSnapshot = {
  phase: "playing" | "over";
  round: number;
  mapId: SmashMapId;
  timeLeft: number;
  killTarget: number;
  matchSeconds: number;
  karts: SmashKartSnapshot[];
  pickups: SmashPickupSnapshot[];
  projectiles: SmashProjectileSnapshot[];
  mines: SmashMineSnapshot[];
  feed: SmashFeedEntry[];
  winner: SmashWinner | null;
};

export type RoomSnapshot = {
  code: RoomCode;
  game: GameKind;
  phase: GamePhase;
  hostId: PlayerId;
  players: Player[];
  settings: GameSettings;
  roundNumber: number;
  drawerId: PlayerId | null;
  maskedWord: string | null;
  endsAt: number | null;
  strokes: Stroke[];
  chain: ChainState | null;
  rankings?: Ranking[];
  winnerId?: PlayerId | null;
  version: number;
};

export type PlayerId = string;
export type RoomCode = string;
export type GameKind = "skribbl" | "chain" | "smashkarts" | "holeio" | "whos-the-spy";

/**
 * Word pools supported by the Skribbl dictionary. `tl` is Tagalog/Filipino,
 * `ja` is Japanese and `ko` is Korean.
 */
export type WordLanguage = "en" | "tl" | "ja" | "ko";

/** Skribbl room presentation controls, chosen by the host. */
export type SkribblMode = "light" | "dark";
export type SkribblTheme = "paper" | "classic";

export type ChainBoardSize = "small" | "medium" | "large" | "xxl";
export type ChainPaletteId = "classic" | "vivid" | "pastel" | "neon" | "mono" | "custom";
export type ChainTheme = "dark" | "light" | "neon";
export type ChainGridStyle = "2d" | "3d";
export type CpuDifficulty = "easy" | "medium" | "hard";

export type SmashMapId =
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
export type SmashWeaponId =
  | "machinegun"
  | "bullets"
  | "rockets"
  | "cannonballs"
  | "nuke"
  | "grenuke"
  | "snowball"
  | "mines"
  | "spikey"
  | "invincibility"
  | "fakebox";
export type SmashWeaponSlot = SmashWeaponId | "none";
export type SmashProjectileKind =
  | "tracer"
  | "bullet"
  | "rocket"
  | "cannonball"
  | "nuke"
  | "grenuke"
  | "snowball";

export type GamePhase =
  | "lobby"
  | "choosing"
  | "drawing"
  | "round-result"
  | "playing"
  | "game-over"
  | "role-reveal"
  | "clue"
  | "discussion"
  | "voting"
  | "revote"
  | "elimination"
  | "final-guess"
  | "results";

/** The two secret teams in Who's the Spy. */
export type SpyRole = "civilian" | "spy";
export type SpyTeam = "civilians" | "spies";
export type SpyDifficulty = "easy" | "normal" | "hard";
export type SpyClueFormat = "voice" | "text" | "both";
export type SpyResultReason =
  | "all-spies-eliminated"
  | "spies-reached-parity"
  | "final-guess-correct"
  | "final-guess-wrong"
  | "final-guess-timeout";

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

/**
 * WebRTC signaling payloads relayed by the room. Audio never travels over the
 * WebSocket; the server only forwards offers, answers and ICE candidates
 * between the two peers.
 */
export type VoiceSignal =
  | { type: "offer" | "answer"; sdp: string }
  | {
      type: "candidate";
      candidate: string;
      sdpMid?: string | null;
      sdpMLineIndex?: number | null;
      usernameFragment?: string | null;
    };

/** Ephemeral voice-room membership and microphone state for one player. */
export type VoiceParticipant = {
  playerId: PlayerId;
  micMuted: boolean;
  speaking: boolean;
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
  /** Light or dark surface treatment for a Skribbl room. */
  skribblMode?: SkribblMode;
  /** Paper is the Yaply look; Classic mirrors the layout.html skribbl theme. */
  skribblTheme?: SkribblTheme;
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
  /** Hole.io bots used to fill empty seats in an online room (0–7). */
  botCount?: number;
  /** Who's the Spy: requested spies. 0 means automatic for the player count. */
  spyCount?: number;
  /** Selected word-bank categories. An empty list means Mixed. */
  spyCategories?: string[];
  spyDifficulty?: SpyDifficulty;
  /** Seconds each active speaker has to submit a clue. */
  spyClueSeconds?: number;
  spyDiscussionSeconds?: number;
  spyVotingSeconds?: number;
  spyFinalGuess?: boolean;
  spyRoleReveal?: boolean;
  spyTextChat?: boolean;
  spyVoiceChat?: boolean;
  /** Let eliminated players talk in a separate spectator-only channel. */
  spySpectatorChat?: boolean;
  spyClueFormat?: SpyClueFormat;
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
  /**
   * Monotonic client sequence. The host drops duplicate or out-of-order
   * packets. Optional so older clients remain compatible during rollout.
   */
  seq?: number;
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
  y: number;
  z: number;
  yaw: number;
  hp: number;
  shield: number;
  boost: number;
  slow: number;
  spike: number;
  weapon: SmashWeaponSlot;
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
  kind: SmashProjectileKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type SmashTrapSnapshot = {
  id: number;
  kind: "mine" | "fake";
  x: number;
  y: number;
  z: number;
};

export type SmashFeedEntry = {
  id: number;
  killer: string;
  victim: string;
  weapon: SmashWeaponId;
  self: boolean;
  /** Match time in seconds; optional for older hosts. */
  at?: number;
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
  traps: SmashTrapSnapshot[];
  feed: SmashFeedEntry[];
  winner: SmashWinner | null;
};

/** Direction a Hole.io guest sends to the authoritative host. */
export type HoleioInput = {
  /** Monotonic client sequence. The host drops stale packets. */
  seq?: number;
  /** World-space X direction, -1..1. */
  x: number;
  /** World-space Z direction, -1..1. */
  z: number;
};

export type HoleioHoleSnapshot = {
  id: PlayerId;
  name: string;
  color: string;
  x: number;
  z: number;
  radius: number;
  score: number;
  alive: boolean;
  respawnIn: number;
  eaten: number;
  /** Rival holes swallowed this match. */
  eatenHoles?: number;
  /** Id of the hole that swallowed this one, when it is currently down. */
  eatenBy?: PlayerId | null;
};

export type HoleioFeedEntry = {
  id: number;
  text: string;
  tone: "player" | "rival" | "danger" | "info";
  /** Seconds this line should stay on screen from the moment it is received. */
  ttl: number;
};

export type HoleioWinner = {
  id: PlayerId;
  name: string;
  color: string;
  score: number;
};

/**
 * Authoritative Hole.io match state relayed by the host. `city` is a base64
 * bitset over the deterministic city object list, so guests can hide exactly
 * the props the host has swallowed without relaying hundreds of ids.
 */
export type HoleioMatchSnapshot = {
  phase: "countdown" | "playing" | "over";
  round: number;
  timeLeft: number;
  countdown: number;
  holes: HoleioHoleSnapshot[];
  feed: HoleioFeedEntry[];
  winner: HoleioWinner | null;
  city?: string;
};

/** A clue that has been made public for the current Spy round. */
export type SpyClue = {
  playerId: PlayerId;
  text: string;
  round: number;
  createdAt: number;
};

export type SpyElimination = {
  playerId: PlayerId;
  round: number;
  tied: boolean;
  viaRevote: boolean;
  /** Null before the result screen when role reveal is disabled. */
  role: SpyRole | null;
};

export type SpyVoteRecord = {
  voterId: PlayerId;
  targetId: PlayerId;
  round: number;
  revote: boolean;
};

/**
 * Public Who's the Spy state. Secrets (assignments and both words) are not
 * present here; the server sends them only through private events or after the
 * result screen has been reached.
 */
export type SpyPublicState = {
  round: number;
  /** The number of spies in this match, never who they are. */
  spyCount: number;
  activePlayerIds: PlayerId[];
  turnOrder: PlayerId[];
  activeSpeakerId: PlayerId | null;
  clues: SpyClue[];
  readyPlayerIds: PlayerId[];
  votesCast: number;
  eligibleVoters: number;
  tiedPlayerIds: PlayerId[];
  lastElimination: SpyElimination | null;
  finalGuessPlayerId: PlayerId | null;
  finalGuessResult: { playerId: PlayerId; correct: boolean } | null;
  winnerTeam: SpyTeam | null;
  resultReason: SpyResultReason | null;
  categoryId: string | null;
  categoryLabel: string | null;
  civilianWord: string | null;
  spyWord: string | null;
  /** Populated only on the result screen. */
  roles: Record<PlayerId, SpyRole> | null;
  votes: SpyVoteRecord[] | null;
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
  spy: SpyPublicState | null;
  rankings?: Ranking[];
  winnerId?: PlayerId | null;
  version: number;
};

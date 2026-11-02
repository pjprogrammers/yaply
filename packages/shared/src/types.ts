export type PlayerId = string;
export type RoomCode = string;
export type GameKind = "skribbl" | "chain";

export type ChainBoardSize = "small" | "medium" | "large" | "xxl";
export type ChainPaletteId = "classic" | "vivid" | "pastel" | "neon" | "mono" | "custom";
export type ChainTheme = "dark" | "light" | "neon";
export type ChainGridStyle = "2d" | "3d";
export type CpuDifficulty = "easy" | "medium" | "hard";

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
  language: "en";
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

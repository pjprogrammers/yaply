export type PlayerId = string;
export type RoomCode = string;

export type GamePhase =
  | "lobby"
  | "choosing"
  | "drawing"
  | "round-result"
  | "game-over";

export type Player = {
  id: PlayerId;
  nickname: string;
  avatar: string;
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
};

export type RoomSnapshot = {
  code: RoomCode;
  phase: GamePhase;
  hostId: PlayerId;
  players: Player[];
  settings: GameSettings;
  roundNumber: number;
  drawerId: PlayerId | null;
  maskedWord: string | null;
  endsAt: number | null;
  strokes: Stroke[];
  version: number;
};

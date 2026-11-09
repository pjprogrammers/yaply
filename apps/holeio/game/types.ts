export type Phase =
  | "boot"
  | "menu"
  | "countdown"
  | "playing"
  | "paused"
  | "finished";

export type EngineRole = "local" | "online-host" | "online-guest";

export interface OnlinePlayer {
  id: string;
  name: string;
  color: string;
  connected: boolean;
}

export type ObjectKind =
  | "person"
  | "prop"
  | "tree"
  | "car"
  | "bus"
  | "kiosk"
  | "building"
  | "statue"
  | "fountain";

export interface HoleSnapshot {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  x: number;
  z: number;
  radius: number;
  score: number;
  rank: number;
  alive: boolean;
  respawnIn: number;
  eaten: number;
}

export interface FeedItem {
  id: number;
  text: string;
  tone: "player" | "rival" | "danger" | "info";
}

export interface GameSnapshot {
  phase: Phase;
  timeLeft: number;
  countdown: number;
  holes: HoleSnapshot[];
  playerScore: number;
  playerRank: number;
  playerRadius: number;
  playerAlive: boolean;
  playerEaten: number;
  botsEaten: number;
  bestScore: number;
  winnerName: string | null;
  swallowedBy: string | null;
  feed: FeedItem[];
  muted: boolean;
  matchSeconds: number;
  fps: number;
  tierLabel: string;
  tierProgress: number;
  totalRivals: number;
}

export interface MatchResult {
  rank: number;
  score: number;
  eaten: number;
  botsEaten: number;
  swallowedBy: string | null;
  winnerName: string;
  playerAlive: boolean;
}

export interface HoleTuning {
  startRadius: number;
  maxRadius: number;
  startSpeed: number;
}

import type {
  ChainBoardSize,
  ChainGridStyle,
  ChainPaletteId,
  ChainTheme,
  CpuDifficulty,
  GameSettings,
} from "./types";

export const PROTOCOL_VERSION = 1;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawingTimeSeconds: 80,
  language: "en",
  allowLateJoin: true,
  wordCount: 3,
  turnTimeSeconds: 45,
  playerCount: 4,
  boardSize: "medium",
  palette: "classic",
  customColors: [],
  theme: "dark",
  gridStyle: "3d",
  confirmMoves: false,
  vsCpu: false,
  cpuDifficulty: "medium",
};

export const ROOM_CODE_LENGTH = 6;
/**
 * Ambiguous characters (0/o, 1/l/i) are deliberately excluded so a room code
 * can be read out loud or copied from a screen without mistakes.
 */
export const ROOM_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const ROOM_CODE_PATTERN = /^[a-z0-9]{6}$/;

export const MAX_NICKNAME_LENGTH = 16;
export const MAX_CHAT_LENGTH = 200;
export const MAX_STROKES_PER_ROUND = 500;
export const MAX_POINTS_PER_STROKE = 1000;
/**
 * Total points stored across every stroke in one round. This bounds both the
 * Durable Object value size and the snapshot payload regardless of how many
 * strokes a drawer creates.
 */
export const MAX_STROKE_POINTS_PER_ROUND = 20_000;
export const MAX_STROKE_POINTS_PER_MESSAGE = 128;
export const MAX_STROKE_ID_LENGTH = 64;
export const DRAWING_BATCH_INTERVAL_MS = 40;
export const RECONNECT_GRACE_PERIOD_MS = 30000;
export const ROOM_INACTIVITY_EXPIRY_MS = 600000;
export const EMPTY_ROOM_TTL_MS = 60000;
/**
 * A room code allocated by `POST /rooms` is reserved for this long before the
 * first player connects. It is released automatically so abandoned create
 * attempts do not permanently burn codes.
 */
export const ROOM_RESERVATION_TTL_MS = 2 * 60_000;

/** Hard cap on a single WebSocket frame. Larger frames are dropped unparsed. */
export const MAX_MESSAGE_BYTES = 16 * 1024;
/** Per-socket token bucket used for every client message. */
export const MESSAGE_RATE_LIMIT = {
  capacity: 60,
  refillPerSecond: 30,
};
/** How many invalid frames a socket may send before it is closed. */
export const MAX_INVALID_MESSAGES = 20;
/** Unauthenticated sockets are closed after this long. */
export const UNJOINED_SOCKET_TTL_MS = 30000;
/** Hard cap on sockets (joined or not) attached to one room. */
export const MAX_SOCKETS_PER_ROOM = 32;
/**
 * Best-effort cap on sockets from one client (IP) in one room. This blunts
 * attempts to multiply the per-socket rate limit by opening many connections,
 * while still allowing a group behind one NAT/router to fill a default room.
 * The Worker also rate limits upgrades per client; Cloudflare's account-wide
 * limits remain the final backstop.
 */
export const MAX_SOCKETS_PER_CLIENT_PER_ROOM = 8;

export const CHAIN_ROWS = 6;
export const CHAIN_COLS = 9;
export const CHAIN_MAX_MOVES = 400;
export const CHAIN_MAX_EXPLOSIONS = 4000;

export const PLAYER_COLORS = [
  "#4cb3f0",
  "#f2b33d",
  "#e5484d",
  "#c6f24e",
  "#e6e6e6",
  "#d97757",
  "#7dd3c7",
  "#f28ab2",
];

export type ChainBoardPreset = {
  rows: number;
  cols: number;
  label: string;
};

/**
 * Board presets keep every client and the authoritative Worker in agreement.
 * `xxl` is the widest board the 3D renderer and mobile layout are tuned for.
 */
export const CHAIN_BOARD_PRESETS: Record<ChainBoardSize, ChainBoardPreset> = {
  small: { rows: 5, cols: 7, label: "Small" },
  medium: { rows: 6, cols: 9, label: "Medium" },
  large: { rows: 8, cols: 12, label: "Large" },
  xxl: { rows: 10, cols: 14, label: "XXL (14)" },
};

export const CHAIN_BOARD_SIZE_IDS = Object.keys(CHAIN_BOARD_PRESETS) as ChainBoardSize[];

export function isChainBoardSize(value: unknown): value is ChainBoardSize {
  return typeof value === "string" && value in CHAIN_BOARD_PRESETS;
}

export function chainBoardDimensions(size: ChainBoardSize | string | undefined): ChainBoardPreset {
  return isChainBoardSize(size) ? CHAIN_BOARD_PRESETS[size] : CHAIN_BOARD_PRESETS.medium;
}

export type ChainPalette = {
  id: ChainPaletteId;
  name: string;
  colors: string[];
};

export const CHAIN_PALETTES: ChainPalette[] = [
  { id: "classic", name: "Classic", colors: PLAYER_COLORS },
  {
    id: "vivid",
    name: "Vivid",
    colors: ["#ff4d6d", "#3ddc97", "#4dabf7", "#ffd43b", "#b197fc", "#ff922b", "#63e6be", "#f783ac"],
  },
  {
    id: "pastel",
    name: "Pastel",
    colors: ["#8ecae6", "#ffb703", "#fb8500", "#90be6d", "#cdb4db", "#ffafcc", "#a8dadc", "#bde0fe"],
  },
  {
    id: "neon",
    name: "Neon",
    colors: ["#39ff14", "#ff10f0", "#00e5ff", "#ffe600", "#ff3131", "#9d00ff", "#00ffb3", "#ff8a00"],
  },
  {
    id: "mono",
    name: "Mono",
    colors: ["#ffffff", "#d4d4d4", "#a3a3a3", "#737373", "#f5e6c8", "#c8d8f5", "#f5c8d8", "#c8f5d8"],
  },
];

export const CHAIN_PALETTE_IDS = [
  ...CHAIN_PALETTES.map((palette) => palette.id),
  "custom" as const,
];

export function isChainPaletteId(value: unknown): value is ChainPaletteId {
  return typeof value === "string" && CHAIN_PALETTE_IDS.includes(value as ChainPaletteId);
}

export type ChainThemeOption = { id: ChainTheme; label: string; hint: string };
export const CHAIN_THEMES: ChainThemeOption[] = [
  { id: "dark", label: "Classic (Dark)", hint: "Black table, crisp white type" },
  { id: "light", label: "Classic (Light)", hint: "Warm paper, ink type" },
  { id: "neon", label: "Neon", hint: "Deep space with electric accents" },
];

export type ChainGridOption = { id: ChainGridStyle; label: string; hint: string };
export const CHAIN_GRID_STYLES: ChainGridOption[] = [
  { id: "2d", label: "2D", hint: "Flat, fast and familiar" },
  { id: "3d", label: "3D", hint: "Perspective table with spherical orbs" },
];

export type CpuDifficultyOption = { id: CpuDifficulty; label: string; hint: string };
export const CPU_DIFFICULTIES: CpuDifficultyOption[] = [
  { id: "easy", label: "Easy", hint: "Plays legal moves, rarely plans ahead" },
  { id: "medium", label: "Medium", hint: "Chases captures and builds pressure" },
  { id: "hard", label: "Hard", hint: "Searches replies and avoids traps" },
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function sanitizeHexColor(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOR.test(value) ? value.toLowerCase() : null;
}

/**
 * Returns eight distinct colours, padding a short custom list from the classic
 * palette. This is what prevents two players from sharing the same orb colour.
 */
export function resolveChainPalette(
  palette: ChainPaletteId | string | undefined,
  customColors?: string[],
): string[] {
  const preset = CHAIN_PALETTES.find((entry) => entry.id === palette);
  const source = preset ? preset.colors : customColors ?? [];
  const unique: string[] = [];
  for (const candidate of source) {
    const color = sanitizeHexColor(candidate);
    if (color && !unique.includes(color)) unique.push(color);
  }
  for (const fallback of PLAYER_COLORS) {
    if (unique.length >= 8) break;
    if (!unique.includes(fallback)) unique.push(fallback);
  }
  return unique.slice(0, 8);
}

export function sanitizeCustomColors(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return resolveChainPalette("custom", values).slice(0, 8);
}

export const DEFAULT_CHAIN_SETTINGS = {
  playerCount: 4,
  boardSize: "medium" as ChainBoardSize,
  palette: "classic" as ChainPaletteId,
  customColors: [] as string[],
  theme: "dark" as ChainTheme,
  gridStyle: "3d" as ChainGridStyle,
  confirmMoves: false,
  vsCpu: false,
  cpuDifficulty: "medium" as CpuDifficulty,
  turnTimeSeconds: 45,
};

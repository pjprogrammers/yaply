import type {
  ChainBoardSize,
  ChainGridStyle,
  ChainPaletteId,
  ChainTheme,
  CpuDifficulty,
  GameSettings,
  SmashMapId,
  SmashWeaponId,
  SpyClueFormat,
  SpyDifficulty,
  WordLanguage,
} from "./types";

export const PROTOCOL_VERSION = 1;

/**
 * Word pools a Skribbl room can draw from. The label is the English name, the
 * native label is what the picker shows to players.
 */
export const WORD_LANGUAGES: ReadonlyArray<{
  id: WordLanguage;
  label: string;
  nativeLabel: string;
}> = [
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "tl", label: "Filipino", nativeLabel: "Filipino" },
  { id: "ja", label: "Japanese", nativeLabel: "日本語" },
  { id: "ko", label: "Korean", nativeLabel: "한국어" },
];

export const WORD_LANGUAGE_IDS = WORD_LANGUAGES.map((language) => language.id);

export function isWordLanguage(value: unknown): value is WordLanguage {
  return typeof value === "string" && WORD_LANGUAGE_IDS.includes(value as WordLanguage);
}

/** Skribbl's seat ceiling, including public rooms the owner has expanded. */
export const SKRIBBL_MAX_PLAYERS = 12;
/** Public Play rooms start at eight seats and the owner may raise them to 12. */
export const SKRIBBL_DEFAULT_MAX_PLAYERS = 8;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxPlayers: SKRIBBL_DEFAULT_MAX_PLAYERS,
  rounds: 3,
  drawingTimeSeconds: 80,
  language: "en",
  allowLateJoin: true,
  wordCount: 3,
  turnTimeSeconds: 45,
  skribblMode: "light",
  skribblTheme: "paper",
  visibility: "private",
  playerCount: 4,
  boardSize: "medium",
  palette: "classic",
  customColors: [],
  theme: "dark",
  gridStyle: "3d",
  confirmMoves: false,
  vsCpu: false,
  cpuDifficulty: "medium",
  mapId: "quarry-clash",
  killTarget: 20,
  durationSeconds: 300,
  botCount: 0,
  spyCount: 0,
  spyCategories: ["mixed"],
  spyDifficulty: "normal",
  spyClueSeconds: 45,
  spyDiscussionSeconds: 45,
  spyVotingSeconds: 30,
  spyFinalGuess: true,
  spyRoleReveal: true,
  spyTextChat: true,
  spyVoiceChat: true,
  spySpectatorChat: false,
  spyClueFormat: "both",
};

export const SMASH_MIN_PLAYERS = 2;
export const SMASH_MAX_PLAYERS = 40;
export const SMASH_KILL_TARGET_MIN = 5;
export const SMASH_KILL_TARGET_MAX = 100;
export const SMASH_DURATION_MIN_SECONDS = 60;
export const SMASH_DURATION_MAX_SECONDS = 1800;
export const HOLEIO_MAX_PLAYERS = 8;
export const HOLEIO_BOT_MAX = 7;
export const HOLEIO_MATCH_SECONDS = 120;
/** Seat paints match the eight procedural hole colours in the game client. */
export const HOLEIO_PLAYER_COLORS = [
  "#d8ff5c",
  "#ff6f61",
  "#63c7ff",
  "#ff5bb0",
  "#ffc247",
  "#7dffb2",
  "#b28cff",
  "#ff9447",
];
/* ------------------------------------------------------------------------- */
/* Who's the Spy                                                             */
/* ------------------------------------------------------------------------- */

export const SPY_MIN_PLAYERS = 3;
export const SPY_MAX_PLAYERS = 12;
export const SPY_DEFAULT_PLAYERS = 6;
export const SPY_MAX_SPIES = 3;
/** Seat colours for up to twelve players; amber and violet lead the palette. */
export const SPY_PLAYER_COLORS = [
  "#f2b33d",
  "#b28cff",
  "#63c7ff",
  "#ff7a90",
  "#7dffb2",
  "#ff9447",
  "#f472b6",
  "#a3e635",
  "#facc15",
  "#38bdf8",
  "#c084fc",
  "#f97316",
];

export type SpyCategoryOption = {
  id: string;
  label: string;
  hint: string;
};

/**
 * The twenty curated word-bank categories. `mixed` is both a real pool and a
 * shorthand for "draw from every category"; the server treats it as the union
 * so selecting it never narrows the game down to one small list.
 */
export const SPY_CATEGORIES: SpyCategoryOption[] = [
  { id: "food-drinks", label: "Food & Drinks", hint: "Recipes, restaurants and what is in the fridge" },
  { id: "animals", label: "Animals", hint: "Pets, wildlife and everything with fur or scales" },
  { id: "countries-cities", label: "Countries & Cities", hint: "Places on the map and the people in them" },
  { id: "places-buildings", label: "Places & Buildings", hint: "Rooms, landmarks and the places in between" },
  { id: "technology", label: "Technology", hint: "Devices, software and the internet" },
  { id: "sports", label: "Sports", hint: "Fields, rules and last-minute winners" },
  { id: "movies-entertainment", label: "Movies & Entertainment", hint: "Screens, stages and stories" },
  { id: "professions", label: "Professions", hint: "Jobs, uniforms and what people actually do" },
  { id: "school-education", label: "School & Education", hint: "Classrooms, subjects and study rituals" },
  { id: "household-items", label: "Household Items", hint: "Things found in drawers, cupboards and corners" },
  { id: "vehicles-transport", label: "Vehicles & Transport", hint: "Wheels, rails, wings and traffic" },
  { id: "nature", label: "Nature", hint: "Weather, landscapes and the living world" },
  { id: "clothing-fashion", label: "Clothing & Fashion", hint: "Wardrobes, styles and getting dressed" },
  { id: "famous-people", label: "Famous People", hint: "Public figures and the names everyone knows" },
  { id: "brands", label: "Brands", hint: "Logos, slogans and shopping aisles" },
  { id: "games", label: "Games", hint: "Boards, cards, controllers and playground rules" },
  { id: "everyday-life", label: "Everyday Life", hint: "Small routines that make up a day" },
  { id: "music", label: "Music", hint: "Instruments, genres and songs stuck in your head" },
  { id: "internet-social-media", label: "Internet & Social Media", hint: "Feeds, memes and online habits" },
  { id: "mixed", label: "Mixed / Random", hint: "A surprise draw from every category" },
];

export const SPY_CATEGORY_IDS = SPY_CATEGORIES.map((category) => category.id);

export function isSpyCategoryId(value: unknown): value is string {
  return typeof value === "string" && SPY_CATEGORY_IDS.includes(value);
}

export type SpyDifficultyOption = {
  id: SpyDifficulty;
  label: string;
  hint: string;
};

export const SPY_DIFFICULTIES: SpyDifficultyOption[] = [
  { id: "easy", label: "Easy", hint: "The two words are clearly different" },
  { id: "normal", label: "Normal", hint: "Close enough to bluff, far enough to catch" },
  { id: "hard", label: "Hard", hint: "Tiny distinctions and very confident spies" },
];

export const SPY_DIFFICULTY_IDS = SPY_DIFFICULTIES.map((difficulty) => difficulty.id);

export function isSpyDifficulty(value: unknown): value is SpyDifficulty {
  return typeof value === "string" && SPY_DIFFICULTY_IDS.includes(value as SpyDifficulty);
}

export type SpyClueFormatOption = {
  id: SpyClueFormat;
  label: string;
  hint: string;
};

export const SPY_CLUE_FORMATS: SpyClueFormatOption[] = [
  { id: "both", label: "Voice + text", hint: "Talk out loud or type a clue" },
  { id: "text", label: "Text only", hint: "Every clue is written in the room" },
  { id: "voice", label: "Voice first", hint: "Speak naturally; text chat stays open" },
];

export const SPY_CLUE_FORMAT_IDS = SPY_CLUE_FORMATS.map((format) => format.id);

export function isSpyClueFormat(value: unknown): value is SpyClueFormat {
  return typeof value === "string" && SPY_CLUE_FORMAT_IDS.includes(value as SpyClueFormat);
}

/** Automatic spy count from the recommended table (3–8 → 1, 9–12 → 2). */
export function autoSpyCount(playerCount: number): number {
  return playerCount >= 9 ? 2 : 1;
}

/** The largest spy team that still leaves civilians with a strict majority. */
export function maxSpyCount(playerCount: number): number {
  return Math.max(1, Math.min(SPY_MAX_SPIES, Math.floor((Math.max(1, playerCount) - 1) / 2)));
}

export const SPY_CLUE_SECONDS = { min: 30, max: 90, default: 45 } as const;
export const SPY_DISCUSSION_SECONDS = { min: 30, max: 120, default: 45 } as const;
export const SPY_VOTING_SECONDS = { min: 15, max: 45, default: 30 } as const;
export const SPY_REVOTE_SECONDS = 15;
export const SPY_ROLE_REVEAL_MS = 25_000;
export const SPY_ELIMINATION_MS = 6_000;
export const SPY_FINAL_GUESS_SECONDS = 30;
export const MAX_SPY_CLUE_LENGTH = 80;
export const MAX_SPY_FINAL_GUESS_LENGTH = 48;
export const SPY_RECENT_PAIR_LIMIT = 18;

export const SMASH_MAP_IDS: SmashMapId[] = [
  "quarry-clash",
  "hollow-graveyard",
  "ironkeep-fort",
  "magma-crossing",
  "drift-island",
  "velocity-park",
  "frost-circuit",
  "orbital-arena",
  "apex-speedway",
  "glacier-slide",
  "skyfall",
  "pinball-core",
  "sky-showdown",
  "celestial-temples",
  "sky-tunnels",
  "cloudbreak",
  "neon-district",
  "circuit-underground",
  "reactor-core",
  "hyperlane-2099",
  "holo-arena",
  "chrome-port",
];
export const SMASH_WEAPON_IDS: SmashWeaponId[] = [
  "machinegun",
  "bullets",
  "rockets",
  "cannonballs",
  "nuke",
  "grenuke",
  "snowball",
  "mines",
  "spikey",
  "invincibility",
  "fakebox",
];

export function isSmashMapId(value: unknown): value is SmashMapId {
  return typeof value === "string" && SMASH_MAP_IDS.includes(value as SmashMapId);
}

export function isSmashWeaponId(value: unknown): value is SmashWeaponId {
  return typeof value === "string" && SMASH_WEAPON_IDS.includes(value as SmashWeaponId);
}

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
/**
 * Smash Karts snapshots carry up to 40 karts plus transient projectiles, so
 * they get a larger frame budget without loosening the limits for other games.
 */
export const MAX_SMASH_MESSAGE_BYTES = 48 * 1024;
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
 * Smash Karts rooms allow 40 players. Keep extra headroom for a short overlap
 * while dropped tabs reconnect and release their old sockets.
 */
export const MAX_SMASH_SOCKETS_PER_ROOM = 80;
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

/**
 * Smash Karts supports up to 40 seats, so its grid uses its own longer palette
 * instead of repeating the eight Skribbl/Chain seat colours.
 */
export const SMASH_PLAYER_COLORS = [
  "#ff5a1f",
  "#a8e10c",
  "#2fd4c8",
  "#f2ecdd",
  "#e83f8b",
  "#3f76f0",
  "#ffc233",
  "#8b5cf6",
  "#f25c54",
  "#4ade80",
  "#38bdf8",
  "#facc15",
  "#fb7185",
  "#c084fc",
  "#34d399",
  "#f97316",
  "#22d3ee",
  "#e879f9",
  "#84cc16",
  "#f43f5e",
  "#60a5fa",
  "#fbbf24",
  "#a3e635",
  "#2dd4bf",
  "#f472b6",
  "#818cf8",
  "#fcd34d",
  "#a7f3d0",
  "#fca5a5",
  "#93c5fd",
  "#d9f99d",
  "#67e8f9",
  "#fda4af",
  "#c4b5fd",
  "#86efac",
  "#fde68a",
  "#99f6e4",
  "#f0abfc",
  "#fdba74",
  "#bfdbfe",
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
  small: { rows: 9, cols: 5, label: "Small" },
  medium: { rows: 11, cols: 6, label: "Medium" },
  large: { rows: 15, cols: 8, label: "Large" },
  xxl: { rows: 18, cols: 10, label: "XXL (10)" },
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

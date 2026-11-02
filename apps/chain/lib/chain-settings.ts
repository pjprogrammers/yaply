import {
  DEFAULT_CHAIN_SETTINGS,
  DEFAULT_GAME_SETTINGS,
  isChainBoardSize,
  isChainPaletteId,
  resolveChainPalette,
  sanitizeCustomColors,
} from "@yaply/shared/constants";
import type {
  ChainBoardSize,
  ChainGridStyle,
  ChainPaletteId,
  ChainTheme,
  CpuDifficulty,
  GameSettings,
} from "@yaply/shared/types";

export type LocalChainConfig = {
  nickname: string;
  playerCount: number;
  boardSize: ChainBoardSize;
  palette: ChainPaletteId;
  customColors: string[];
  theme: ChainTheme;
  gridStyle: ChainGridStyle;
  confirmMoves: boolean;
  vsCpu: boolean;
  cpuDifficulty: CpuDifficulty;
  turnTimeSeconds: number;
};

export const LOCAL_SETTINGS_KEY = "yaply:chain:settings";

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function themeOf(value: unknown): ChainTheme {
  return value === "light" || value === "neon" ? value : "dark";
}

function gridOf(value: unknown): ChainGridStyle {
  return value === "2d" ? "2d" : "3d";
}

function difficultyOf(value: unknown): CpuDifficulty {
  return value === "easy" || value === "hard" ? value : "medium";
}

export function defaultLocalConfig(nickname = ""): LocalChainConfig {
  return {
    nickname,
    playerCount: DEFAULT_CHAIN_SETTINGS.playerCount,
    boardSize: DEFAULT_CHAIN_SETTINGS.boardSize,
    palette: DEFAULT_CHAIN_SETTINGS.palette,
    customColors: [...DEFAULT_CHAIN_SETTINGS.customColors],
    theme: DEFAULT_CHAIN_SETTINGS.theme,
    gridStyle: DEFAULT_CHAIN_SETTINGS.gridStyle,
    confirmMoves: DEFAULT_CHAIN_SETTINGS.confirmMoves,
    vsCpu: DEFAULT_CHAIN_SETTINGS.vsCpu,
    cpuDifficulty: DEFAULT_CHAIN_SETTINGS.cpuDifficulty,
    turnTimeSeconds: DEFAULT_CHAIN_SETTINGS.turnTimeSeconds,
  };
}

export function normalizeLocalConfig(input: unknown, nickname = ""): LocalChainConfig {
  const fallback = defaultLocalConfig(nickname);
  if (!input || typeof input !== "object") return fallback;
  const value = input as Partial<LocalChainConfig>;
  const palette = isChainPaletteId(value.palette) ? value.palette : fallback.palette;
  const customColors = sanitizeCustomColors(value.customColors);
  return {
    nickname: typeof value.nickname === "string" ? value.nickname : nickname,
    playerCount: clampInt(value.playerCount, fallback.playerCount, 2, 8),
    boardSize: isChainBoardSize(value.boardSize) ? value.boardSize : fallback.boardSize,
    palette,
    customColors,
    theme: themeOf(value.theme),
    gridStyle: gridOf(value.gridStyle),
    confirmMoves: bool(value.confirmMoves),
    vsCpu: bool(value.vsCpu),
    cpuDifficulty: difficultyOf(value.cpuDifficulty),
    turnTimeSeconds: clampInt(value.turnTimeSeconds, fallback.turnTimeSeconds, 15, 120),
  };
}

export function readLocalConfig(nickname = ""): LocalChainConfig {
  if (typeof window === "undefined") return defaultLocalConfig(nickname);
  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return defaultLocalConfig(nickname);
    return normalizeLocalConfig(JSON.parse(raw), nickname);
  } catch {
    return defaultLocalConfig(nickname);
  }
}

export function writeLocalConfig(config: LocalChainConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(config));
  } catch {
    // Storage is optional; the game still works for this session.
  }
}

export function localConfigToSettings(config: LocalChainConfig): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    maxPlayers: config.playerCount,
    playerCount: config.playerCount,
    turnTimeSeconds: config.turnTimeSeconds,
    boardSize: config.boardSize,
    palette: config.palette,
    customColors: config.palette === "custom" ? config.customColors : [],
    theme: config.theme,
    gridStyle: config.gridStyle,
    confirmMoves: config.confirmMoves,
    vsCpu: config.vsCpu,
    cpuDifficulty: config.cpuDifficulty,
  };
}

export function paletteForSettings(settings: Pick<GameSettings, "palette" | "customColors">): string[] {
  return resolveChainPalette(settings.palette, settings.customColors);
}

function parseColors(value: string | null): string[] {
  if (!value) return [];
  return sanitizeCustomColors(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => (entry.startsWith("#") ? entry : `#${entry}`)),
  );
}

export function settingsFromSearchParams(params: URLSearchParams): GameSettings {
  const paletteValue = params.get("palette");
  const palette: ChainPaletteId = isChainPaletteId(paletteValue) ? paletteValue : "classic";
  const boardValue = params.get("board");
  const maxPlayers = clampInt(params.get("max"), 4, 2, 8);
  return {
    ...DEFAULT_GAME_SETTINGS,
    maxPlayers,
    playerCount: clampInt(params.get("player"), maxPlayers, 2, 8),
    turnTimeSeconds: clampInt(params.get("turn"), 45, 15, 120),
    boardSize: isChainBoardSize(boardValue) ? boardValue : "medium",
    palette,
    customColors: palette === "custom" ? parseColors(params.get("colors")) : [],
    theme: themeOf(params.get("theme")),
    gridStyle: gridOf(params.get("grid")),
    confirmMoves: params.get("confirm") === "1",
    vsCpu: params.get("cpu") === "1",
    cpuDifficulty: difficultyOf(params.get("difficulty")),
  };
}

export function settingsToSearchParams(
  settings: Partial<GameSettings>,
  extra: Record<string, string> = {},
): URLSearchParams {
  const palette = isChainPaletteId(settings.palette) ? settings.palette : "classic";
  const params = new URLSearchParams({
    max: String(clampInt(settings.maxPlayers ?? settings.playerCount, 4, 2, 8)),
    player: String(clampInt(settings.playerCount ?? settings.maxPlayers, 4, 2, 8)),
    turn: String(clampInt(settings.turnTimeSeconds, 45, 15, 120)),
    board: isChainBoardSize(settings.boardSize) ? settings.boardSize : "medium",
    palette,
    theme: themeOf(settings.theme),
    grid: gridOf(settings.gridStyle),
  });
  if (settings.confirmMoves) params.set("confirm", "1");
  if (settings.vsCpu) params.set("cpu", "1");
  if (settings.cpuDifficulty) params.set("difficulty", difficultyOf(settings.cpuDifficulty));
  if (palette === "custom") {
    const colors = sanitizeCustomColors(settings.customColors);
    if (colors.length > 0) params.set("colors", colors.map((color) => color.slice(1)).join(","));
  }
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return params;
}

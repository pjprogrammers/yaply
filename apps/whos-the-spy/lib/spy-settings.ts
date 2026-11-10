import {
  DEFAULT_GAME_SETTINGS,
  SPY_CATEGORY_IDS,
  SPY_CLUE_FORMAT_IDS,
  SPY_CLUE_SECONDS,
  SPY_DIFFICULTY_IDS,
  SPY_DISCUSSION_SECONDS,
  SPY_MAX_PLAYERS,
  SPY_VOTING_SECONDS,
  isSpyCategoryId,
  isSpyClueFormat,
  isSpyDifficulty,
} from "@yaply/shared/constants";
import type { GameSettings, SpyClueFormat, SpyDifficulty } from "@yaply/shared/types";

export type LocalSpyConfig = {
  nickname: string;
  categories: string[];
  difficulty: SpyDifficulty;
  spyCount: number;
  clueSeconds: number;
  discussionSeconds: number;
  votingSeconds: number;
  finalGuess: boolean;
  roleReveal: boolean;
  textChat: boolean;
  voiceChat: boolean;
  spectatorChat: boolean;
  clueFormat: SpyClueFormat;
};

export const LOCAL_SETTINGS_KEY = "yaply:whos-the-spy:settings";

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_GAME_SETTINGS.spyCategories ?? ["mixed"]];
  const next = [...new Set(value.filter((entry): entry is string => isSpyCategoryId(entry)))];
  if (next.length === 0) return ["mixed"];
  // "Mixed" is the whole bank; combining it with a specific category is noise.
  return next.includes("mixed") ? ["mixed"] : next;
}

export function defaultLocalConfig(nickname = ""): LocalSpyConfig {
  return {
    nickname,
    categories: [...(DEFAULT_GAME_SETTINGS.spyCategories ?? ["mixed"])],
    difficulty: "normal",
    spyCount: 0,
    clueSeconds: DEFAULT_GAME_SETTINGS.spyClueSeconds ?? SPY_CLUE_SECONDS.default,
    discussionSeconds:
      DEFAULT_GAME_SETTINGS.spyDiscussionSeconds ?? SPY_DISCUSSION_SECONDS.default,
    votingSeconds: DEFAULT_GAME_SETTINGS.spyVotingSeconds ?? SPY_VOTING_SECONDS.default,
    finalGuess: DEFAULT_GAME_SETTINGS.spyFinalGuess ?? true,
    roleReveal: DEFAULT_GAME_SETTINGS.spyRoleReveal ?? true,
    textChat: DEFAULT_GAME_SETTINGS.spyTextChat ?? true,
    voiceChat: DEFAULT_GAME_SETTINGS.spyVoiceChat ?? true,
    spectatorChat: DEFAULT_GAME_SETTINGS.spySpectatorChat ?? false,
    clueFormat: "both",
  };
}

export function normalizeLocalConfig(input: unknown, nickname = ""): LocalSpyConfig {
  const fallback = defaultLocalConfig(nickname);
  if (!input || typeof input !== "object") return fallback;
  const value = input as Partial<LocalSpyConfig>;

  return {
    nickname:
      typeof value.nickname === "string"
        ? value.nickname.trim().slice(0, 16)
        : nickname,
    categories: normalizeCategories(value.categories),
    difficulty: isSpyDifficulty(value.difficulty) ? value.difficulty : fallback.difficulty,
    spyCount: clampInt(value.spyCount, fallback.spyCount, 0, 3),
    clueSeconds: clampInt(
      value.clueSeconds,
      fallback.clueSeconds,
      SPY_CLUE_SECONDS.min,
      SPY_CLUE_SECONDS.max,
    ),
    discussionSeconds: clampInt(
      value.discussionSeconds,
      fallback.discussionSeconds,
      SPY_DISCUSSION_SECONDS.min,
      SPY_DISCUSSION_SECONDS.max,
    ),
    votingSeconds: clampInt(
      value.votingSeconds,
      fallback.votingSeconds,
      SPY_VOTING_SECONDS.min,
      SPY_VOTING_SECONDS.max,
    ),
    finalGuess: bool(value.finalGuess, fallback.finalGuess),
    roleReveal: bool(value.roleReveal, fallback.roleReveal),
    textChat: bool(value.textChat, fallback.textChat),
    voiceChat: bool(value.voiceChat, fallback.voiceChat),
    spectatorChat: bool(value.spectatorChat, fallback.spectatorChat),
    clueFormat: isSpyClueFormat(value.clueFormat) ? value.clueFormat : fallback.clueFormat,
  };
}

export function readLocalConfig(nickname = ""): LocalSpyConfig {
  if (typeof window === "undefined") return defaultLocalConfig(nickname);
  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return defaultLocalConfig(nickname);
    return normalizeLocalConfig(JSON.parse(raw), nickname);
  } catch {
    return defaultLocalConfig(nickname);
  }
}

export function writeLocalConfig(config: LocalSpyConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(config));
  } catch {
    // Storage is optional; the room still works for this session.
  }
}

export function localConfigToSettings(config: LocalSpyConfig): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    maxPlayers: SPY_MAX_PLAYERS,
    playerCount: SPY_MAX_PLAYERS,
    spyCount: config.spyCount,
    spyCategories: config.categories,
    spyDifficulty: config.difficulty,
    spyClueSeconds: config.clueSeconds,
    spyDiscussionSeconds: config.discussionSeconds,
    spyVotingSeconds: config.votingSeconds,
    spyFinalGuess: config.finalGuess,
    spyRoleReveal: config.roleReveal,
    spyTextChat: config.textChat,
    spyVoiceChat: config.voiceChat,
    spySpectatorChat: config.spectatorChat,
    spyClueFormat: config.clueFormat,
  };
}

/** The valid preset options for the current local config, used by the lobby. */
export const SPY_CATEGORY_CHOICES = SPY_CATEGORY_IDS;
export const SPY_DIFFICULTY_CHOICES = SPY_DIFFICULTY_IDS;
export const SPY_CLUE_FORMAT_CHOICES = SPY_CLUE_FORMAT_IDS;

/** Project authoritative room settings into the shape the lobby editor uses. */
export function settingsToLocalConfig(
  settings: GameSettings,
  nickname = "",
): LocalSpyConfig {
  const fallback = defaultLocalConfig(nickname);
  return {
    nickname,
    categories: normalizeCategories(settings.spyCategories ?? fallback.categories),
    difficulty: isSpyDifficulty(settings.spyDifficulty)
      ? settings.spyDifficulty
      : fallback.difficulty,
    spyCount: clampInt(settings.spyCount, fallback.spyCount, 0, 3),
    clueSeconds: clampInt(
      settings.spyClueSeconds,
      fallback.clueSeconds,
      SPY_CLUE_SECONDS.min,
      SPY_CLUE_SECONDS.max,
    ),
    discussionSeconds: clampInt(
      settings.spyDiscussionSeconds,
      fallback.discussionSeconds,
      SPY_DISCUSSION_SECONDS.min,
      SPY_DISCUSSION_SECONDS.max,
    ),
    votingSeconds: clampInt(
      settings.spyVotingSeconds,
      fallback.votingSeconds,
      SPY_VOTING_SECONDS.min,
      SPY_VOTING_SECONDS.max,
    ),
    finalGuess: settings.spyFinalGuess ?? fallback.finalGuess,
    roleReveal: settings.spyRoleReveal ?? fallback.roleReveal,
    textChat: settings.spyTextChat ?? fallback.textChat,
    voiceChat: settings.spyVoiceChat ?? fallback.voiceChat,
    spectatorChat: settings.spySpectatorChat ?? fallback.spectatorChat,
    clueFormat: isSpyClueFormat(settings.spyClueFormat)
      ? settings.spyClueFormat
      : fallback.clueFormat,
  };
}

/** Only the room-settings fields the lobby edits, ready for `room.settings.update`. */
export function localConfigToPatch(config: LocalSpyConfig): Partial<GameSettings> {
  return {
    spyCount: config.spyCount,
    spyCategories: config.categories,
    spyDifficulty: config.difficulty,
    spyClueSeconds: config.clueSeconds,
    spyDiscussionSeconds: config.discussionSeconds,
    spyVotingSeconds: config.votingSeconds,
    spyFinalGuess: config.finalGuess,
    spyRoleReveal: config.roleReveal,
    spyTextChat: config.textChat,
    spyVoiceChat: config.voiceChat,
    spySpectatorChat: config.spectatorChat,
    spyClueFormat: config.clueFormat,
  };
}

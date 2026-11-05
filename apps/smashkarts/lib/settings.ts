import { KART_COLORS } from "@/game/constants";
import { MAPS } from "@/game/maps";
import type { MapId } from "@/game/types";

export interface PlayerSettings {
  name: string;
  color: string;
  mapId: MapId;
  botCount: number;
  killTarget: number;
  duration: number;
}

export const NAME_MAX = 14;

export const BOT_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;
export const KILL_OPTIONS = [10, 15, 20, 25, 30] as const;
export const DURATION_OPTIONS = [
  { value: 180, label: "3 min" },
  { value: 300, label: "5 min" },
  { value: 420, label: "7 min" },
] as const;

export const DEFAULT_SETTINGS: PlayerSettings = {
  name: "Driver",
  color: KART_COLORS[0].hex,
  mapId: "foundry",
  botCount: 5,
  killTarget: 20,
  duration: 300,
};

const STORAGE_KEY = "smashkarts:settings";
const MUTE_KEY = "smashkarts:muted";
const CONTROLS_KEY = "smashkarts:controls";

export type ControlScheme = "joystick" | "pedals";

function isMapId(value: unknown): value is MapId {
  return typeof value === "string" && value in MAPS;
}

function isKnownColor(value: unknown): value is string {
  return typeof value === "string" && KART_COLORS.some((entry) => entry.hex === value);
}

export function normalizeSettings(input: Partial<PlayerSettings> | null | undefined): PlayerSettings {
  if (!input) {
    return { ...DEFAULT_SETTINGS };
  }
  const name = typeof input.name === "string" ? input.name.trim().slice(0, NAME_MAX) : "";
  return {
    name: name || DEFAULT_SETTINGS.name,
    color: isKnownColor(input.color) ? input.color : DEFAULT_SETTINGS.color,
    mapId: isMapId(input.mapId) ? input.mapId : DEFAULT_SETTINGS.mapId,
    botCount: Number.isFinite(input.botCount)
      ? Math.min(7, Math.max(1, Math.round(input.botCount as number)))
      : DEFAULT_SETTINGS.botCount,
    killTarget: KILL_OPTIONS.includes(input.killTarget as (typeof KILL_OPTIONS)[number])
      ? (input.killTarget as number)
      : DEFAULT_SETTINGS.killTarget,
    duration: DURATION_OPTIONS.some((option) => option.value === input.duration)
      ? (input.duration as number)
      : DEFAULT_SETTINGS.duration,
  };
}

export function readSettings(): PlayerSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    return normalizeSettings(JSON.parse(raw) as Partial<PlayerSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings: PlayerSettings) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // private browsing can reject writes; the game still runs
  }
}

export function readMuted(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function savePaint(color: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const settings = readSettings();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, color }));
  } catch {
    // ignore
  }
}

export function readControlScheme(): ControlScheme {
  if (typeof window === "undefined") {
    return "joystick";
  }
  try {
    return window.localStorage.getItem(CONTROLS_KEY) === "pedals" ? "pedals" : "joystick";
  } catch {
    return "joystick";
  }
}

export function writeControlScheme(scheme: ControlScheme) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CONTROLS_KEY, scheme);
  } catch {
    // private browsing can reject writes; the game still runs
  }
}

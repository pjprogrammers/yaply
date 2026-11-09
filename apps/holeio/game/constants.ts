export const MATCH_SECONDS = 120;
export const COUNTDOWN_SECONDS = 3.2;
export const BOT_COUNT = 7;
export const START_RADIUS = 1.1;
export const MAX_RADIUS = 17;

export const HOLE_COLORS = [
  { id: "lime", name: "Lime", hex: "#d8ff5c", ink: "#0b0d08" },
  { id: "coral", name: "Coral", hex: "#ff6f61", ink: "#190b09" },
  { id: "sky", name: "Sky", hex: "#63c7ff", ink: "#06131a" },
  { id: "magenta", name: "Magenta", hex: "#ff5bb0", ink: "#1a0611" },
  { id: "amber", name: "Amber", hex: "#ffc247", ink: "#1a1204" },
  { id: "mint", name: "Mint", hex: "#7dffb2", ink: "#06180d" },
  { id: "violet", name: "Violet", hex: "#b28cff", ink: "#0f081d" },
  { id: "orange", name: "Orange", hex: "#ff9447", ink: "#1a0c03" },
] as const;

export const PLAYER_COLOR = HOLE_COLORS[0];

export const BOT_NAMES = [
  "Nibble",
  "Sinkhole",
  "Vacuum",
  "Goblin",
  "Pothole",
  "Muncher",
  "Gravity",
  "Blackout",
  "Chomp",
  "Voidling",
  "Dustpan",
  "Underpass",
  "Plughole",
  "Event Horizon",
  "Swallowtail",
  "Crater",
  "Gulper",
  "Drainbrain",
  "Trench",
  "Maw",
] as const;

export const TIERS = [
  { min: 1.1, label: "Pothole" },
  { min: 2.2, label: "Drain" },
  { min: 3.4, label: "Sinkhole" },
  { min: 5.2, label: "Crater" },
  { min: 7.8, label: "Chasm" },
  { min: 10.8, label: "Abyss" },
  { min: 14, label: "Event horizon" },
] as const;

export function radiusForScore(score: number): number {
  const safe = Math.max(0, score);
  return Math.min(
    MAX_RADIUS,
    START_RADIUS + Math.pow(safe / 9, 0.42) * 0.7,
  );
}

export function scoreForRadius(radius: number): number {
  const clamped = Math.max(START_RADIUS, Math.min(MAX_RADIUS, radius));
  return Math.pow(Math.max(0, (clamped - START_RADIUS) / 0.7), 1 / 0.42) * 9;
}

export function speedForRadius(radius: number): number {
  return Math.max(6.1, 10 - (radius - START_RADIUS) * 0.22);
}

export function tierForRadius(radius: number): {
  label: string;
  index: number;
  next: number;
  progress: number;
} {
  let index = 0;
  for (let i = 0; i < TIERS.length; i += 1) {
    if (radius >= TIERS[i].min) index = i;
  }
  const current = TIERS[index];
  const next = TIERS[Math.min(TIERS.length - 1, index + 1)];
  const span = Math.max(0.001, next.min - current.min);
  const progress =
    index >= TIERS.length - 1
      ? 1
      : Math.max(0, Math.min(1, (radius - current.min) / span));
  return { label: current.label, index, next: next.min, progress };
}

/** City block geometry. Roads sit between the 38m blocks. */
export const BOT_PERSONALITY = [
  { greed: 1.16, speed: 0.96, caution: 0.9 },
  { greed: 1.04, speed: 1.02, caution: 1.1 },
  { greed: 0.94, speed: 1.04, caution: 0.95 },
  { greed: 1.1, speed: 0.94, caution: 1.02 },
  { greed: 0.9, speed: 1.06, caution: 1.16 },
  { greed: 1.2, speed: 0.9, caution: 0.86 },
  { greed: 0.98, speed: 1.0, caution: 1.05 },
] as const;

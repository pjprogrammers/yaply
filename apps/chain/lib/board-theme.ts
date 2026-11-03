import type { ChainTheme } from "@yaply/shared/types";

export type BoardTheme = {
  /** Top of the board's vertical wash. */
  gradientTop: string;
  /** Middle of the board's vertical wash. */
  gradientMid: string;
  /** Bottom of the board's vertical wash. */
  gradientBottom: string;
  /** Recessed cubby outline. */
  gridLine: string;
  /** Outer board outline and the brightest lattice edges. */
  gridLineStrong: string;
  /** Barely-there tint inside the lattice. */
  cellTint: string;
  hoverFill: string;
  selectedFill: string;
  text: string;
  accent: string;
  shadow: string;
  haze: string;
};

const THEMES: Record<ChainTheme, BoardTheme> = {
  dark: {
    gradientTop: "#383842",
    gradientMid: "#24222b",
    gradientBottom: "#090a0f",
    gridLine: "rgba(221,220,235,0.62)",
    gridLineStrong: "rgba(238,237,248,0.84)",
    cellTint: "rgba(0,0,0,0.045)",
    hoverFill: "rgba(76,179,240,0.10)",
    selectedFill: "rgba(76,179,240,0.18)",
    text: "#f7f6fb",
    accent: "#4cb3f0",
    shadow: "rgba(0,0,0,0.55)",
    haze: "rgba(255,255,255,0.035)",
  },
  light: {
    gradientTop: "#fffdf8",
    gradientMid: "#f0eade",
    gradientBottom: "#d9cfbf",
    gridLine: "rgba(41,34,24,0.34)",
    gridLineStrong: "rgba(41,34,24,0.56)",
    cellTint: "rgba(255,255,255,0.02)",
    hoverFill: "rgba(31,122,224,0.09)",
    selectedFill: "rgba(31,122,224,0.16)",
    text: "#1b1712",
    accent: "#1f7ae0",
    shadow: "rgba(60,48,30,0.24)",
    haze: "rgba(255,255,255,0.16)",
  },
  neon: {
    gradientTop: "#111a2b",
    gradientMid: "#080f1c",
    gradientBottom: "#02050a",
    gridLine: "rgba(125,228,255,0.42)",
    gridLineStrong: "rgba(167,242,255,0.78)",
    cellTint: "rgba(0,0,0,0.08)",
    hoverFill: "rgba(57,255,136,0.09)",
    selectedFill: "rgba(57,255,136,0.17)",
    text: "#ecfbff",
    accent: "#39ff88",
    shadow: "rgba(0,0,0,0.6)",
    haze: "rgba(57,255,136,0.06)",
  },
};

export function boardTheme(theme: ChainTheme | undefined): BoardTheme {
  return THEMES[theme ?? "dark"] ?? THEMES.dark;
}

import type { ChainTheme } from "@yaply/shared/types";

export type BoardTheme = {
  background: string;
  tableTop: string;
  tableTopAlt: string;
  tableEdge: string;
  tableSide: string;
  gridLine: string;
  gridLineStrong: string;
  text: string;
  accent: string;
  shadow: string;
  haze: string;
};

const THEMES: Record<ChainTheme, BoardTheme> = {
  dark: {
    background: "#080808",
    tableTop: "#141414",
    tableTopAlt: "#101010",
    tableEdge: "#050505",
    tableSide: "#0d0d0d",
    gridLine: "rgba(255,255,255,0.14)",
    gridLineStrong: "rgba(255,255,255,0.34)",
    text: "#ffffff",
    accent: "#4cb3f0",
    shadow: "rgba(0,0,0,0.55)",
    haze: "rgba(76,179,240,0.10)",
  },
  light: {
    background: "#efece4",
    tableTop: "#fffdf8",
    tableTopAlt: "#f6f2e9",
    tableEdge: "#cfc8b9",
    tableSide: "#ded7c9",
    gridLine: "rgba(36,30,20,0.16)",
    gridLineStrong: "rgba(36,30,20,0.38)",
    text: "#1b1712",
    accent: "#1f7ae0",
    shadow: "rgba(60,48,30,0.28)",
    haze: "rgba(31,122,224,0.08)",
  },
  neon: {
    background: "#04060c",
    tableTop: "#0a1020",
    tableTopAlt: "#080d19",
    tableEdge: "#02040a",
    tableSide: "#060b16",
    gridLine: "rgba(84,220,255,0.18)",
    gridLineStrong: "rgba(84,220,255,0.48)",
    text: "#ecfbff",
    accent: "#39ff88",
    shadow: "rgba(0,0,0,0.6)",
    haze: "rgba(57,255,136,0.10)",
  },
};

export function boardTheme(theme: ChainTheme | undefined): BoardTheme {
  return THEMES[theme ?? "dark"] ?? THEMES.dark;
}

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((part) => part + part)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(value, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mix(color: string, target: string, amount: number): string {
  const a = hexToRgb(color);
  const b = hexToRgb(target);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

export function lighten(color: string, amount = 0.3): string {
  return mix(color, "#ffffff", amount);
}

export function darken(color: string, amount = 0.3): string {
  return mix(color, "#000000", amount);
}

export function alpha(color: string, opacity: number): string {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}

/**
 * Gummy, slightly translucent-looking ball. The reference uses a saturated
 * core with a dark elastic rim, not a hard white specular dot.
 */
export function orbBackground(color: string): string {
  return [
    `radial-gradient(circle at 37% 31%, ${alpha(lighten(color, 0.3), 0.34)} 0%, rgba(255,255,255,0) 42%)`,
    `radial-gradient(circle at 36% 30%, ${lighten(color, 0.08)} 0%, ${color} 40%, ${color} 68%, ${darken(color, 0.26)} 88%, ${darken(color, 0.52)} 100%)`,
  ].join(", ");
}

export function orbShadow(color: string): string {
  return [
    `0 clamp(1px, 0.35vw, 4px) clamp(3px, 0.8vw, 9px) rgba(0,0,0,0.42)`,
    `0 0 0 1px ${alpha(darken(color, 0.5), 0.5)}`,
    `inset -2px -3px 7px ${alpha(darken(color, 0.46), 0.42)}`,
    `inset 2px 2px 6px ${alpha(lighten(color, 0.28), 0.16)}`,
  ].join(", ");
}

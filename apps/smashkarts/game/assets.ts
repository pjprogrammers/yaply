import * as THREE from "three";
import type { MapTheme } from "./types";

export function hexToCss(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

export function cssToHex(value: string): number {
  return Number.parseInt(value.replace("#", ""), 16);
}

function canvas2d(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas is unavailable in this browser.");
  }
  return { canvas, ctx };
}

function finishTexture(canvas: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function shade(base: string, amount: number): string {
  const c = new THREE.Color(base);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  colors: string[],
  maxRadius: number,
) {
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * maxRadius + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createGroundTexture(theme: MapTheme): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = canvas2d(size, size);
  const base = hexToCss(theme.ground);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  if (theme.groundStyle === "concrete") {
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = shade(base, (Math.random() - 0.5) * 0.03);
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * size,
        Math.random() * size,
        Math.random() * 22 + 5,
        Math.random() * 17 + 4,
        Math.random() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i += 1) {
      const p = (i / 4) * size;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const p = (i / 4) * size + 2;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
    }
    speckle(ctx, size, 320, ["rgba(0,0,0,0.14)", "rgba(255,255,255,0.05)"], 1.5);
  } else if (theme.groundStyle === "sand") {
    for (let i = 0; i < 90; i += 1) {
      ctx.strokeStyle = shade(base, (Math.random() - 0.5) * 0.08);
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      const y = Math.random() * size;
      const x = Math.random() * size;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 18, y + 4, x + 34, y - 5, x + 52, y + 1);
      ctx.stroke();
    }
    speckle(ctx, size, 260, ["rgba(80,55,25,0.18)", "rgba(255,240,210,0.16)"], 1.6);
  } else {
    for (let i = 0; i < 18; i += 1) {
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = Math.random() * 1.8 + 0.4;
      ctx.beginPath();
      let x = Math.random() * size;
      let y = Math.random() * size;
      ctx.moveTo(x, y);
      for (let step = 0; step < 3; step += 1) {
        x += (Math.random() - 0.5) * 48;
        y += (Math.random() - 0.5) * 48;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 10; i += 1) {
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 60 + 10, Math.random() * 4 + 1);
    }
    speckle(ctx, size, 180, ["rgba(255,255,255,0.05)", "rgba(0,0,0,0.3)"], 1.4);
  }
  return finishTexture(canvas, 14);
}

export function createHazardTexture(base = 0xffc233): THREE.CanvasTexture {
  const size = 128;
  const { canvas, ctx } = canvas2d(size, size);
  ctx.fillStyle = "#171714";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = hexToCss(base);
  ctx.lineWidth = 20;
  for (let x = -size; x < size * 2; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, size + 10);
    ctx.lineTo(x + size, -10);
    ctx.stroke();
  }
  return finishTexture(canvas, 1);
}

export function createSignTexture(text: string, color: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 256;
  const { canvas, ctx } = canvas2d(width, height);
  ctx.fillStyle = "#0b0b0a";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = hexToCss(color);
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, width - 28, height - 28);
  ctx.font = '900 118px "Arial Black", Impact, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = hexToCss(color);
  ctx.shadowBlur = 32;
  ctx.fillStyle = hexToCss(color);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillText(text, width / 2, height / 2 + 6);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff6e0";
  ctx.globalAlpha = 0.25;
  ctx.fillText(text, width / 2, height / 2 + 6);
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createNameTexture(name: string, color: string): THREE.CanvasTexture {
  const width = 512;
  const height = 128;
  const { canvas, ctx } = canvas2d(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.font = '800 58px "Arial Black", Impact, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(8,8,8,0.92)";
  ctx.strokeText(name.toUpperCase(), width / 2, height / 2 + 4);
  ctx.fillStyle = color;
  ctx.fillText(name.toUpperCase(), width / 2, height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export interface HealthBarTexture {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  percent: number;
}

const HEALTH_COLORS = [
  {
    light: "#d9ff8a",
    base: "#9ef01a",
    dark: "#5fae00",
    glow: "rgba(158, 240, 26, 0.62)",
  },
  {
    light: "#ffe58a",
    base: "#ffc233",
    dark: "#e08a00",
    glow: "rgba(255, 194, 51, 0.62)",
  },
  {
    light: "#ffc0a0",
    base: "#ff5a1f",
    dark: "#c92d00",
    glow: "rgba(255, 90, 31, 0.68)",
  },
];

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * Draws a high-contrast health bar into a canvas texture. The white frame and
 * dark track keep it readable over every arena, and the bright fill makes the
 * remaining hull obvious at a glance.
 */
export function paintHealthBar(bar: HealthBarTexture, ratio: number): void {
  const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  if (percent === bar.percent) {
    return;
  }
  bar.percent = percent;

  const { ctx, canvas } = bar;
  const width = canvas.width;
  const height = canvas.height;
  const clamped = percent / 100;
  const colors =
    clamped > 0.55
      ? HEALTH_COLORS[0]
      : clamped > 0.25
        ? HEALTH_COLORS[1]
        : HEALTH_COLORS[2];

  ctx.clearRect(0, 0, width, height);

  // Light outer frame with a soft coloured glow so the bar separates from the
  // karts, walls and sky behind it.
  ctx.save();
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#fffdf6";
  roundedRect(ctx, 2, 2, width - 4, height - 4, 16);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(8, 8, 7, 0.95)";
  roundedRect(ctx, 8, 8, width - 16, height - 16, 10);
  ctx.fill();

  const x = 12;
  const y = 12;
  const trackWidth = width - 24;
  const trackHeight = height - 24;
  const fillWidth =
    clamped <= 0 ? 0 : Math.min(trackWidth, Math.max(8, trackWidth * clamped));

  if (fillWidth > 0) {
    const gradient = ctx.createLinearGradient(0, y, 0, y + trackHeight);
    gradient.addColorStop(0, colors.light);
    gradient.addColorStop(0.55, colors.base);
    gradient.addColorStop(1, colors.dark);
    ctx.fillStyle = gradient;
    roundedRect(ctx, x, y, fillWidth, trackHeight, 7);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
    roundedRect(ctx, x + 2, y + 2, Math.max(0, fillWidth - 4), trackHeight * 0.32, 4);
    ctx.fill();

    if (fillWidth > 12) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(x + fillWidth - 5, y + 2, 3, trackHeight - 4);
    }
  }

  // Segment ticks read as a gauge without adding another HUD panel.
  ctx.strokeStyle = "rgba(8, 8, 7, 0.4)";
  ctx.lineWidth = 2;
  for (let index = 1; index < 4; index += 1) {
    const tickX = x + (trackWidth * index) / 4;
    ctx.beginPath();
    ctx.moveTo(tickX, y + 2);
    ctx.lineTo(tickX, y + trackHeight - 2);
    ctx.stroke();
  }

  bar.texture.needsUpdate = true;
}

export function createHealthBarTexture(): HealthBarTexture {
  const width = 320;
  const height = 64;
  const { canvas, ctx } = canvas2d(width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const bar: HealthBarTexture = { texture, canvas, ctx, percent: -1 };
  paintHealthBar(bar, 1);
  return bar;
}

export function createSparkTexture(): THREE.CanvasTexture {
  const size = 64;
  const { canvas, ctx } = canvas2d(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.85)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createSmokeTexture(): THREE.CanvasTexture {
  const size = 64;
  const { canvas, ctx } = canvas2d(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createChevronTexture(): THREE.CanvasTexture {
  const width = 128;
  const height = 256;
  const { canvas, ctx } = canvas2d(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 20;
  ctx.lineCap = "square";
  for (let y = 26; y < height; y += 76) {
    ctx.beginPath();
    ctx.moveTo(22, y + 42);
    ctx.lineTo(width / 2, y);
    ctx.lineTo(width - 22, y + 42);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWindowTexture(color: number): THREE.CanvasTexture {
  const width = 128;
  const height = 256;
  const { canvas, ctx } = canvas2d(width, height);
  ctx.fillStyle = "#0c0d16";
  ctx.fillRect(0, 0, width, height);
  const lit = `#${new THREE.Color(color).getHexString()}`;
  for (let y = 12; y < height - 10; y += 18) {
    for (let x = 12; x < width - 10; x += 20) {
      const on = Math.random() > 0.72;
      ctx.fillStyle = on ? lit : "rgba(255,255,255,0.035)";
      ctx.globalAlpha = on ? Math.random() * 0.55 + 0.25 : 1;
      ctx.fillRect(x, y, 10, 8);
    }
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createBannerTexture(color: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = canvas2d(size, size);
  ctx.fillStyle = "#151512";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = hexToCss(color);
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, size - 24, size - 24);
  ctx.fillStyle = hexToCss(color);
  ctx.font = '900 70px "Arial Black", Impact, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RIOT", size / 2, size / 2 - 14);
  ctx.font = '700 26px "Arial Narrow", Arial, sans-serif';
  ctx.fillText("MOTOR CLUB", size / 2, size / 2 + 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

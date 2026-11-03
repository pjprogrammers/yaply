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

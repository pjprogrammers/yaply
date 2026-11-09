"use client";

import { useEffect, useRef, useState } from "react";
import type { GameSnapshot } from "@/game/types";

const SIZE = 240;

interface MinimapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface MinimapData {
  bounds: MinimapBounds;
  blocks: { x: number; z: number; w: number; d: number }[];
}

const FALLBACK: MinimapData = {
  bounds: { minX: -140, maxX: 140, minZ: -97, maxZ: 97 },
  blocks: [],
};

let cache: Promise<MinimapData> | null = null;

function loadMinimap(): Promise<MinimapData> {
  if (!cache) {
    cache = fetch("/assets/bigcity/minimap.json")
      .then((response) => {
        if (!response.ok) throw new Error("minimap unavailable");
        return response.json() as Promise<MinimapData>;
      })
      .catch(() => FALLBACK);
  }
  return cache;
}

export function Minimap({ snapshot }: { snapshot: GameSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<MinimapData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadMinimap().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { minX, maxX, minZ, maxZ } = data.bounds;
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const scale = Math.min((SIZE - 10) / spanX, (SIZE - 10) / spanZ);
    const offsetX = (SIZE - spanX * scale) / 2;
    const offsetY = (SIZE - spanZ * scale) / 2;
    const mapX = (x: number) => offsetX + (x - minX) * scale;
    const mapZ = (z: number) => offsetY + (z - minZ) * scale;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#1a2019";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Building footprints form the readable structure of the real map.
    for (const block of data.blocks) {
      const width = Math.max(1, block.w * scale);
      const depth = Math.max(1, block.d * scale);
      ctx.fillStyle = block.w > 8 ? "#5b6058" : "#474c46";
      ctx.fillRect(
        mapX(block.x) - width / 2,
        mapZ(block.z) - depth / 2,
        width,
        depth,
      );
      if (block.w > 8) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          mapX(block.x) - width / 2,
          mapZ(block.z) - depth / 2,
          width,
          depth,
        );
      }
    }

    // Holes, largest first so the player sits on top.
    const holes = [...snapshot.holes].sort(
      (a, b) => Number(a.isPlayer) - Number(b.isPlayer) || b.radius - a.radius,
    );
    for (const hole of holes) {
      if (!hole.alive) continue;
      const hx = mapX(hole.x);
      const hz = mapZ(hole.z);
      const radius = Math.max(3.2, hole.radius * scale * 1.35);
      ctx.beginPath();
      ctx.arc(hx, hz, radius + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = hole.isPlayer ? "#d8ff5c" : "rgba(0,0,0,0.7)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, hz, radius, 0, Math.PI * 2);
      ctx.fillStyle = hole.isPlayer ? "#0b0d08" : hole.color;
      ctx.fill();
      if (hole.isPlayer) {
        ctx.beginPath();
        ctx.arc(hx, hz, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(216,255,92,0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Frame.
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2);
  }, [snapshot, data]);

  return (
    <div className="hud-minimap" aria-hidden>
      <canvas ref={canvasRef} width={SIZE} height={SIZE} />
    </div>
  );
}

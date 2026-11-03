"use client";

import { useEffect, useRef } from "react";
import { MAPS } from "@/game/maps";
import type { GameSnapshot } from "@/game/types";

interface MinimapProps {
  snapshot: GameSnapshot;
}

export function Minimap({ snapshot }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const map = MAPS[snapshot.mapId];
    const size = canvas.width;
    const pad = 14;
    const scale = (size - pad * 2) / map.size;
    const center = size / 2;
    const toX = (x: number) => center + x * scale;
    const toY = (z: number) => center + z * scale;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#0d0d0b";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#171713";
    ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2);

    ctx.strokeStyle = "#3a3a32";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, size - pad * 2, size - pad * 2);

    for (const obstacle of map.obstacles) {
      ctx.fillStyle = obstacle.kind === "furnace" ? "#5a3520" : "#302f29";
      ctx.fillRect(
        toX(obstacle.x - obstacle.hx),
        toY(obstacle.z - obstacle.hz),
        obstacle.hx * 2 * scale,
        obstacle.hz * 2 * scale,
      );
    }

    for (const padSpot of map.boostPads) {
      ctx.fillStyle = "#ff8a2a";
      ctx.fillRect(toX(padSpot.x) - 3, toY(padSpot.z) - 5, 6, 10);
    }

    for (const pickup of snapshot.pickups) {
      if (!pickup.active) continue;
      ctx.save();
      ctx.translate(toX(pickup.x), toY(pickup.z));
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#ffc233";
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }

    for (const kart of snapshot.karts) {
      if (!kart.alive) continue;
      const x = toX(kart.x);
      const y = toY(kart.z);
      if (kart.isPlayer) {
        const forwardX = Math.sin(kart.yaw);
        const forwardZ = Math.cos(kart.yaw);
        ctx.beginPath();
        ctx.fillStyle = "#f2ecdd";
        ctx.moveTo(x + forwardX * 9, y + forwardZ * 9);
        ctx.lineTo(x - forwardX * 5 - forwardZ * 5, y - forwardZ * 5 + forwardX * 5);
        ctx.lineTo(x - forwardX * 5 + forwardZ * 5, y - forwardZ * 5 - forwardX * 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = kart.color;
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.fillStyle = kart.color;
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = "rgba(11,11,10,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.fillStyle = "#f2ecdd";
    ctx.font = '700 12px "Arial", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText("N", size - pad - 4, pad + 13);
  }, [snapshot]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      className="block h-full w-full"
      aria-hidden="true"
    />
  );
}

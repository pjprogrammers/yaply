"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Point, Stroke } from "@yaply/shared/types";

type DrawingCanvasProps = {
  strokes: Stroke[];
  canDraw: boolean;
  color: string;
  width: number;
  onStroke: (strokeId: string, points: Point[], done: boolean) => void;
  overlay?: React.ReactNode;
  overlayClear?: boolean;
};

type ActiveStroke = {
  id: string;
  last: Point;
  pending: Point[];
};

const FLUSH_MS = 40;

function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}

export function DrawingCanvas({
  strokes,
  canDraw,
  color,
  width,
  onStroke,
  overlay,
  overlayClear = false,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef<ActiveStroke | null>(null);
  const timerRef = useRef<number | null>(null);
  const strokeApi = useRef({ onStroke, color, width });
  strokeApi.current = { onStroke, color, width };

  const draw = useCallback((list: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);

    if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, cssWidth, cssHeight);
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const stroke of list) {
      if (stroke.points.length === 0) continue;
      const lineWidth = Math.max(1, stroke.width * (cssWidth / 1000));
      context.strokeStyle = stroke.color;
      context.fillStyle = stroke.color;
      context.lineWidth = lineWidth;

      if (stroke.points.length === 1) {
        const point = stroke.points[0];
        context.beginPath();
        context.arc(point.x * cssWidth, point.y * cssHeight, lineWidth / 2, 0, Math.PI * 2);
        context.fill();
        continue;
      }

      context.beginPath();
      stroke.points.forEach((point, index) => {
        const x = point.x * cssWidth;
        const y = point.y * cssHeight;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    }
  }, []);

  useEffect(() => {
    draw(strokes);
  }, [draw, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => draw(strokes));
    observer.observe(canvas);
    draw(strokes);
    return () => observer.disconnect();
  }, [draw, strokes]);

  const flush = useCallback((done: boolean) => {
    const active = activeRef.current;
    if (!active) return;
    if (active.pending.length > 0) {
      strokeApi.current.onStroke(active.id, active.pending, done);
      active.pending = [];
    } else if (done) {
      strokeApi.current.onStroke(active.id, [], true);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = pointFromEvent(event);
    const active: ActiveStroke = {
      id: crypto.randomUUID(),
      last: point,
      pending: [point],
    };
    activeRef.current = active;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      const rect = canvas.getBoundingClientRect();
      const lineWidth = Math.max(1, strokeApi.current.width * (rect.width / 1000));
      context.fillStyle = strokeApi.current.color;
      context.beginPath();
      context.arc(point.x * rect.width, point.y * rect.height, lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    }

    stopTimer();
    timerRef.current = window.setInterval(() => flush(false), FLUSH_MS);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activeRef.current;
    if (!active || !canDraw) return;
    event.preventDefault();

    const point = pointFromEvent(event);
    const dx = point.x - active.last.x;
    const dy = point.y - active.last.y;
    if (dx * dx + dy * dy < 0.000002) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      const rect = canvas.getBoundingClientRect();
      const lineWidth = Math.max(1, strokeApi.current.width * (rect.width / 1000));
      context.strokeStyle = strokeApi.current.color;
      context.lineWidth = lineWidth;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(active.last.x * rect.width, active.last.y * rect.height);
      context.lineTo(point.x * rect.width, point.y * rect.height);
      context.stroke();
    }

    active.last = point;
    active.pending.push(point);
  };

  const finish = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopTimer();
    flush(true);
    activeRef.current = null;
  };

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return (
    <div className="canvas-paper" data-drawer={canDraw ? "true" : "false"}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        aria-label={canDraw ? "Drawing canvas" : "Drawing by another player"}
      />
      {overlay && (
        <div className={`canvas-overlay ${overlayClear ? "canvas-overlay--clear" : ""}`}>{overlay}</div>
      )}
    </div>
  );
}

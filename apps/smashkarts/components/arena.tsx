"use client";

import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/game/engine";
import { createInitialSnapshot, GameStore } from "@/game/store";
import { readMuted, type PlayerSettings } from "@/lib/settings";
import { Hud } from "./hud";
import { OrientationGate } from "./orientation-gate";

interface ArenaProps {
  settings: PlayerSettings;
  onQuit: () => void;
  onRestart: () => void;
}

export function Arena({ settings, onQuit, onRestart }: ArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [store] = useState(
    () =>
      new GameStore(
        createInitialSnapshot(settings.mapId, settings.killTarget, readMuted()),
      ),
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const engine = new GameEngine(
      container,
      {
        mapId: settings.mapId,
        playerName: settings.name,
        color: settings.color,
        botCount: settings.botCount,
        killTarget: settings.killTarget,
        duration: settings.duration,
      },
      store,
    );
    engineRef.current = engine;
    engine.start();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.preventDefault();
        engine.togglePause();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      engine.dispose();
      engineRef.current = null;
    };
  }, [settings, store]);

  return (
    <div className="game-screen relative">
      <div ref={containerRef} className="absolute inset-0" />
      <Hud store={store} engineRef={engineRef} onQuit={onQuit} onRestart={onRestart} />
      <OrientationGate />
    </div>
  );
}

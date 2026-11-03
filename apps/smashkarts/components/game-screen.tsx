"use client";

import { useState } from "react";
import type { PlayerSettings } from "@/lib/settings";
import { readSettings, writeSettings } from "@/lib/settings";
import { Arena } from "./arena";
import { Lobby } from "./lobby";

interface Run {
  key: number;
  settings: PlayerSettings;
}

export function GameScreen() {
  const [settings, setSettings] = useState<PlayerSettings>(() => readSettings());
  const [run, setRun] = useState<Run | null>(null);

  if (!run) {
    return (
      <Lobby
        initial={settings}
        onStart={(next) => {
          setSettings(next);
          writeSettings(next);
          setRun({ key: Date.now(), settings: next });
        }}
      />
    );
  }

  return (
    <Arena
      key={run.key}
      settings={run.settings}
      onQuit={() => setRun(null)}
      onRestart={() =>
        setRun((current) =>
          current ? { key: current.key + 1, settings: current.settings } : current,
        )
      }
    />
  );
}

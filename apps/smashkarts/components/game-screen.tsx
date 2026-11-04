"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlayerSettings } from "@/lib/settings";
import { readSettings, writeSettings } from "@/lib/settings";
import { createRoomCode, roomPath, storeNickname } from "@/lib/config";
import { useAutoFullscreen } from "@/lib/fullscreen";
import { Arena } from "./arena";
import { Lobby } from "./lobby";

interface Run {
  key: number;
  settings: PlayerSettings;
}

export function GameScreen() {
  useAutoFullscreen();
  const router = useRouter();
  const [settings, setSettings] = useState<PlayerSettings>(() => readSettings());
  const [run, setRun] = useState<Run | null>(null);

  const remember = (next: PlayerSettings) => {
    setSettings(next);
    writeSettings(next);
    storeNickname(next.name);
  };

  if (!run) {
    return (
      <Lobby
        initial={settings}
        onStart={(next) => {
          remember(next);
          setRun({ key: Date.now(), settings: next });
        }}
        onCreateRoom={async (next) => {
          remember(next);
          const code = await createRoomCode();
          const params = new URLSearchParams({
            host: "1",
            name: next.name,
            map: next.mapId,
            kill: String(next.killTarget),
            duration: String(next.duration),
          });
          router.push(`${roomPath(code)}?${params.toString()}`);
        }}
        onJoinRoom={(code, next) => {
          remember(next);
          const params = new URLSearchParams({ name: next.name });
          router.push(`${roomPath(code)}?${params.toString()}`);
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

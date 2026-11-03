"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { SmashInput, SmashMatchSnapshot } from "@yaply/shared/types";
import { GameEngine } from "@/game/engine";
import { createInitialSnapshot, GameStore } from "@/game/store";
import type { MapId, OnlinePlayer } from "@/game/types";
import { readMuted } from "@/lib/settings";
import { Hud } from "./hud";

interface OnlineArenaProps {
  role: "online-host" | "online-guest";
  localPlayerId: string;
  round: number;
  mapId: MapId;
  killTarget: number;
  duration: number;
  players: OnlinePlayer[];
  seedRef: MutableRefObject<SmashMatchSnapshot | null>;
  engineRef: MutableRefObject<GameEngine | null>;
  onInput: (input: SmashInput) => void;
  onSnapshot: (snapshot: SmashMatchSnapshot) => void;
  canRematch: boolean;
  onRematch: () => void;
  onQuit: () => void;
}

export function OnlineArena({
  role,
  localPlayerId,
  round,
  mapId,
  killTarget,
  duration,
  players,
  seedRef,
  engineRef,
  onInput,
  onSnapshot,
  canRematch,
  onRematch,
  onQuit,
}: OnlineArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [store] = useState(
    () => new GameStore(createInitialSnapshot(mapId, killTarget, readMuted())),
  );

  const playersRef = useRef(players);
  const inputRef = useRef(onInput);
  const snapshotRef = useRef(onSnapshot);

  const rosterKey = players
    .map((player) => `${player.id}:${player.connected ? 1 : 0}:${player.color}:${player.name}`)
    .join("|");

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    inputRef.current = onInput;
    snapshotRef.current = onSnapshot;
  }, [onInput, onSnapshot]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const engine = new GameEngine(
      container,
      {
        mapId,
        playerName:
          playersRef.current.find((player) => player.id === localPlayerId)?.name ?? "Driver",
        color:
          playersRef.current.find((player) => player.id === localPlayerId)?.color ?? "#ff5a1f",
        botCount: 0,
        killTarget,
        duration,
        mode: role,
        localPlayerId,
        roster: playersRef.current,
        round,
        seedSnapshot: seedRef.current,
        onInput: (input) => inputRef.current(input),
        onSnapshot: (snapshot) => snapshotRef.current(snapshot),
      },
      store,
    );
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
    // Roster changes, remote frames and callbacks flow through refs so they do
    // not tear down the WebGL context. A role/round change is a real remount.
  }, [role, round, mapId, duration, killTarget, localPlayerId, engineRef, seedRef, store]);

  useEffect(() => {
    engineRef.current?.syncRoster(playersRef.current);
  }, [rosterKey, engineRef]);

  return (
    <div className="game-screen relative">
      <div ref={containerRef} className="absolute inset-0" />
      <Hud
        store={store}
        engineRef={engineRef}
        online
        canRematch={canRematch}
        onRematch={onRematch}
        onQuit={onQuit}
        onRestart={onRematch}
      />
    </div>
  );
}

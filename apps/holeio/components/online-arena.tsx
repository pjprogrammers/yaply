"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { HoleioInput, HoleioMatchSnapshot } from "@yaply/shared/types";
import { HoleEngine } from "@/game/engine";
import { loadBigCity } from "@/game/bigcity";
import type { GameSnapshot, OnlinePlayer } from "@/game/types";
import { useFullscreen } from "@/lib/fullscreen";
import { readMuted, writeMuted } from "@/lib/settings";
import { Countdown } from "./countdown";
import { Hud } from "./hud";
import { Joystick } from "./joystick";
import { Results } from "./results";

interface OnlineArenaProps {
  role: "online-host" | "online-guest";
  localPlayerId: string;
  round: number;
  botCount: number;
  players: OnlinePlayer[];
  seedRef: MutableRefObject<HoleioMatchSnapshot | null>;
  engineRef: MutableRefObject<HoleEngine | null>;
  onInput: (input: HoleioInput) => void;
  onMatchSnapshot: (snapshot: HoleioMatchSnapshot) => void;
  onRematch: () => void;
  onLeave: () => void;
}

export function OnlineArena({
  role,
  localPlayerId,
  round,
  botCount,
  players,
  seedRef,
  engineRef,
  onInput,
  onMatchSnapshot,
  onRematch,
  onLeave,
}: OnlineArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [muted, setMuted] = useState(false);
  const fullscreen = useFullscreen();

  const playersRef = useRef(players);
  const inputRef = useRef(onInput);
  const matchRef = useRef(onMatchSnapshot);
  const mutedRef = useRef(muted);

  const rosterKey = players
    .map(
      (player) =>
        `${player.id}:${player.connected ? 1 : 0}:${player.color}:${player.name}`,
    )
    .join("|");

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    inputRef.current = onInput;
    matchRef.current = onMatchSnapshot;
  }, [onInput, onMatchSnapshot]);

  useEffect(() => {
    mutedRef.current = muted;
    engineRef.current?.setMuted(muted);
  }, [engineRef, muted]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const storedMuted = readMuted();
    setMuted(storedMuted);

    let cancelled = false;
    let engine: HoleEngine | null = null;
    const debugWindow = window as Window & { __holeio?: HoleEngine };

    void loadBigCity()
      .then((assets) => {
        if (cancelled) return;
        const local = playersRef.current.find(
          (player) => player.id === localPlayerId,
        );
        try {
          engine = new HoleEngine(container, {
            name: local?.name ?? "You",
            muted: storedMuted,
            assets,
            mode: role,
            localPlayerId,
            roster: playersRef.current,
            botCount,
            round,
            seedSnapshot: seedRef.current,
            onSnapshot: setSnapshot,
            onInput: (input) => inputRef.current(input),
            onMatchSnapshot: (match) => matchRef.current(match),
          });
        } catch {
          return;
        }

        engineRef.current = engine;
        if (role === "online-host") {
          engine.startOnlineHost(seedRef.current);
        } else if (seedRef.current && seedRef.current.round === round) {
          // A stale frame from the previous round must not paint over a rematch
          // before the host sends the first fresh snapshot.
          engine.applyRemoteSnapshot(seedRef.current);
        }

        if (process.env.NODE_ENV !== "production") debugWindow.__holeio = engine;
      })
      .catch(() => {
        // The lobby surfaces connection problems; the arena stays in its
        // loading state until the assets are available.
      });

    return () => {
      cancelled = true;
      if (engineRef.current === engine) engineRef.current = null;
      if (engine && debugWindow.__holeio === engine) delete debugWindow.__holeio;
      engine?.dispose();
    };
    // Roster, relay frames and callbacks flow through refs so the WebGL
    // context is not torn down every time a player joins. A role, round or
    // bot-count change is a real remount.
  }, [role, round, localPlayerId, botCount, engineRef, seedRef]);

  useEffect(() => {
    engineRef.current?.syncRoster(playersRef.current);
  }, [rosterKey, engineRef]);

  const toggleMute = useCallback(() => {
    setMuted((previous) => {
      const next = !previous;
      writeMuted(next);
      engineRef.current?.setMuted(next);
      return next;
    });
  }, [engineRef]);

  const phase = snapshot?.phase ?? "boot";
  const showHud =
    phase === "playing" || phase === "countdown" || phase === "finished";
  const showJoystick = phase === "playing" || phase === "countdown";
  const isMuted = snapshot?.muted ?? muted;

  return (
    <div
      className="game-screen"
      data-phase={phase}
      data-online={role}
      data-fps={snapshot?.fps ?? 0}
      data-score={snapshot?.playerScore ?? 0}
    >
      <div className="game-canvas" ref={containerRef} aria-hidden />

      {!snapshot ? (
        <div className="game-loading">
          <span className="game-loading__hole" aria-hidden />
          <p className="game-loading__word">Hole.io</p>
          <p className="game-loading__hint">Digging the street…</p>
        </div>
      ) : null}

      {showHud && snapshot ? (
        <Hud
          snapshot={snapshot}
          fullscreenActive={fullscreen.active}
          fullscreenSupported={fullscreen.supported}
          onToggleMute={toggleMute}
          onToggleFullscreen={() => void fullscreen.toggle()}
        />
      ) : null}

      {snapshot && phase === "countdown" ? (
        <Countdown value={snapshot.countdown} />
      ) : null}

      {snapshot && phase === "finished" ? (
        <Results
          snapshot={snapshot}
          online
          canRematch={role === "online-host"}
          onRematch={onRematch}
          onLeave={onLeave}
        />
      ) : null}

      <Joystick
        visible={showJoystick}
        onMove={(x, y) => engineRef.current?.setStick(x, y)}
      />

      <span className="online-tag">
        {role === "online-host" ? "Hosting" : "Online"}
      </span>
      <span className="sr-only" aria-live="polite">
        {isMuted ? "Sound muted" : "Sound on"}
      </span>
    </div>
  );
}

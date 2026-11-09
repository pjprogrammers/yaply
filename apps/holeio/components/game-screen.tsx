"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HoleEngine } from "@/game/engine";
import { loadBigCity } from "@/game/bigcity";
import type { GameSnapshot } from "@/game/types";
import {
  cleanRoomCode,
  createRoomCode,
  roomPath,
} from "@/lib/config";
import { useAutoFullscreen, useFullscreen } from "@/lib/fullscreen";
import { readMuted, readName, writeMuted, writeName } from "@/lib/settings";
import { Countdown } from "./countdown";
import { Hud } from "./hud";
import { Joystick } from "./joystick";
import { Menu } from "./menu";
import { PauseMenu } from "./pause-menu";
import { Results } from "./results";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}

export function GameScreen() {
  useAutoFullscreen();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HoleEngine | null>(null);
  const phaseRef = useRef<GameSnapshot["phase"]>("boot");
  const snapshotRef = useRef<GameSnapshot | null>(null);

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [name, setName] = useState("You");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [ready, setReady] = useState(false);

  const fullscreen = useFullscreen();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const storedName = readName();
    const storedMuted = readMuted();
    setName(storedName);
    setMuted(storedMuted);

    let cancelled = false;
    let engine: HoleEngine | null = null;
    const debugWindow = window as Window & { __holeio?: HoleEngine };

    void loadBigCity()
      .then((assets) => {
        if (cancelled) return;
        try {
          engine = new HoleEngine(container, {
            name: storedName,
            muted: storedMuted,
            assets,
            onSnapshot: (next) => {
              snapshotRef.current = next;
              phaseRef.current = next.phase;
              setSnapshot(next);
            },
          });
        } catch (cause) {
          // The engine can only be constructed in the browser, so the failure
          // is reported after mount rather than during render.
          setError(
            cause instanceof Error
              ? cause.message
              : "This browser could not start the game.",
          );
          return;
        }

        engineRef.current = engine;
        setReady(true);

        // Dev-only handle so automated playtests can drive and inspect the match.
        if (process.env.NODE_ENV !== "production") debugWindow.__holeio = engine;
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error ? cause.message : "Could not load the city.",
        );
      });

    return () => {
      cancelled = true;
      engineRef.current = null;
      phaseRef.current = "boot";
      if (engine && debugWindow.__holeio === engine) delete debugWindow.__holeio;
      engine?.dispose();
    };
  }, []);

  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    const phase = phaseRef.current;
    if (!engine) return;
    if (phase === "playing" || phase === "countdown") engine.pause();
    else if (phase === "paused") engine.resume();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (event.key === "Escape" || event.key.toLowerCase() === "p") {
        if (phaseRef.current === "playing" || phaseRef.current === "paused") {
          event.preventDefault();
          togglePause();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePause]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        const phase = phaseRef.current;
        if (phase === "playing" || phase === "countdown") engineRef.current?.pause();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const handleName = (value: string) => {
    setName(value);
    engineRef.current?.setPlayerName(value);
  };

  const handlePlay = () => {
    const clean = name.trim().slice(0, 14) || "You";
    setName(clean);
    writeName(clean);
    engineRef.current?.startMatch(clean, muted);
  };

  const handleCreateRoom = async (botCount: number) => {
    if (creating) return;
    const clean = name.trim().slice(0, 14) || "You";
    setName(clean);
    writeName(clean);
    setOnlineError(null);
    setCreating(true);
    try {
      const code = await createRoomCode();
      const params = new URLSearchParams({
        host: "1",
        name: clean,
        bots: String(Math.max(0, Math.min(7, Math.round(botCount)))),
        max: "8",
      });
      router.push(`${roomPath(code)}?${params.toString()}`);
    } catch (cause) {
      setOnlineError(
        cause instanceof Error
          ? cause.message
          : "Could not open a room. Check that the realtime server is running.",
      );
      setCreating(false);
    }
  };

  const handleJoinRoom = (code: string) => {
    const clean = cleanRoomCode(code);
    if (clean.length !== 6) {
      setOnlineError("Room codes are six letters or digits.");
      return;
    }
    const chosen = name.trim().slice(0, 14) || "You";
    setName(chosen);
    writeName(chosen);
    setOnlineError(null);
    const params = new URLSearchParams({ name: chosen });
    router.push(`${roomPath(clean)}?${params.toString()}`);
  };

  const handleMute = () => {
    const next = !muted;
    setMuted(next);
    writeMuted(next);
    engineRef.current?.setMuted(next);
  };

  const handleRestart = () => {
    writeName(name.trim().slice(0, 14) || "You");
    engineRef.current?.restart();
  };

  const handleMenu = () => {
    engineRef.current?.toMenu();
  };

  const phase = snapshot?.phase ?? "boot";
  const showHud =
    phase === "playing" || phase === "countdown" || phase === "paused";
  const showJoystick = phase === "playing" || phase === "countdown";
  const isMuted = snapshot?.muted ?? muted;

  return (
    <div
      className="game-screen"
      data-phase={phase}
      data-fps={snapshot?.fps ?? 0}
      data-score={snapshot?.playerScore ?? 0}
    >
      <div className="game-canvas" ref={containerRef} aria-hidden />

      {!ready && !error ? (
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
          onPause={togglePause}
          onToggleMute={handleMute}
          onToggleFullscreen={() => void fullscreen.toggle()}
        />
      ) : null}

      {snapshot && phase === "menu" ? (
        <Menu
          name={name}
          muted={isMuted}
          best={snapshot.bestScore}
          creating={creating}
          error={onlineError}
          onNameChange={handleName}
          onPlay={handlePlay}
          onCreateRoom={(botCount) => void handleCreateRoom(botCount)}
          onJoinRoom={handleJoinRoom}
          onToggleMute={handleMute}
        />
      ) : null}

      {snapshot && phase === "countdown" ? (
        <Countdown value={snapshot.countdown} />
      ) : null}

      {snapshot && phase === "paused" ? (
        <PauseMenu
          snapshot={snapshot}
          onResume={() => engineRef.current?.resume()}
          onRestart={handleRestart}
          onQuit={handleMenu}
          onToggleMute={handleMute}
        />
      ) : null}

      {snapshot && phase === "finished" ? (
        <Results
          snapshot={snapshot}
          onRestart={handleRestart}
          onMenu={handleMenu}
        />
      ) : null}

      <Joystick
        visible={showJoystick}
        onMove={(x, y) => engineRef.current?.setStick(x, y)}
      />

      {error ? (
        <div className="game-error">
          <div className="game-error__card">
            <p className="game-error__kicker">No hole today</p>
            <h1>WebGL didn&apos;t start.</h1>
            <p>{error}</p>
            <p>
              Try a current version of Chrome, Safari, Firefox or Edge with
              hardware acceleration switched on.
            </p>
            <Link href="/" className="button button--lime">
              Back to the surface
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

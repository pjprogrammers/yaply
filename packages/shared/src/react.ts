"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameSocket, type ConnectionStatus } from "./client";
import type { ClientEvent, ServerEvent } from "./events";
import type { GameKind, GameSettings, RoomSnapshot } from "./types";

export type UseGameRoomOptions = {
  baseUrl: string;
  code: string;
  game: GameKind;
  nickname: string;
  create?: boolean;
  settings?: Partial<GameSettings>;
  onEvent?: (event: ServerEvent) => void;
};

export type RoomError = {
  code: string;
  message: string;
};

const TOKEN_PREFIX = "yaply:resume:";

function tokenKey(game: GameKind, code: string): string {
  return `${TOKEN_PREFIX}${game}:${code.toLowerCase()}`;
}

function readToken(game: GameKind, code: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(tokenKey(game, code));
  } catch {
    return null;
  }
}

function writeToken(game: GameKind, code: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(tokenKey(game, code), token);
  } catch {
    // Storage can be unavailable in private windows. Reconnect then falls back to a new join.
  }
}

export function useGameRoom({
  baseUrl,
  code,
  game,
  nickname,
  create = false,
  settings,
  onEvent,
}: UseGameRoomOptions) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<RoomError | null>(null);

  const socketRef = useRef<GameSocket | null>(null);
  const eventRef = useRef(onEvent);
  const settingsRef = useRef(settings);
  eventRef.current = onEvent;
  settingsRef.current = settings;

  useEffect(() => {
    setSnapshot(null);
    setPlayerId(null);
    setError(null);

    const socket = new GameSocket({
      baseUrl,
      code,
      game,
      nickname,
      create,
      settings: settingsRef.current,
      resumeToken: readToken(game, code),
      onSnapshot: setSnapshot,
      onStatus: setStatus,
      onWelcome: (id, token) => {
        setPlayerId(id);
        writeToken(game, code, token);
      },
      onError: (errorCode, message) => setError({ code: errorCode, message }),
      onEvent: (event) => eventRef.current?.(event),
    });

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [baseUrl, code, game, nickname, create]);

  const send = useCallback((event: ClientEvent) => {
    socketRef.current?.send(event);
  }, []);

  const leave = useCallback(() => {
    socketRef.current?.send({ type: "room.leave" });
    socketRef.current?.close();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    snapshot,
    status,
    playerId,
    error,
    send,
    leave,
    clearError,
  };
}

/** A clock that ticks on an interval, used for countdowns and elapsed time. */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export function useCountdown(endsAt: number | null, now: number): number {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

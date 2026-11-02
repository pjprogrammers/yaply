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
const TOKEN_BACKUP_PREFIX = "yaply:resume-backup:";

function tokenKey(game: GameKind, code: string): string {
  return `${TOKEN_PREFIX}${game}:${code.toLowerCase()}`;
}

function backupKey(game: GameKind, code: string): string {
  return `${TOKEN_BACKUP_PREFIX}${game}:${code.toLowerCase()}`;
}

function readToken(game: GameKind, code: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    // The session copy belongs to the tab that is currently in a room. The
    // local copy is only a recovery path for a closed tab or an explicit leave.
    return (
      window.sessionStorage.getItem(tokenKey(game, code)) ??
      window.localStorage.getItem(backupKey(game, code))
    );
  } catch {
    return null;
  }
}

function writeToken(game: GameKind, code: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(tokenKey(game, code), token);
    // The active tab owns the seat now; a second tab should not be handed the
    // same token and kick this one unless this tab actually goes away.
    window.localStorage.removeItem(backupKey(game, code));
  } catch {
    // Storage can be unavailable in private windows. Reconnect then falls back to a new join.
  }
}

function backupToken(game: GameKind, code: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(backupKey(game, code), token);
  } catch {
    // Storage can be unavailable in private windows.
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
  const tokenRef = useRef<string | null>(null);
  const eventRef = useRef(onEvent);
  const settingsRef = useRef(settings);
  eventRef.current = onEvent;
  settingsRef.current = settings;

  useEffect(() => {
    setSnapshot(null);
    setPlayerId(null);
    setError(null);

    const resumeToken = readToken(game, code);
    tokenRef.current = resumeToken;

    const socket = new GameSocket({
      baseUrl,
      code,
      game,
      nickname,
      create,
      settings: settingsRef.current,
      resumeToken,
      onSnapshot: setSnapshot,
      onStatus: setStatus,
      onWelcome: (id, token) => {
        setPlayerId(id);
        tokenRef.current = token;
        writeToken(game, code, token);
      },
      onError: (errorCode, message) => setError({ code: errorCode, message }),
      onEvent: (event) => eventRef.current?.(event),
    });

    // Browsers do not reliably deliver a final socket frame on close, so keep
    // the seat token recoverable if this tab disappears mid-match.
    const handlePageHide = () => {
      if (tokenRef.current) backupToken(game, code, tokenRef.current);
    };
    window.addEventListener("pagehide", handlePageHide);

    socketRef.current = socket;
    socket.connect();

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
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
    // Keep the token. If the match is still running the server holds this
    // player's seat and score, so coming back restores it instead of starting
    // at zero. The backup also covers a later join from a fresh tab.
    if (tokenRef.current) backupToken(game, code, tokenRef.current);
  }, [game, code]);

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

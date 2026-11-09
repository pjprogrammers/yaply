"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GameSettings,
  HoleioInput,
  HoleioMatchSnapshot,
} from "@yaply/shared/types";
import type { ClientEvent, ServerEvent } from "@yaply/shared/events";
import {
  DEFAULT_GAME_SETTINGS,
  HOLEIO_BOT_MAX,
  HOLEIO_MAX_PLAYERS,
  MAX_CHAT_LENGTH,
  MAX_NICKNAME_LENGTH,
} from "@yaply/shared/constants";
import { useGameRoom } from "@yaply/shared/react";
import type { ConnectionStatus } from "@yaply/shared/client";
import type { HoleEngine } from "@/game/engine";
import { REALTIME_URL, inviteUrl, numberParam } from "@/lib/config";
import { useAutoFullscreen } from "@/lib/fullscreen";
import { readName, writeName } from "@/lib/settings";
import { OnlineArena } from "./online-arena";

const FATAL_CODES = new Set([
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_EXISTS",
  "ROOM_NOT_RESERVED",
  "GAME_MISMATCH",
  "ROOM_IN_PROGRESS",
  "RESUME_FAILED",
  "PROTOCOL_MISMATCH",
  "SESSION_REPLACED",
  "ROOM_CLOSED",
  "BAD_URL",
]);

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
  failed: "Connection failed",
};

const BOT_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

type ChatEntry = {
  id: string;
  nickname: string;
  text: string;
  system?: boolean;
};

type Toast = {
  key: number;
  message: string;
  error?: boolean;
};

function readHostSettings(params: URLSearchParams): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    maxPlayers: numberParam(
      params.get("max"),
      HOLEIO_MAX_PLAYERS,
      2,
      HOLEIO_MAX_PLAYERS,
    ),
    botCount: numberParam(params.get("bots"), HOLEIO_BOT_MAX, 0, HOLEIO_BOT_MAX),
  };
}

export function RoomClient({ code }: { code: string }) {
  useAutoFullscreen();
  const searchParams = useSearchParams();
  const nameParam = (searchParams.get("name") ?? "").trim().slice(0, MAX_NICKNAME_LENGTH);
  const [joined, setJoined] = useState(nameParam.length > 0);
  const [gateName, setGateName] = useState(nameParam);
  const [gateError, setGateError] = useState("");
  const createdByHost = searchParams.get("host") === "1";
  const settings = useMemo(() => readHostSettings(searchParams), [searchParams]);

  useEffect(() => {
    if (joined || gateName) return;
    const stored = readName();
    if (stored && stored !== "You") {
      // localStorage is unavailable during hydration; fill the field once the
      // client has mounted instead of forcing a hydration-mismatched value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGateName(stored.slice(0, MAX_NICKNAME_LENGTH));
    }
  }, [gateName, joined]);

  if (!joined) {
    const submit = (event: React.FormEvent) => {
      event.preventDefault();
      const next = gateName.trim().slice(0, MAX_NICKNAME_LENGTH);
      if (!next) {
        setGateError("Add a name first.");
        return;
      }
      writeName(next);
      setGateName(next);
      setJoined(true);
    };

    return (
      <div className="room-shell">
        <header className="room-bar margins">
          <Link href="/" className="room-wordmark">
            Hole.io
          </Link>
          <span className="room-bar-code">{code.toUpperCase()}</span>
        </header>
        <main className="room-gate margins">
          <div className="room-card room-gate-card">
            <p className="room-eyebrow">Room {code.toUpperCase()}</p>
            <h1 className="display room-title">Join the dig</h1>
            <p className="room-lede">
              Pick the name that will sit on the city leaderboard. The match may
              already be running — late arrivals get a hole of their own.
            </p>
            <form onSubmit={submit} className="room-gate-form">
              <label className="room-field">
                <span>Your name</span>
                <input
                  className="room-input"
                  value={gateName}
                  onChange={(event) => {
                    setGateName(event.target.value.slice(0, MAX_NICKNAME_LENGTH));
                    setGateError("");
                  }}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your name"
                  autoFocus
                  autoComplete="nickname"
                />
              </label>
              {gateError ? (
                <p className="room-form-error" role="alert">
                  {gateError}
                </p>
              ) : null}
              <button type="submit" className="button button--lime">
                Join room
                <span aria-hidden>→</span>
              </button>
              <Link href="/play" className="button button--ghost">
                Back to the menu
              </Link>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ConnectedRoom
      code={code}
      nickname={gateName}
      createdByHost={createdByHost}
      initialSettings={settings}
    />
  );
}

function ConnectedRoom({
  code,
  nickname,
  createdByHost,
  initialSettings,
}: {
  code: string;
  nickname: string;
  createdByHost: boolean;
  initialSettings: GameSettings;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastKey = useRef(0);
  const engineRef = useRef<HoleEngine | null>(null);
  const seedRef = useRef<HoleioMatchSnapshot | null>(null);
  const sendRef = useRef<(event: ClientEvent) => void>(() => undefined);
  const statusRef = useRef<ConnectionStatus>("connecting");

  const pushToast = useCallback((message: string, error = false) => {
    toastKey.current += 1;
    setToast({ key: toastKey.current, message, error });
  }, []);

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case "holeio.snapshot": {
          seedRef.current = event.snapshot;
          engineRef.current?.applyRemoteSnapshot(event.snapshot);
          break;
        }
        case "holeio.input": {
          engineRef.current?.setRemoteInput(event.playerId, event.input);
          break;
        }
        case "chat.message": {
          setMessages((previous) => [
            ...previous.slice(-99),
            {
              id: crypto.randomUUID(),
              nickname: event.nickname,
              text: event.text,
              system: event.system,
            },
          ]);
          break;
        }
        case "room.error": {
          pushToast(event.message, true);
          break;
        }
        case "game.finished": {
          pushToast("Match over. The host can run it back.");
          break;
        }
        default:
          break;
      }
    },
    [pushToast],
  );

  const { snapshot, status, playerId, error, send, leave, clearError } = useGameRoom({
    baseUrl: REALTIME_URL,
    code,
    game: "holeio",
    nickname,
    create: createdByHost,
    settings: initialSettings,
    onEvent: handleEvent,
  });

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const handleInput = useCallback((input: HoleioInput) => {
    // A reconnect queue would replay stale steering after the host moved on.
    if (statusRef.current === "connected") {
      sendRef.current({ type: "holeio.input", input });
    }
  }, []);

  const sendMatchSnapshot = useCallback((match: HoleioMatchSnapshot) => {
    seedRef.current = match;
    // Keep the final frame even while offline so the Worker can settle the
    // match when the host reconnects. Intermediate frames are disposable.
    if (match.phase === "over" || statusRef.current === "connected") {
      sendRef.current({ type: "holeio.snapshot", snapshot: match });
    }
  }, []);

  useEffect(() => {
    if (!error) return;
    if (FATAL_CODES.has(error.code)) return;
    pushToast(error.message, true);
    clearError();
  }, [clearError, error, pushToast]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const copyInvite = async () => {
    const url = inviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast("Clipboard access was blocked. Copy the URL below.", true);
    }
  };

  const handleLeave = () => {
    leave();
    router.push("/play");
  };

  const writeSettings = (patch: Partial<GameSettings>) => {
    send({ type: "room.settings.update", settings: patch });
  };

  const fatal = error && FATAL_CODES.has(error.code) ? error : null;

  if (!snapshot && (fatal || status === "failed")) {
    return (
      <div className="room-shell">
        <header className="room-bar margins">
          <Link href="/" className="room-wordmark">
            Hole.io
          </Link>
          <span className="room-bar-code">{code.toUpperCase()}</span>
        </header>
        <main className="room-gate margins">
          <div className="room-card room-gate-card">
            <p className="room-eyebrow">Room {code.toUpperCase()}</p>
            <h1 className="display room-title">Room unavailable</h1>
            <p className="room-lede">
              {fatal?.message ??
                "The realtime server could not be reached. Check your connection and try again."}
            </p>
            <div className="room-gate-form">
              <Link href="/play" className="button button--lime">
                Back to the menu
              </Link>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="room-shell">
        <header className="room-bar margins">
          <Link href="/" className="room-wordmark">
            Hole.io
          </Link>
          <span className="room-bar-code">{code.toUpperCase()}</span>
        </header>
        <main className="room-gate margins">
          <div className="room-card room-gate-card">
            <span className="room-loader" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <p className="room-lede">Opening room {code.toUpperCase()}…</p>
          </div>
        </main>
      </div>
    );
  }

  const roomSettings = snapshot.settings;
  const me = snapshot.players.find((player) => player.id === playerId) ?? null;
  const isHost = snapshot.hostId === playerId;
  const connectedPlayers = snapshot.players.filter((player) => player.connected).length;
  const maxPlayers = Math.min(
    HOLEIO_MAX_PLAYERS,
    roomSettings.maxPlayers ?? HOLEIO_MAX_PLAYERS,
  );
  const botCount = Math.min(
    HOLEIO_BOT_MAX,
    Math.max(0, roomSettings.botCount ?? 0),
  );
  const phase = snapshot.phase;
  const inMatch = phase === "playing" || phase === "game-over";
  const seats = connectedPlayers + botCount;
  const canStart = isHost && seats >= 2 && phase === "lobby";
  const connectionLost =
    status === "reconnecting" || status === "disconnected" || status === "failed";

  const roomPlayers = snapshot.players.map((player) => ({
    id: player.id,
    name: player.nickname,
    color: player.color,
    connected: player.connected,
  }));

  if (inMatch && playerId && me) {
    return (
      <div className="room-arena-shell">
        <OnlineArena
          role={isHost ? "online-host" : "online-guest"}
          localPlayerId={playerId}
          round={snapshot.roundNumber}
          botCount={botCount}
          players={roomPlayers}
          seedRef={seedRef}
          engineRef={engineRef}
          onInput={handleInput}
          onMatchSnapshot={sendMatchSnapshot}
          onRematch={() => send({ type: "game.rematch" })}
          onLeave={handleLeave}
        />
        {connectionLost ? (
          <div className="room-connection-banner">
            <span>
              {status === "failed"
                ? "The connection dropped."
                : "Connection lost. Rejoining the room…"}
            </span>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        ) : null}
        {toast ? (
          <div className={`room-toast ${toast.error ? "is-error" : ""}`} role="status">
            {toast.message}
          </div>
        ) : null}
      </div>
    );
  }

  const openSeats = Math.max(0, maxPlayers - snapshot.players.length - botCount);
  const reservedBots = Math.min(botCount, Math.max(0, maxPlayers - snapshot.players.length));

  return (
    <div className="room-shell">
      <header className="room-bar margins">
        <Link href="/" className="room-wordmark">
          Hole.io
        </Link>
        <div className="room-bar-meta">
          <span className="room-bar-code">{code.toUpperCase()}</span>
          <span className="room-status" data-status={status}>
            <span aria-hidden />
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="room-bar-actions">
          <button type="button" className="button button--ghost" onClick={copyInvite}>
            {copied ? "Copied" : "Copy invite"}
          </button>
          <button type="button" className="button button--ghost" onClick={handleLeave}>
            Leave
          </button>
        </div>
      </header>

      <main className="room-main margins">
        {connectionLost ? (
          <div className="room-inline-banner">
            <span>Connection lost. Rejoining the room…</span>
            <button type="button" onClick={() => window.location.reload()}>
              Reload now
            </button>
          </div>
        ) : null}

        <div className="room-layout">
          <section className="room-card">
            <div className="room-card-head">
              <div>
                <p className="room-eyebrow">Online room</p>
                <h1 className="display room-title">Ready to dig</h1>
                <p className="room-lede">
                  Share the code or link. Up to eight holes can play, and the
                  host can fill spare seats with bots.
                </p>
              </div>
              <span className="room-count">
                {snapshot.players.length} / {maxPlayers}
              </span>
            </div>

            <div className="room-invite">
              <div>
                <span className="room-field-label">Room code</span>
                <span className="room-invite-code">{code.toUpperCase()}</span>
              </div>
              <div className="room-invite-url">{inviteUrl(code)}</div>
              <button
                type="button"
                className="button button--lime"
                onClick={copyInvite}
              >
                {copied ? "Link copied" : "Copy invite link"}
              </button>
            </div>

            <div className="room-roster-head">
              <span className="room-field-label">Holes</span>
              <span className="room-roster-count">
                {connectedPlayers} connected
                {snapshot.players.length > connectedPlayers
                  ? ` · ${snapshot.players.length - connectedPlayers} away`
                  : ""}
                {reservedBots > 0 ? ` · ${reservedBots} bots` : ""}
              </span>
            </div>

            <div className="room-player-grid">
              {snapshot.players.map((player) => (
                <div
                  key={player.id}
                  className={`room-player ${player.id === playerId ? "is-me" : ""} ${
                    player.connected ? "" : "is-away"
                  }`}
                >
                  <span
                    className="room-player-swatch"
                    style={{ backgroundColor: player.color }}
                    aria-hidden
                  />
                  <span className="room-player-body">
                    <span className="room-player-name">
                      {player.nickname}
                      {player.id === playerId ? " · you" : ""}
                    </span>
                    <span className="room-player-sub">
                      {player.score} points
                      {player.connected ? "" : " · away"}
                    </span>
                  </span>
                  {player.id === snapshot.hostId ? (
                    <span className="room-player-tag">Host</span>
                  ) : null}
                </div>
              ))}
              {Array.from({ length: reservedBots }).map((_, index) => (
                <div key={`bot-${index}`} className="room-player is-bot">
                  <span className="room-player-swatch" aria-hidden />
                  <span className="room-player-body">
                    <span className="room-player-name">Bot {index + 1}</span>
                    <span className="room-player-sub">Fills in at kickoff</span>
                  </span>
                  <span className="room-player-tag">Bot</span>
                </div>
              ))}
              {Array.from({ length: Math.min(openSeats, 5) }).map((_, index) => (
                <div key={`empty-${index}`} className="room-player is-empty">
                  <span className="room-player-swatch" aria-hidden />
                  <span className="room-player-body">
                    <span className="room-player-name">Open seat</span>
                    <span className="room-player-sub">Waiting on a friend</span>
                  </span>
                </div>
              ))}
            </div>
            {openSeats > 5 ? (
              <p className="room-open-note">+ {openSeats - 5} more open seats</p>
            ) : null}

            <div className="room-start">
              {isHost ? (
                <>
                  <button
                    type="button"
                    className="button button--lime"
                    disabled={!canStart}
                    onClick={() => send({ type: "room.start" })}
                  >
                    Start match
                    <span aria-hidden>→</span>
                  </button>
                  <p className="room-note">
                    {canStart
                      ? `${seats} holes ready. Start whenever you are.`
                      : "Add a bot or invite a friend before starting."}
                  </p>
                </>
              ) : (
                <>
                  <span className="room-waiting">Waiting for the host to start</span>
                  <p className="room-note">
                    The host sets the bot count and starts the match. Late
                    arrivals are welcome.
                  </p>
                </>
              )}
            </div>
          </section>

          <aside className="room-side">
            <section className="room-card">
              <div className="room-card-head room-card-head-tight">
                <h2 className="room-subtitle">Match settings</h2>
                <span className="room-player-tag">{isHost ? "Host" : "Host sets these"}</span>
              </div>

              <div className="room-setting">
                <span className="room-field-label">Bot seats</span>
                {isHost ? (
                  <div className="choice-row">
                    {BOT_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`choice ${botCount === value ? "is-active" : ""}`}
                        aria-pressed={botCount === value}
                        onClick={() =>
                          writeSettings({
                            botCount: Math.min(
                              value,
                              Math.max(0, maxPlayers - snapshot.players.length),
                            ),
                          })
                        }
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="room-setting-value">{botCount}</span>
                )}
                <span className="room-setting-hint">
                  {botCount === 0
                    ? "Humans only. Start when at least two holes are in the room."
                    : "Bots fill empty seats. The city always has eight holes."}
                </span>
              </div>

              <div className="room-setting">
                <span className="room-field-label">Match clock</span>
                <span className="room-setting-value">2:00</span>
                <span className="room-setting-hint">
                  Every match is a two-minute feeding frenzy.
                </span>
              </div>

              <div className="room-setting">
                <span className="room-field-label">City</span>
                <span className="room-setting-value">Big City</span>
                <span className="room-setting-hint">
                  The same downtown map for every hole in the room.
                </span>
              </div>
            </section>

            <section className="room-card room-chat-card">
              <div className="room-card-head room-card-head-tight">
                <h2 className="room-subtitle">Room chat</h2>
                <span className="room-roster-count">
                  {messages.length > 0 ? `${messages.length} lines` : "quiet"}
                </span>
              </div>
              <ChatPanel
                messages={messages}
                disabled={status !== "connected"}
                onSend={(text) => send({ type: "chat.guess", text })}
              />
            </section>
          </aside>
        </div>
      </main>

      {toast ? (
        <div className={`room-toast ${toast.error ? "is-error" : ""}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function ChatPanel({
  messages,
  disabled,
  onSend,
}: {
  messages: ChatEntry[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="room-chat">
      <div className="room-chat-list" ref={listRef} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="room-chat-empty">
            Say hello, call out a rival, or negotiate who gets the skyscraper.
          </p>
        ) : (
          messages.map((message) => (
            <p
              key={message.id}
              className={`room-chat-line ${message.system ? "is-system" : ""}`}
            >
              {message.system ? (
                message.text
              ) : (
                <>
                  <strong>{message.nickname}</strong>
                  <span>{message.text}</span>
                </>
              )}
            </p>
          ))
        )}
      </div>
      <form className="room-chat-form" onSubmit={submit}>
        <input
          className="room-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={MAX_CHAT_LENGTH}
          placeholder={disabled ? "Reconnecting…" : "Message the room"}
          disabled={disabled}
          autoComplete="off"
          aria-label="Room chat message"
        />
        <button
          type="submit"
          className="button button--lime"
          disabled={disabled || value.trim().length === 0}
        >
          Send
        </button>
      </form>
    </div>
  );
}

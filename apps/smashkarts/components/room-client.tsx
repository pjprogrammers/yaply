"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameSettings, SmashInput, SmashMatchSnapshot } from "@yaply/shared/types";
import type { ClientEvent, ServerEvent } from "@yaply/shared/events";
import {
  DEFAULT_GAME_SETTINGS,
  MAX_CHAT_LENGTH,
  MAX_NICKNAME_LENGTH,
  SMASH_DURATION_MAX_SECONDS,
  SMASH_DURATION_MIN_SECONDS,
  SMASH_KILL_TARGET_MAX,
  SMASH_KILL_TARGET_MIN,
  SMASH_MAX_PLAYERS,
  isSmashMapId,
} from "@yaply/shared/constants";
import { useGameRoom } from "@yaply/shared/react";
import type { ConnectionStatus } from "@yaply/shared/client";
import type { GameEngine } from "@/game/engine";
import { MAP_LIST } from "@/game/maps";
import { DURATION_OPTIONS, KILL_OPTIONS } from "@/lib/settings";
import {
  REALTIME_URL,
  inviteUrl,
  numberParam,
  readStoredNickname,
  storeNickname,
} from "@/lib/config";
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
]);

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
  failed: "Connection failed",
};

const SEAT_OPTIONS = [2, 4, 8, 16, 24, 40] as const;

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
  const map = params.get("map");
  return {
    ...DEFAULT_GAME_SETTINGS,
    maxPlayers: numberParam(
      params.get("max"),
      SMASH_MAX_PLAYERS,
      2,
      SMASH_MAX_PLAYERS,
    ),
    mapId: isSmashMapId(map) ? map : "foundry",
    killTarget: numberParam(
      params.get("kill"),
      DEFAULT_GAME_SETTINGS.killTarget ?? 20,
      SMASH_KILL_TARGET_MIN,
      SMASH_KILL_TARGET_MAX,
    ),
    durationSeconds: numberParam(
      params.get("duration"),
      DEFAULT_GAME_SETTINGS.durationSeconds ?? 300,
      SMASH_DURATION_MIN_SECONDS,
      SMASH_DURATION_MAX_SECONDS,
    ),
  };
}

export function RoomClient({ code }: { code: string }) {
  const searchParams = useSearchParams();
  const nameParam = (searchParams.get("name") ?? "").trim().slice(0, MAX_NICKNAME_LENGTH);
  const [joined, setJoined] = useState(nameParam.length > 0);
  const [gateName, setGateName] = useState(nameParam);
  const [gateError, setGateError] = useState("");
  const createdByHost = searchParams.get("host") === "1";

  const settings = useMemo(() => readHostSettings(searchParams), [searchParams]);

  useEffect(() => {
    if (joined || gateName) return;
    const stored = readStoredNickname();
    // localStorage is unavailable during hydration; fill the field once the
    // client has mounted instead of forcing a hydration-mismatched input value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setGateName(stored.slice(0, MAX_NICKNAME_LENGTH));
  }, [gateName, joined]);

  if (!joined) {
    const submit = (event: React.FormEvent) => {
      event.preventDefault();
      const next = gateName.trim();
      if (!next) {
        setGateError("Add a nickname first.");
        return;
      }
      storeNickname(next);
      setGateName(next);
      setJoined(true);
    };

    return (
      <div className="room-shell">
        <header className="room-bar margins">
          <Link href="/" className="nav-word">
            Smash Karts
          </Link>
          <span className="room-bar-code">{code.toUpperCase()}</span>
        </header>
        <main className="room-gate margins">
          <div className="room-card room-gate-card">
            <p className="room-eyebrow">Room {code.toUpperCase()}</p>
            <h1 className="display room-title">Join the scrap</h1>
            <p className="room-lede">
              Pick the name that will sit on the leaderboard. The room may already be racing —
              late arrivals are welcome.
            </p>
            <form onSubmit={submit}>
              <label className="lobby-field">
                <span>Nickname</span>
                <input
                  className="text-input"
                  value={gateName}
                  onChange={(event) => {
                    setGateName(event.target.value);
                    setGateError("");
                  }}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your driver name"
                  autoFocus
                  autoComplete="nickname"
                />
              </label>
              {gateError ? (
                <p className="text-sm font-bold text-[var(--signal)]" role="alert">
                  {gateError}
                </p>
              ) : null}
              <button type="submit" className="button button-primary mt-2 w-full">
                Join room
                <span aria-hidden="true">→</span>
              </button>
              <Link href="/play" className="button button-outline mt-2 w-full">
                Back to the garage
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
  const engineRef = useRef<GameEngine | null>(null);
  const seedRef = useRef<SmashMatchSnapshot | null>(null);
  const sendRef = useRef<(event: ClientEvent) => void>(() => undefined);
  const statusRef = useRef<ConnectionStatus>("connecting");

  const pushToast = useCallback((message: string, error = false) => {
    toastKey.current += 1;
    setToast({ key: toastKey.current, message, error });
  }, []);

  const handleEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case "smash.snapshot": {
        // Keep the newest relayed frame. A promoted host boots from this copy,
        // and a guest that has not mounted its engine yet can still seed later.
        seedRef.current = event.snapshot;
        engineRef.current?.applyRemoteSnapshot(event.snapshot);
        break;
      }
      case "smash.input": {
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
  }, [pushToast]);

  const {
    snapshot,
    status,
    playerId,
    error,
    send,
    leave,
    clearError,
  } = useGameRoom({
    baseUrl: REALTIME_URL,
    code,
    game: "smashkarts",
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

  const handleInput = useCallback((input: SmashInput) => {
    // GameSocket queues while offline. A stale burst of driving inputs on a
    // reconnect would arrive after the host already moved on, so only send
    // while the socket is actually live.
    if (statusRef.current === "connected") {
      sendRef.current({ type: "smash.input", input });
    }
  }, []);

  const sendSnapshot = useCallback((match: SmashMatchSnapshot) => {
    seedRef.current = match;
    // The final frame is the one message worth queueing. If the host crosses
    // the finish line mid-reconnect, the Worker still needs this snapshot to
    // end the match for everyone. Every other frame is disposable.
    if (match.phase === "over" || statusRef.current === "connected") {
      sendRef.current({ type: "smash.snapshot", snapshot: match });
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
          <Link href="/" className="nav-word">
            Smash Karts
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
            <div className="flex flex-col gap-2">
              <Link href="/play" className="button button-primary">
                Back to the garage
              </Link>
              <button
                type="button"
                className="button button-outline"
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
          <Link href="/" className="nav-word">
            Smash Karts
          </Link>
          <span className="room-bar-code">{code.toUpperCase()}</span>
        </header>
        <main className="room-gate margins">
          <div className="room-card room-gate-card">
            <span className="room-loader" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <p className="room-lede mt-4">Opening room {code.toUpperCase()}…</p>
          </div>
        </main>
      </div>
    );
  }

  const roomSettings = snapshot.settings;
  const me = snapshot.players.find((player) => player.id === playerId) ?? null;
  const isHost = snapshot.hostId === playerId;
  const connectedPlayers = snapshot.players.filter((player) => player.connected).length;
  const maxPlayers = roomSettings.maxPlayers ?? SMASH_MAX_PLAYERS;
  const map = MAP_LIST.find((entry) => entry.id === roomSettings.mapId) ?? MAP_LIST[0];
  const phase = snapshot.phase;
  const inMatch = phase === "playing" || phase === "game-over";
  const roomPlayers = snapshot.players.map((player) => ({
    id: player.id,
    name: player.nickname,
    color: player.color,
    connected: player.connected,
  }));
  const openSeats = Math.max(0, maxPlayers - snapshot.players.length);
  const showingSeats = Math.min(openSeats, 5);
  const canStart = isHost && connectedPlayers >= 2;
  const connectionLost =
    status === "reconnecting" || status === "disconnected" || status === "failed";

  if (inMatch && playerId && me) {
    return (
      <div className="room-arena-shell">
        <OnlineArena
          role={isHost ? "online-host" : "online-guest"}
          localPlayerId={playerId}
          round={snapshot.roundNumber}
          mapId={roomSettings.mapId ?? "foundry"}
          killTarget={roomSettings.killTarget ?? 20}
          duration={roomSettings.durationSeconds ?? 300}
          players={roomPlayers}
          seedRef={seedRef}
          engineRef={engineRef}
          onInput={handleInput}
          onSnapshot={sendSnapshot}
          canRematch={isHost}
          onRematch={() => send({ type: "game.rematch" })}
          onQuit={handleLeave}
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

  return (
    <div className="room-shell">
      <header className="room-bar margins">
        <Link href="/" className="nav-word">
          Smash Karts
        </Link>
        <div className="room-bar-meta">
          <span className="room-bar-code">{code.toUpperCase()}</span>
          <span className="room-status" data-status={status}>
            <span aria-hidden="true" />
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="room-bar-actions">
          <button type="button" className="button button-sm" onClick={copyInvite}>
            {copied ? "Copied" : "Copy invite"}
          </button>
          <button type="button" className="button button-outline button-sm" onClick={handleLeave}>
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
                <h1 className="display room-title">Waiting for the grid</h1>
                <p className="room-lede">
                  Share the code or link. Up to {SMASH_MAX_PLAYERS} drivers can pile in, and
                  anyone can join after the lights go out.
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
              <button type="button" className="button button-primary button-sm" onClick={copyInvite}>
                {copied ? "Link copied" : "Copy invite link"}
              </button>
            </div>

            <div className="room-roster-head">
              <span className="room-field-label">Drivers</span>
              <span className="room-roster-count">
                {connectedPlayers} connected
                {snapshot.players.length > connectedPlayers
                  ? ` · ${snapshot.players.length - connectedPlayers} away`
                  : ""}
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
                    aria-hidden="true"
                  />
                  <span className="room-player-body">
                    <span className="room-player-name">
                      {player.nickname}
                      {player.id === playerId ? " · you" : ""}
                    </span>
                    <span className="room-player-sub">
                      {player.score} wreck{player.score === 1 ? "" : "s"}
                      {player.connected ? "" : " · away"}
                    </span>
                  </span>
                  {player.id === snapshot.hostId ? (
                    <span className="room-player-tag">Host</span>
                  ) : null}
                </div>
              ))}
              {Array.from({ length: showingSeats }).map((_, index) => (
                <div key={`empty-${index}`} className="room-player is-empty">
                  <span className="room-player-swatch" aria-hidden="true" />
                  <span className="room-player-body">
                    <span className="room-player-name">Open seat</span>
                    <span className="room-player-sub">Waiting on a friend</span>
                  </span>
                </div>
              ))}
            </div>
            {openSeats > showingSeats ? (
              <p className="room-open-note">
                + {openSeats - showingSeats} more open seat
                {openSeats - showingSeats === 1 ? "" : "s"}
              </p>
            ) : null}

            <div className="room-start">
              {isHost ? (
                <>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={!canStart}
                    onClick={() => send({ type: "room.start" })}
                  >
                    Start match
                    <span aria-hidden="true">→</span>
                  </button>
                  <p className="room-note">
                    {canStart
                      ? `${connectedPlayers} drivers on the grid. Start whenever you are ready.`
                      : "At least two connected drivers are needed to start."}
                  </p>
                </>
              ) : (
                <>
                  <span className="room-waiting">Waiting for the host to start</span>
                  <p className="room-note">
                    The host sets the arena and starts the match. Late arrivals are welcome.
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
                <span className="room-field-label">Arena</span>
                {isHost ? (
                  <div className="choice-row">
                    {MAP_LIST.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`choice ${roomSettings.mapId === entry.id ? "is-active" : ""}`}
                        aria-pressed={roomSettings.mapId === entry.id}
                        onClick={() => writeSettings({ mapId: entry.id })}
                      >
                        {entry.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="room-setting-value">{map.name}</span>
                )}
                <span className="room-setting-hint">{map.tagline}</span>
              </div>

              <div className="room-setting">
                <span className="room-field-label">Wrecks to win</span>
                {isHost ? (
                  <div className="choice-row">
                    {KILL_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`choice ${roomSettings.killTarget === value ? "is-active" : ""}`}
                        aria-pressed={roomSettings.killTarget === value}
                        onClick={() => writeSettings({ killTarget: value })}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="room-setting-value">{roomSettings.killTarget ?? 20}</span>
                )}
              </div>

              <div className="room-setting">
                <span className="room-field-label">Match clock</span>
                {isHost ? (
                  <div className="choice-row">
                    {DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`choice ${
                          (roomSettings.durationSeconds ?? 300) === option.value ? "is-active" : ""
                        }`}
                        aria-pressed={(roomSettings.durationSeconds ?? 300) === option.value}
                        onClick={() => writeSettings({ durationSeconds: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="room-setting-value">
                    {Math.round((roomSettings.durationSeconds ?? 300) / 60)} min
                  </span>
                )}
              </div>

              <div className="room-setting">
                <span className="room-field-label">Seats</span>
                {isHost ? (
                  <div className="choice-row">
                    {SEAT_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`choice ${maxPlayers === value ? "is-active" : ""}`}
                        aria-pressed={maxPlayers === value}
                        onClick={() =>
                          writeSettings({ maxPlayers: Math.max(value, snapshot.players.length) })
                        }
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="room-setting-value">{maxPlayers}</span>
                )}
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
            Say hello, call out a rival, or plan the next pile-up.
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
          className="text-input"
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
          className="button button-primary button-sm"
          disabled={disabled || value.trim().length === 0}
        >
          Send
        </button>
      </form>
    </div>
  );
}

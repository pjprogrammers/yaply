"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameSettings, Ranking, Stroke } from "@yaply/shared/types";
import type { ServerEvent } from "@yaply/shared/events";
import {
  DEFAULT_GAME_SETTINGS,
  isWordLanguage,
  MAX_NICKNAME_LENGTH,
  SKRIBBL_DEFAULT_MAX_PLAYERS,
  SKRIBBL_MAX_PLAYERS,
} from "@yaply/shared/constants";
import { useCountdown, useGameRoom, useNow } from "@yaply/shared/react";
import {
  findOpenRoom,
  inviteUrl,
  numberParam,
  readStoredNickname,
  REALTIME_URL,
  storeNickname,
} from "@/lib/config";
import { classifyChatEvent } from "@/lib/chat-message";
import type { ChatMessage } from "@/lib/chat-message";
import { DrawingCanvas } from "./drawing-canvas";
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  PlayIcon,
  ThumbDownIcon,
  ThumbUpIcon,
  XIcon,
} from "./icons";
import { Leaderboard } from "./leaderboard";
import { MatchChat } from "./match-chat";
import { RoomSettingsFields } from "./room-settings";
import { Topbar } from "./topbar";
import { MAIN_URL } from "@/lib/config";

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

/** Play should silently move to the next room instead of showing these. */
const PLAY_RETRY_CODES = new Set(["ROOM_FULL", "ROOM_NOT_FOUND", "ROOM_NOT_RESERVED"]);

function playRoomHref(code: string, name: string, host: boolean): string {
  const params = new URLSearchParams({
    name,
    play: "1",
    vis: "public",
    max: String(SKRIBBL_DEFAULT_MAX_PLAYERS),
  });
  if (host) params.set("host", "1");
  return `/room/${code}?${params.toString()}`;
}

type VirtualKeyboardLike = {
  overlaysContent: boolean;
  readonly boundingRect: DOMRectReadOnly;
  addEventListener: (type: "geometrychange", listener: () => void) => void;
  removeEventListener: (type: "geometrychange", listener: () => void) => void;
};

const DRAW_COLORS = ["#000000", "#e22b2b", "#2a9d3c", "#2666e2", "#f2c200", "#a44ce0", "#8a8a8a", "#ffffff"];
const DRAW_WIDTH = 8;
const CHOOSE_SECONDS = 20;

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
  failed: "Connection failed",
};

type RoundResult = {
  word: string;
  reason: string;
  rankings: Ranking[];
};

type Finished = {
  rankings: Ranking[];
  winnerId?: string;
};

type Toast = {
  message: string;
  error?: boolean;
};

function mergeStrokes(previous: Stroke[], incoming: Stroke[]): Stroke[] {
  if (incoming.length === 0) return previous;
  const byId = new Map(incoming.map((stroke) => [stroke.id, stroke]));
  for (const stroke of previous) {
    const next = byId.get(stroke.id);
    if (!next) {
      byId.set(stroke.id, stroke);
    } else if (stroke.points.length > next.points.length) {
      byId.set(stroke.id, stroke);
    }
  }
  return [...byId.values()];
}

function reasonLabel(reason: string): string {
  if (reason === "all-guessed") return "everyone guessed";
  if (reason === "timeout") return "time ran out";
  if (reason === "drawer-disconnected") return "the drawer left";
  return "round complete";
}

export function RoomClient({ code }: { code: string }) {
  const searchParams = useSearchParams();
  const nameParam = (searchParams.get("name") ?? "").trim();
  const [joined, setJoined] = useState(nameParam.length > 0);
  const [gateName, setGateName] = useState(nameParam);

  useEffect(() => {
    const stored = readStoredNickname();
    if (!stored) return;
    // Hydrate the saved name once. Clearing the field afterwards must stay
    // empty instead of being refilled on every render.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during hydration
    setGateName((current) => current || stored);
  }, []);

  const isHost = searchParams.get("host") === "1";
  const playMode = searchParams.get("play") === "1";
  const settings = useMemo<GameSettings>(() => {
    const language = searchParams.get("lang");
    const mode = searchParams.get("mode");
    const theme = searchParams.get("theme");
    return {
      ...DEFAULT_GAME_SETTINGS,
      rounds: numberParam(searchParams.get("rounds"), DEFAULT_GAME_SETTINGS.rounds, 1, 10),
      drawingTimeSeconds: numberParam(
        searchParams.get("time"),
        DEFAULT_GAME_SETTINGS.drawingTimeSeconds,
        30,
        180,
      ),
      wordCount: numberParam(searchParams.get("words"), DEFAULT_GAME_SETTINGS.wordCount ?? 3, 2, 5),
      maxPlayers: numberParam(
        searchParams.get("max"),
        SKRIBBL_DEFAULT_MAX_PLAYERS,
        2,
        SKRIBBL_MAX_PLAYERS,
      ),
      language: isWordLanguage(language) ? language : DEFAULT_GAME_SETTINGS.language,
      skribblMode: mode === "dark" ? "dark" : "light",
      skribblTheme: theme === "classic" ? "classic" : "paper",
      visibility: searchParams.get("vis") === "public" ? "public" : "private",
    };
  }, [searchParams]);

  if (!joined) {
    const submit = (event: React.FormEvent) => {
      event.preventDefault();
      const next = gateName.trim() || "Player";
      storeNickname(next);
      setGateName(next);
      setJoined(true);
    };

    return (
      <div className="app-shell">
        <Topbar compact />
        <main className="join-gate">
          <div className="join-gate-card">
            <p className="eyebrow">Room {code.toUpperCase()}</p>
            <h1>Join this Skribbl room</h1>
            <p>Pick the name your friends will see on the scoreboard.</p>
            <form className="join-gate-form" onSubmit={submit}>
              <label className="field">
                <span className="field-label">Nickname</span>
                <input
                  className="input"
                  value={gateName}
                  onChange={(event) => setGateName(event.target.value)}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your name"
                  autoFocus
                />
              </label>
              <button className="btn btn--primary btn--block" type="submit">
                Join room
              </button>
              <Link href="/" className="btn btn--ghost btn--block">
                Back to home
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
      isHost={isHost}
      playMode={playMode}
      initialSettings={settings}
    />
  );
}

function ConnectedRoom({
  code,
  nickname,
  isHost: createdByHost,
  playMode,
  initialSettings,
}: {
  code: string;
  nickname: string;
  isHost: boolean;
  playMode: boolean;
  initialSettings: GameSettings;
}) {
  const router = useRouter();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [choices, setChoices] = useState<{ id: string; display: string }[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playRetryFailed, setPlayRetryFailed] = useState(false);
  const playRetryRef = useRef(false);
  const [color, setColor] = useState(DRAW_COLORS[0]);
  // A reaction belongs to one drawing turn. Tracking the turn key instead of a
  // plain boolean lets the buttons come back automatically on the next turn.
  const [reactedTurn, setReactedTurn] = useState<string | null>(null);
  const width = DRAW_WIDTH;

  const now = useNow(250);
  const playerIdRef = useRef<string | null>(null);

  const handleEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case "chat.message": {
        const msgType = event.kind ?? (event.system ? classifyChatEvent(event.text) : "normal");
        setMessages((previous) => [
          ...previous.slice(-90),
          {
            id: crypto.randomUUID(),
            playerId: event.playerId,
            nickname: event.nickname,
            text: event.text,
            system: event.system,
            type: msgType,
            private: event.private,
          },
        ]);
        break;
      }
      case "game.word.choices": {
        setChoices(event.choices);
        break;
      }
      case "game.word.selected": {
        setSelectedWord(event.word);
        setChoices([]);
        break;
      }
      case "drawing.stroke": {
        if (event.playerId === playerIdRef.current) break;
        setStrokes((previous) => {
          const index = previous.findIndex((stroke) => stroke.id === event.strokeId);
          if (index === -1) {
            return [
              ...previous,
              {
                id: event.strokeId,
                playerId: event.playerId,
                color: event.color,
                width: event.width,
                points: event.points,
              },
            ];
          }
          if (event.points.length === 0) return previous;
          const next = [...previous];
          const stroke = next[index];
          next[index] = { ...stroke, points: [...stroke.points, ...event.points] };
          return next;
        });
        break;
      }
      case "drawing.undo": {
        setStrokes((previous) => previous.filter((stroke) => stroke.id !== event.strokeId));
        break;
      }
      case "drawing.clear": {
        setStrokes([]);
        break;
      }
      case "game.round.ended": {
        setRoundResult({ word: event.word, reason: event.reason, rankings: event.rankings });
        setChoices([]);
        setSelectedWord(null);
        break;
      }
      case "game.finished": {
        setFinished({ rankings: event.rankings, winnerId: event.winnerId });
        setChoices([]);
        break;
      }
      case "room.error": {
        setToast({ message: event.message, error: true });
        break;
      }
      default:
        break;
    }
  }, []);

  const { snapshot, status, playerId, error, send, leave, clearError } = useGameRoom({
    baseUrl: REALTIME_URL,
    code,
    game: "skribbl",
    nickname,
    create: createdByHost,
    settings: initialSettings,
    onEvent: handleEvent,
  });

  playerIdRef.current = playerId;

  const reactionTurnKey = snapshot ? `${snapshot.roundNumber}:${snapshot.drawerId ?? ""}` : "";
  const hasReactedThisTurn = reactedTurn !== null && reactedTurn === reactionTurnKey;
  const me = snapshot?.players.find((player) => player.id === playerId) ?? null;
  const isHost = snapshot ? snapshot.hostId === playerId : createdByHost;
  const isDrawer = snapshot?.drawerId === playerId;
  const phase = snapshot?.phase ?? "lobby";
  const roomSettings = snapshot?.settings ?? initialSettings;
  const roomMode = roomSettings.skribblMode === "dark" ? "dark" : "light";
  const roomTheme = roomSettings.skribblTheme === "classic" ? "classic" : "paper";
  const drawer = snapshot?.players.find((player) => player.id === snapshot.drawerId) ?? null;
  const remaining = useCountdown(snapshot?.endsAt ?? null, now);
  const fatal = error && FATAL_CODES.has(error.code) ? error : null;

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const virtualKeyboard = (
      navigator as Navigator & { virtualKeyboard?: VirtualKeyboardLike }
    ).virtualKeyboard;
    let frame = 0;
    let typing = false;

    // Chromium with interactive-widget=overlays-content deliberately leaves
    // the visual viewport at full height, so ask the VirtualKeyboard API for
    // the covered area. Safari (and anything without the API) falls back to
    // the visualViewport shrink below.
    try {
      if (virtualKeyboard) virtualKeyboard.overlaysContent = true;
    } catch {
      // Non-secure contexts or embedded frames may refuse the opt-in.
    }

    const setInset = (inset: number) => {
      root.style.setProperty("--keyboard-inset", `${Math.max(0, Math.round(inset))}px`);
    };

    // Keep the chat input above the soft keyboard while it is being used, but
    // put it back on the bottom edge as soon as the keyboard goes away. The
    // small cutoff ignores browser-chrome differences and stale iOS viewport
    // values that would otherwise leave a permanent gap.
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!typing) {
          setInset(0);
          return;
        }
        const keyboardHeight = virtualKeyboard?.boundingRect.height ?? 0;
        const covered = viewport
          ? window.innerHeight - viewport.height - viewport.offsetTop
          : 0;
        const inset = Math.max(keyboardHeight, covered);
        setInset(inset >= 100 ? inset : 0);
      });
    };

    const isChatInput = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest(".match-page .chat input"));

    const onFocusIn = (event: FocusEvent) => {
      if (!isChatInput(event.target)) return;
      typing = true;
      sync();
    };

    const onFocusOut = (event: FocusEvent) => {
      if (!isChatInput(event.target)) return;
      typing = false;
      setInset(0);
    };

    sync();
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    virtualKeyboard?.addEventListener("geometrychange", sync);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      virtualKeyboard?.removeEventListener("geometrychange", sync);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    if (FATAL_CODES.has(error.code)) return;
    setToast({ message: error.message, error: true });
    clearError();
  }, [clearError, error]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const retryablePlayError =
    playMode && fatal !== null && PLAY_RETRY_CODES.has(fatal.code);

  useEffect(() => {
    if (!retryablePlayError || playRetryRef.current) return;
    playRetryRef.current = true;
    let cancelled = false;
    findOpenRoom()
      .then((room) => {
        if (cancelled) return;
        router.replace(playRoomHref(room.code, nickname, room.host));
      })
      .catch(() => {
        if (!cancelled) setPlayRetryFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [nickname, retryablePlayError, router]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);

  useEffect(() => {
    if (!snapshot) return;

    if (snapshot.phase === "lobby") {
      setStrokes([]);
      setChoices([]);
      setSelectedWord(null);
      setRoundResult(null);
      setFinished(null);
      return;
    }

    if (snapshot.phase === "choosing") {
      setStrokes([]);
      setSelectedWord(null);
      setRoundResult(null);
      setFinished(null);
      // Don't clear `choices` here. The server sends the private "game.word.choices"
      // event just before the choosing snapshot, so clearing on the phase change
      // would wipe the options the drawer just received. Stale choices are already
      // cleared when the round starts drawing and when the round ends.
      return;
    }

    if (snapshot.phase === "drawing") {
      setRoundResult(null);
      setFinished(null);
      setChoices([]);
      setStrokes((previous) => mergeStrokes(previous, snapshot.strokes));
      return;
    }

    if (snapshot.phase === "round-result") {
      setChoices([]);
      setSelectedWord(null);
      setFinished(null);
      return;
    }

    if (snapshot.phase === "game-over") {
      setChoices([]);
      setSelectedWord(null);
      setRoundResult(null);
      setStrokes([]);
    }
  }, [snapshot]);

  const handleLocalStroke = useCallback(
    (strokeId: string, points: { x: number; y: number }[], done: boolean) => {
      if (points.length > 0) {
        setStrokes((previous) => {
          const index = previous.findIndex((stroke) => stroke.id === strokeId);
          if (index === -1) {
            return [
              ...previous,
              {
                id: strokeId,
                playerId: playerIdRef.current ?? "me",
                color,
                width,
                points,
              },
            ];
          }
          const next = [...previous];
          const stroke = next[index];
          next[index] = { ...stroke, points: [...stroke.points, ...points] };
          return next;
        });
      }
      send({ type: "drawing.stroke", strokeId, color, width, points, done });
    },
    [color, send, width],
  );

  const updateSettings = (patch: Partial<GameSettings>) => {
    send({ type: "room.settings.update", settings: patch });
  };

  const copyInvite = async () => {
    const url = inviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access can be blocked; the URL is still visible below.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleLeave = () => {
    leave();
    router.push("/");
  };

  const start = () => {
    if (!snapshot || snapshot.players.length < 2) {
      setToast({ message: "At least two players are needed to start.", error: true });
      return;
    }
    send({ type: "room.start" });
  };

  const rematch = () => send({ type: "game.rematch" });

  const rankings = finished?.rankings ?? snapshot?.rankings ?? [];
  const winnerId = finished?.winnerId ?? snapshot?.winnerId ?? rankings[0]?.playerId;
  const winner = rankings.find((entry) => entry.playerId === winnerId);
  const letterCount = (snapshot?.maskedWord ?? "").replace(/\s/g, "").length;

  if (!snapshot && retryablePlayError && !playRetryFailed) {
    return (
      <div className="app-shell">
        <Topbar compact />
        <main className="join-gate">
          <div className="loading-card">
            <span className="dot-pulse" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {(fatal?.code === "ROOM_FULL"
              ? "That room just filled up. "
              : "That room just closed. ") + "Finding the next open room…"}
          </div>
        </main>
      </div>
    );
  }

  const playRetryExhausted =
    playMode && retryablePlayError && playRetryFailed;

  if (!snapshot && (fatal || status === "failed")) {
    return (
      <div className="app-shell">
        <Topbar compact />
        <main className="join-gate">
          <div className="error-card">
            <p className="eyebrow">Room {code.toUpperCase()}</p>
            <h1>{playRetryExhausted ? "No open room found" : "Could not open this room"}</h1>
            <p>{fatal?.message ?? "The realtime server could not be reached. Check the connection and try again."}</p>
            <div className="error-actions">
              <Link href={playRetryExhausted ? "/play" : "/"} className="btn btn--primary">
                {playRetryExhausted ? "Try Play again" : "Back to home"}
              </Link>
              <button className="btn btn--ghost" type="button" onClick={() => window.location.reload()}>
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
      <div className="app-shell">
        <Topbar compact />
        <main className="join-gate">
          <div className="loading-card">
            <span className="dot-pulse" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            Joining room {code.toUpperCase()}…
          </div>
        </main>
      </div>
    );
  }

  const isLobby = phase === "lobby";
  const emptySlots = isLobby
    ? Math.max(0, Math.min(SKRIBBL_MAX_PLAYERS, roomSettings.maxPlayers) - snapshot.players.length)
    : 0;

  const connectionBanner =
    (status === "reconnecting" || status === "disconnected" || status === "failed") && (
      <div className="connection-banner">
        <span>Connection lost. Rejoining the room…</span>
        <button type="button" onClick={() => window.location.reload()}>
          Reload now
        </button>
      </div>
    );

  const settingsModal = settingsOpen ? (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setSettingsOpen(false);
      }}
    >
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-settings-title"
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Room {code.toUpperCase()}</p>
            <h2 id="room-settings-title" className="card-title">
              Room settings
            </h2>
          </div>
          <button
            className="icon-btn"
            type="button"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close settings"
          >
            <XIcon size={16} />
          </button>
        </div>
        <RoomSettingsFields
          settings={roomSettings}
          isHost={isHost}
          onChange={updateSettings}
          maxPlayersFloor={snapshot.players.length}
          visibilityLocked={!isLobby}
        />
        <p className="modal-note">
          {isHost ? "Changes apply from the next round." : "Only the host can change these settings."}
        </p>
        <div className="modal-actions">
          <button className="btn btn--ghost" type="button" onClick={copyInvite}>
            {copied ? "Copied!" : "Copy invite"}
          </button>
          <button className="btn btn--ghost" type="button" onClick={handleLeave}>
            Leave room
          </button>
          <a className="btn btn--ghost" href={MAIN_URL}>
            Main Yaply page
          </a>
        </div>
      </section>
    </div>
  ) : null;

  const toastView = toast ? (
    <div className={`toast ${toast.error ? "toast--error" : ""}`} role="status">
      {toast.message}
    </div>
  ) : null;

  if (isLobby) {
    return (
      <div className="app-shell app-shell--room app-shell--lobby">
        <Topbar>
          <div className="room-bar">
            <div>
              <div className="room-bar-label">Room</div>
              <div className="room-code">{code.toUpperCase()}</div>
            </div>
            <span className="status" title={`Connection: ${STATUS_LABEL[status] ?? status}`}>
              <span className="status-dot" data-status={status} />
              {STATUS_LABEL[status] ?? status}
            </span>
            <div className="room-bar-actions">
              <button className="btn btn--sm" type="button" onClick={copyInvite}>
                {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                {copied ? "Copied" : "Copy invite"}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={handleLeave}>
                Leave
              </button>
              <a className="btn btn--ghost btn--sm" href={MAIN_URL}>
                Main Yaply page
              </a>
            </div>
          </div>
        </Topbar>

        <main className="page page--game page--lobby">
          {connectionBanner}

          <div className="lobby-grid">
            <section className="card">
              <div className="page-head">
                <div className="page-head-copy">
                  <p className="eyebrow">Skribbl room</p>
                  <h1 className="room-title">Waiting for players</h1>
                  <p className="subline">
                    Share the code or the invite link. The host starts the game once at least two
                    people are in.
                  </p>
                </div>
                <span className="pill">
                  {snapshot.players.length} / {roomSettings.maxPlayers}
                </span>
              </div>

              <div className="card card--inset">
                <p className="eyebrow">Room code</p>
                <div className="code-row">
                  <span className="room-code">{code.toUpperCase()}</span>
                  <button className="btn btn--sm" type="button" onClick={copyInvite}>
                    {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
                <p className="invite-url" style={{ marginTop: 8 }}>
                  {inviteUrl(code)}
                </p>
              </div>

              <div className="lobby-list" style={{ marginTop: 18 }}>
                <Leaderboard
                  players={snapshot.players}
                  meId={playerId}
                  hostId={snapshot.hostId}
                  emptySlots={emptySlots}
                  title="Players in the room"
                  countLabel={`${snapshot.players.length} joined`}
                />
              </div>
            </section>

            <aside className="rail">
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Room settings</h2>
                  {isHost ? <span className="pill">Host</span> : <span className="pill">Host sets these</span>}
                </div>
                <RoomSettingsFields
                  settings={roomSettings}
                  isHost={isHost}
                  onChange={updateSettings}
                  maxPlayersFloor={snapshot.players.length}
                />
              </section>

              <section className="card">
                {isHost ? (
                  <button
                    className="btn btn--primary btn--block btn--lg"
                    type="button"
                    onClick={start}
                    disabled={snapshot.players.length < 2}
                  >
                    <PlayIcon size={15} />
                    Start game
                  </button>
                ) : (
                  <div className="banner">
                    <ClockIcon size={14} />
                    Waiting for the host to start
                  </div>
                )}
                <p className="lobby-note" style={{ marginTop: 10 }}>
                  {snapshot.players.length < 2
                    ? "One more player is needed before the first round."
                    : isHost
                      ? "Everyone in the room is ready. Start when you are."
                      : "The room code is in the top bar. Invite anyone you want in the next round."}
                </p>
              </section>
            </aside>
          </div>
        </main>

        {settingsModal}
        {toastView}
      </div>
    );
  }

  const sortedPlayers = [...snapshot.players].sort(
    (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname),
  );
  const canDraw = Boolean(isDrawer && phase === "drawing");

  const hintLabel =
    phase === "round-result"
      ? "The word was"
      : phase === "game-over"
        ? "Final scores"
        : isDrawer
          ? "Your word"
          : "Guess this";

  const hintText =
    phase === "game-over"
      ? winner
        ? `${winner.nickname} wins`
        : "Game over"
      : phase === "round-result"
        ? roundResult?.word ?? snapshot.maskedWord ?? ""
        : isDrawer
          ? selectedWord ?? ""
          : snapshot.maskedWord ?? "";

  const showLetterCount = !isDrawer && phase === "drawing" && letterCount > 0;
  const hintWords = showLetterCount
    ? hintText.trim().split(/\s+/).filter(Boolean)
    : [];

  return (
    <div className="match-page" data-room-theme={roomTheme} data-room-mode={roomMode}>
      <div className="match-logo">Yaply Skribbl</div>

      <div className="match-bar">
        <label>
          Room:
          <button className="match-room-code" type="button" onClick={copyInvite} title="Copy invite link">
            {code.toUpperCase()}
          </button>
        </label>
        <button type="button" onClick={copyInvite}>
          {copied ? "Copied!" : "Copy invite"}
        </button>
        <button type="button" onClick={handleLeave}>
          Leave
        </button>
        <a href={MAIN_URL}>Main Yaply page</a>
        <span className="match-bar-note">
          <span className="status-dot" data-status={status} />
          {STATUS_LABEL[status] ?? status}
          <span aria-hidden>·</span>
          {snapshot.players.length}/{roomSettings.maxPlayers} players
        </span>
      </div>

      {connectionBanner}

      <div className="game">
        <div className="top">
          <div className="clockbox">
            <div className="clock" role="timer" aria-label={`${remaining} seconds left`}>
              {snapshot.endsAt ? remaining : "–"}
            </div>
            <div className="round">
              Round {Math.max(1, snapshot.roundNumber)} of {roomSettings.rounds}
            </div>
          </div>

          <div className="hint">
            <small>{hintLabel}</small>
            {showLetterCount ? (
              <span className="hint-words">
                {hintWords.map((word, index) => (
                  <span className="hint-word" key={`${index}-${word}`}>
                    <b>{word}</b>
                    <span className="hint-count" aria-label={`${word.length} letters`}>
                      {word.length}
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              <b>{hintText || "…"}</b>
            )}
          </div>

          <button
            className="gear"
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Room settings"
            title="Room settings"
          >
            ⚙
          </button>
        </div>

        <div className="players" aria-label="Players">
          {sortedPlayers.map((player) => {
            const rank = 1 + snapshot.players.filter((entry) => entry.score > player.score).length;
            return (
              <div
                key={player.id}
                className={[
                  "p",
                  player.id === playerId ? "me" : "",
                  player.guessedCorrectly ? "guessed" : "",
                  !player.connected ? "out" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={player.nickname}
              >
                <span className="rank">#{rank}</span>
                <div className="info">
                  <span className="nm">
                    {player.nickname}
                    {player.id === playerId ? " (You)" : ""}
                  </span>
                  <span className="pt">{player.score} points</span>
                </div>
                {player.id === snapshot.drawerId && (
                  <span className="pen" aria-label="Drawing">
                    ✏️
                  </span>
                )}
                <div className="av" style={{ background: player.color }} aria-hidden />
              </div>
            );
          })}
        </div>

        <div className="canvaswrap">
          {!isDrawer && !hasReactedThisTurn && (
            <div className="thumbs" role="group" aria-label="Rate the drawing">
              <button
                type="button"
                className="thumb thumb--up"
                aria-label="Like the drawing"
                title="Like the drawing"
                disabled={phase !== "drawing" || status !== "connected"}
                onClick={() => {
                  if (phase !== "drawing" || status !== "connected") return;
                  setReactedTurn(reactionTurnKey);
                  send({ type: "chat.reaction", reaction: "like" });
                }}
              >
                <ThumbUpIcon size={26} />
              </button>
              <button
                type="button"
                className="thumb thumb--down"
                aria-label="Dislike the drawing"
                title="Dislike the drawing"
                disabled={phase !== "drawing" || status !== "connected"}
                onClick={() => {
                  if (phase !== "drawing" || status !== "connected") return;
                  setReactedTurn(reactionTurnKey);
                  send({ type: "chat.reaction", reaction: "dislike" });
                }}
              >
                <ThumbDownIcon size={26} />
              </button>
            </div>
          )}

          <DrawingCanvas
            strokes={strokes}
            canDraw={canDraw}
            color={color}
            width={width}
            onStroke={handleLocalStroke}
            overlay={
              phase === "choosing" ? (
                isDrawer ? (
                  <div className="choice-panel">
                    <p className="eyebrow">Choose a word</p>
                    <div className="choice-list">
                      {choices.length === 0 ? (
                        <div className="empty">Loading word choices…</div>
                      ) : (
                        choices.map((choice) => (
                          <button
                            key={choice.id}
                            className="choice"
                            type="button"
                            onClick={() => send({ type: "game.word.choose", wordId: choice.id })}
                          >
                            {choice.display}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="overlay-card">
                    <p className="eyebrow">Round {Math.max(1, snapshot.roundNumber)}</p>
                    <p className="overlay-title">
                      {drawer?.nickname ?? "The drawer"} is choosing a word
                    </p>
                    <p className="overlay-sub">
                      The clock gives them {snapshot.endsAt ? remaining : CHOOSE_SECONDS} seconds.
                      Get ready to guess.
                    </p>
                  </div>
                )
              ) : phase === "round-result" ? (
                <div className="round-reveal">
                  <p className="eyebrow">
                    Round {Math.max(1, snapshot.roundNumber)} ·{" "}
                    {reasonLabel(roundResult?.reason ?? "timeout")}
                  </p>
                  <p className="round-word">{roundResult?.word ?? snapshot.maskedWord}</p>
                  <div className="round-rankings">
                    {(roundResult?.rankings ?? snapshot.rankings ?? []).slice(0, 5).map((entry, index) => (
                      <div className="round-rank-row" key={entry.playerId}>
                        <span className="rank">{index + 1}</span>
                        <span className="rank-name">{entry.nickname}</span>
                        <span className="rank-score">{entry.score}</span>
                      </div>
                    ))}
                  </div>
                  <p className="muted small">Next turn starts automatically.</p>
                </div>
              ) : phase === "game-over" ? (
                <div className="overlay-card">
                  <p className="eyebrow">Game over</p>
                  <p className="overlay-title">
                    {winner ? `${winner.nickname} wins` : "Final scores"}
                  </p>
                  <p className="overlay-sub">
                    {rankings.length} players · {roomSettings.rounds} rounds played
                  </p>
                  <div className="result-rankings">
                    {rankings.map((entry, index) => (
                      <div
                        className={`result-rank-row ${entry.playerId === winnerId ? "result-rank-row--winner" : ""}`}
                        key={entry.playerId}
                      >
                        <span className="rank">{index + 1}</span>
                        <span className="result-rank-name">
                          {entry.nickname}
                          {entry.playerId === playerId ? " (you)" : ""}
                        </span>
                        <span className="result-rank-score">{entry.score}</span>
                      </div>
                    ))}
                  </div>
                  <div className="overlay-actions">
                    {isHost ? (
                      <button className="btn btn--primary" type="button" onClick={rematch}>
                        <PlayIcon size={14} />
                        Rematch
                      </button>
                    ) : (
                      <span className="muted small">Waiting for the host to start a rematch.</span>
                    )}
                    <button className="btn btn--ghost" type="button" onClick={handleLeave}>
                      Leave room
                    </button>
                    <a className="btn btn--ghost" href={MAIN_URL}>
                      Main Yaply page
                    </a>
                  </div>
                </div>
              ) : null
            }
            overlayClear={phase === "round-result"}
          />

          <div className="tools" role="group" aria-label="Drawing tools">
            <div className="tool-swatches">
              {DRAW_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className="sw"
                  style={{ background: swatch }}
                  aria-label={`Use ${swatch}`}
                  aria-pressed={color === swatch}
                  disabled={!canDraw}
                  onClick={() => {
                    if (canDraw) setColor(swatch);
                  }}
                />
              ))}
            </div>
            <div className="tool-actions">
              <button
                className="tool-btn"
                type="button"
                disabled={!canDraw}
                onClick={() => {
                  if (canDraw) send({ type: "drawing.undo" });
                }}
              >
                Undo
              </button>
              <button
                className="tool-btn tool-btn--clear"
                type="button"
                disabled={!canDraw}
                onClick={() => {
                  if (canDraw) send({ type: "drawing.clear" });
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <MatchChat
          messages={messages}
          onSend={(text) => send({ type: "chat.guess", text })}
          disabled={status !== "connected"}
          placeholder={
            phase === "drawing"
              ? isDrawer
                ? "You are drawing - secret chat..."
                : me?.guessedCorrectly
                  ? "You guessed it - secret chat..."
                  : "Type your guess here..."
              : "Type your guess here..."
          }
        />
      </div>

      {settingsModal}
      {toastView}
    </div>
  );
}

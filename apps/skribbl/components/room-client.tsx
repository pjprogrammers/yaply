"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameSettings, Ranking, Stroke } from "@yaply/shared/types";
import type { ServerEvent } from "@yaply/shared/events";
import { DEFAULT_GAME_SETTINGS, MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import { useCountdown, useGameRoom, useNow } from "@yaply/shared/react";
import {
  inviteUrl,
  numberParam,
  readStoredNickname,
  REALTIME_URL,
  storeNickname,
} from "@/lib/config";
import { Chat, type ChatMessage } from "./chat";
import { DrawingCanvas } from "./drawing-canvas";
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  PlayIcon,
  TrashIcon,
  UndoIcon,
} from "./icons";
import { PlayerList } from "./player-list";
import { Segmented } from "./segmented";
import { Topbar } from "./topbar";
import { WordMask } from "./word-mask";

const FATAL_CODES = new Set([
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_EXISTS",
  "ROOM_NOT_RESERVED",
  "GAME_MISMATCH",
  "ROOM_IN_PROGRESS",
  "RESUME_FAILED",
]);

const DRAW_COLORS = ["#111111", "#6b6b6b", "#e5484d", "#4cb3f0", "#3fc07a", "#f2b33d", "#b06cf0"];
const DRAW_WIDTHS = [4, 8, 16];
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
  const [gateError, setGateError] = useState("");

  useEffect(() => {
    if (joined || gateName) return;
    const stored = readStoredNickname();
    if (stored) setGateName(stored);
  }, [gateName, joined]);

  const isHost = searchParams.get("host") === "1";
  const settings = useMemo<GameSettings>(
    () => ({
      ...DEFAULT_GAME_SETTINGS,
      rounds: numberParam(searchParams.get("rounds"), DEFAULT_GAME_SETTINGS.rounds, 1, 10),
      drawingTimeSeconds: numberParam(
        searchParams.get("time"),
        DEFAULT_GAME_SETTINGS.drawingTimeSeconds,
        30,
        180,
      ),
      wordCount: numberParam(searchParams.get("words"), DEFAULT_GAME_SETTINGS.wordCount ?? 3, 2, 5),
      maxPlayers: numberParam(searchParams.get("max"), DEFAULT_GAME_SETTINGS.maxPlayers, 2, 12),
    }),
    [searchParams],
  );

  if (!joined) {
    const submit = (event: React.FormEvent) => {
      event.preventDefault();
      const next = gateName.trim();
      if (next.length < 1) {
        setGateError("Add a nickname first.");
        return;
      }
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
                  onChange={(event) => {
                    setGateName(event.target.value);
                    setGateError("");
                  }}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your name"
                  autoFocus
                />
              </label>
              {gateError && <p className="small" style={{ color: "var(--negative)" }}>{gateError}</p>}
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

  return <ConnectedRoom code={code} nickname={gateName} isHost={isHost} initialSettings={settings} />;
}

function ConnectedRoom({
  code,
  nickname,
  isHost: createdByHost,
  initialSettings,
}: {
  code: string;
  nickname: string;
  isHost: boolean;
  initialSettings: GameSettings;
}) {
  const router = useRouter();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [choices, setChoices] = useState<{ id: string; display: string }[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [guessFlash, setGuessFlash] = useState<{ nickname: string; points: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [copied, setCopied] = useState(false);
  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [width, setWidth] = useState(DRAW_WIDTHS[1]);

  const now = useNow(250);
  const playerIdRef = useRef<string | null>(null);

  const handleEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case "chat.message": {
        setMessages((previous) => [
          ...previous.slice(-90),
          {
            id: crypto.randomUUID(),
            playerId: event.playerId,
            nickname: event.nickname,
            text: event.text,
            system: event.system,
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
      case "game.correct-guess": {
        setGuessFlash({ nickname: event.nickname, points: event.points });
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

  const me = snapshot?.players.find((player) => player.id === playerId) ?? null;
  const isHost = snapshot ? snapshot.hostId === playerId : createdByHost;
  const isDrawer = snapshot?.drawerId === playerId;
  const phase = snapshot?.phase ?? "lobby";
  const roomSettings = snapshot?.settings ?? initialSettings;
  const drawer = snapshot?.players.find((player) => player.id === snapshot.drawerId) ?? null;
  const remaining = useCountdown(snapshot?.endsAt ?? null, now);
  const totalSeconds =
    phase === "choosing"
      ? CHOOSE_SECONDS
      : phase === "round-result"
        ? 5
        : roomSettings.drawingTimeSeconds;
  const progress = snapshot?.endsAt ? Math.min(1, Math.max(0, remaining / totalSeconds)) : 0;
  const fatal = error && FATAL_CODES.has(error.code) ? error : null;

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

  useEffect(() => {
    if (!guessFlash) return;
    const timer = window.setTimeout(() => setGuessFlash(null), 2600);
    return () => window.clearTimeout(timer);
  }, [guessFlash]);

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

  if (!snapshot && (fatal || status === "failed")) {
    return (
      <div className="app-shell">
        <Topbar compact />
        <main className="join-gate">
          <div className="error-card">
            <p className="eyebrow">Room {code.toUpperCase()}</p>
            <h1>Could not open this room</h1>
            <p>{fatal?.message ?? "The realtime server could not be reached. Check the connection and try again."}</p>
            <div className="error-actions">
              <Link href="/" className="btn btn--primary">
                Back to home
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
    ? Math.max(0, Math.min(12, roomSettings.maxPlayers) - snapshot.players.length)
    : 0;

  return (
    <div className="app-shell">
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
          </div>
        </div>
      </Topbar>

      <main className="page">
        {(status === "reconnecting" || status === "disconnected" || status === "failed") && (
          <div className="connection-banner">
            <span>Connection lost. Rejoining the room…</span>
            <button type="button" onClick={() => window.location.reload()}>
              Reload now
            </button>
          </div>
        )}

        {isLobby ? (
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

              <div className="rail-head" style={{ marginTop: 18 }}>
                <span className="rail-title">Players in the room</span>
                <span className="rail-count">{snapshot.players.length} joined</span>
              </div>
              <div className="lobby-list">
                <PlayerList
                  players={snapshot.players}
                  meId={playerId}
                  hostId={snapshot.hostId}
                  showScores={false}
                  emptySlots={emptySlots}
                />
              </div>
            </section>

            <aside className="rail">
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Room settings</h2>
                  {isHost ? <span className="pill">Host</span> : <span className="pill">Host sets these</span>}
                </div>
                <div className="settings-list">
                  <div className="setting-row">
                    <span className="setting-label">Rounds</span>
                    {isHost ? (
                      <Segmented
                        label="Rounds"
                        value={roomSettings.rounds}
                        options={[
                          { label: "2", value: 2 },
                          { label: "3", value: 3 },
                          { label: "5", value: 5 },
                        ]}
                        onChange={(value) => updateSettings({ rounds: value })}
                      />
                    ) : (
                      <span className="setting-value">{roomSettings.rounds}</span>
                    )}
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Draw time</span>
                    {isHost ? (
                      <Segmented
                        label="Draw time"
                        value={roomSettings.drawingTimeSeconds}
                        options={[
                          { label: "60s", value: 60 },
                          { label: "80s", value: 80 },
                          { label: "120s", value: 120 },
                        ]}
                        onChange={(value) => updateSettings({ drawingTimeSeconds: value })}
                      />
                    ) : (
                      <span className="setting-value">{roomSettings.drawingTimeSeconds}s</span>
                    )}
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Word choices</span>
                    {isHost ? (
                      <Segmented
                        label="Word choices"
                        value={roomSettings.wordCount ?? 3}
                        options={[
                          { label: "2", value: 2 },
                          { label: "3", value: 3 },
                          { label: "4", value: 4 },
                          { label: "5", value: 5 },
                        ]}
                        onChange={(value) => updateSettings({ wordCount: value })}
                      />
                    ) : (
                      <span className="setting-value">{roomSettings.wordCount ?? 3}</span>
                    )}
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Max players</span>
                    {isHost ? (
                      <Segmented
                        label="Max players"
                        value={roomSettings.maxPlayers}
                        options={[
                          { label: "4", value: 4 },
                          { label: "8", value: 8 },
                          { label: "12", value: 12 },
                        ]}
                        onChange={(value) =>
                          updateSettings({
                            maxPlayers: Math.max(value, snapshot.players.length),
                          })
                        }
                      />
                    ) : (
                      <span className="setting-value">{roomSettings.maxPlayers}</span>
                    )}
                  </div>
                </div>
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
        ) : (
          <div className="room-grid">
            <section className="canvas-card">
              <div className="canvas-head">
                <div className="round-line">
                  <span>
                    Round <strong>{Math.max(1, snapshot.roundNumber)}</strong> of{" "}
                    <strong>{roomSettings.rounds}</strong>
                  </span>
                  <span aria-hidden>·</span>
                  <span>{phase === "choosing" ? "Choosing a word" : phase === "drawing" ? "Drawing" : phase === "round-result" ? "Round over" : "Final scores"}</span>
                </div>
                <div className="status-line">
                  {drawer ? (
                    <>
                      <span className="legend-dot" style={{ background: drawer.color }} />
                      {drawer.nickname} is drawing
                    </>
                  ) : (
                    "Scores on the board"
                  )}
                </div>
              </div>

              <div className="word-zone">
                {isDrawer && selectedWord ? (
                  <div className="drawer-word">
                    <small>Your word</small>
                    {selectedWord}
                  </div>
                ) : (
                  <WordMask
                    maskedWord={snapshot.maskedWord}
                    word={phase === "round-result" ? roundResult?.word ?? snapshot.maskedWord : null}
                  />
                )}
                <div className="timer" aria-label={`${remaining} seconds left`}>
                  <ClockIcon size={14} />
                  <span className="timer-value num">{snapshot.endsAt ? remaining : "–"}</span>
                  <span className="timer-track">
                    <span className="timer-fill" style={{ width: `${progress * 100}%` }} />
                  </span>
                </div>
              </div>

              {guessFlash && (
                <div className="guess-banner" role="status">
                  <span className="player-dot" style={{ background: "var(--accent)" }} />
                  <span>
                    <strong>{guessFlash.nickname}</strong> guessed the word
                  </span>
                  <span className="points">+{guessFlash.points}</span>
                </div>
              )}

              <DrawingCanvas
                strokes={strokes}
                canDraw={Boolean(isDrawer && phase === "drawing")}
                color={color}
                width={width}
                onStroke={handleLocalStroke}
                overlay={
                  phase === "choosing" ? (
                    isDrawer ? (
                      <div className="choice-panel">
                        <p className="eyebrow">Pick a word</p>
                        <p className="overlay-title">What will you draw?</p>
                        <p className="overlay-sub">
                          You have {snapshot.endsAt ? remaining : CHOOSE_SECONDS} seconds. If you do not
                          choose, the first word is picked.
                        </p>
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
                      <p className="eyebrow">Round {Math.max(1, snapshot.roundNumber)} · {reasonLabel(roundResult?.reason ?? "timeout")}</p>
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
                      </div>
                    </div>
                  ) : null
                }
                overlayClear={phase === "round-result"}
              />

              {isDrawer && phase === "drawing" ? (
                <div className="toolbar">
                  <div className="toolbar-group">
                    <span className="toolbar-label">Ink</span>
                    <div className="swatches" role="group" aria-label="Pen colour">
                      {DRAW_COLORS.map((swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          className="swatch"
                          style={{ background: swatch }}
                          aria-label={`Use ${swatch}`}
                          aria-pressed={color === swatch}
                          onClick={() => setColor(swatch)}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="toolbar-divider" aria-hidden />
                  <div className="toolbar-group">
                    <span className="toolbar-label">Size</span>
                    <div className="widths" role="group" aria-label="Pen size">
                      {DRAW_WIDTHS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className="width-btn"
                          aria-label={`Pen size ${value}`}
                          aria-pressed={width === value}
                          onClick={() => setWidth(value)}
                        >
                          <span
                            className="width-dot"
                            style={{ width: value, height: value }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="toolbar-divider" aria-hidden />
                  <div className="toolbar-group">
                    <button
                      className="btn btn--ghost btn--sm"
                      type="button"
                      onClick={() => send({ type: "drawing.undo" })}
                    >
                      <UndoIcon size={13} />
                      Undo
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      type="button"
                      onClick={() => send({ type: "drawing.clear" })}
                    >
                      <TrashIcon size={13} />
                      Clear
                    </button>
                  </div>
                  <span className="tool-hint">Draw with a mouse, pen or finger</span>
                </div>
              ) : (
                <div className="toolbar">
                  <span className="spectator-note">
                    {phase === "drawing"
                      ? me?.guessedCorrectly
                        ? "You guessed it. Watch the clock or chat with the room."
                        : "Type your guess in the chat on the right."
                      : "The board is read only between rounds."}
                  </span>
                </div>
              )}
            </section>

            <aside className="rail">
              <section className="card">
                <div className="rail-head">
                  <span className="rail-title">Players</span>
                  <span className="rail-count">{snapshot.players.length} in room</span>
                </div>
                <PlayerList
                  players={snapshot.players}
                  meId={playerId}
                  hostId={snapshot.hostId}
                  drawerId={snapshot.drawerId}
                />
              </section>

              <Chat
                messages={messages}
                onSend={(text) => send({ type: "chat.guess", text })}
                disabled={status !== "connected"}
                placeholder={
                  phase === "drawing"
                    ? isDrawer
                      ? "You are drawing — chat with the room…"
                      : me?.guessedCorrectly
                        ? "You guessed it — chat with the room…"
                        : "Type your guess…"
                    : "Type a message…"
                }
                hint={
                  phase === "drawing" && !isDrawer && !me?.guessedCorrectly
                    ? "Correct guesses are announced. Wrong ones stay in chat."
                    : undefined
                }
              />
            </aside>
          </div>
        )}
      </main>

      {toast && (
        <div className={`toast ${toast.error ? "toast--error" : ""}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}

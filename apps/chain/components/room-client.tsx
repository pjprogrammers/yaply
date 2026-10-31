"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameSettings, Ranking } from "@yaply/shared/types";
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
import { Board } from "./board";
import { Chat, type ChatMessage } from "./chat";
import { CheckIcon, ClockIcon, CopyIcon, PlayIcon } from "./icons";
import { PlayerList } from "./player-list";
import { Segmented } from "./segmented";
import { Topbar } from "./topbar";

const FATAL_CODES = new Set([
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_EXISTS",
  "ROOM_NOT_RESERVED",
  "GAME_MISMATCH",
  "ROOM_IN_PROGRESS",
  "RESUME_FAILED",
]);

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
  failed: "Connection failed",
};

type Finished = {
  rankings: Ranking[];
  winnerId?: string;
};

type Toast = {
  message: string;
  error?: boolean;
};

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
      maxPlayers: numberParam(searchParams.get("max"), 6, 2, 8),
      turnTimeSeconds: numberParam(searchParams.get("turn"), 45, 15, 120),
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
            <h1>Join this Chain Reaction room</h1>
            <p>Pick the name your friends will see on the board.</p>
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [copied, setCopied] = useState(false);

  const now = useNow(250);
  const playerIdRef = useRef<string | null>(null);
  const flashTimer = useRef<number | null>(null);

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
      case "chain.move": {
        const keys = new Set<string>();
        keys.add(`${event.move.row}:${event.move.col}`);
        for (const explosion of event.move.explosions) {
          keys.add(`${explosion.row}:${explosion.col}`);
        }
        setFlash(keys);
        if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(new Set()), 560);
        break;
      }
      case "chain.turn.timeout": {
        setToast({ message: "The turn clock ran out — a legal move was played automatically." });
        break;
      }
      case "game.finished": {
        setFinished({ rankings: event.rankings, winnerId: event.winnerId });
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
    game: "chain",
    nickname,
    create: createdByHost,
    settings: initialSettings,
    onEvent: handleEvent,
  });

  playerIdRef.current = playerId;

  const me = snapshot?.players.find((player) => player.id === playerId) ?? null;
  const isHost = snapshot ? snapshot.hostId === playerId : createdByHost;
  const phase = snapshot?.phase ?? "lobby";
  const roomSettings = snapshot?.settings ?? initialSettings;
  const chain = snapshot?.chain ?? null;
  const remaining = useCountdown(snapshot?.endsAt ?? null, now);
  const turnTime = roomSettings.turnTimeSeconds ?? 45;
  const progress = snapshot?.endsAt ? Math.min(1, Math.max(0, remaining / turnTime)) : 0;
  const currentPlayer = chain?.turnPlayerId
    ? snapshot?.players.find((player) => player.id === chain.turnPlayerId) ?? null
    : null;
  const canPlay =
    phase === "playing" &&
    Boolean(chain) &&
    !chain?.winnerId &&
    chain?.turnPlayerId === playerId;
  const eliminated = chain?.eliminatedPlayerIds.includes(playerId ?? "") ?? false;
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
    if (!snapshot) return;
    if (snapshot.phase !== "game-over") setFinished(null);
  }, [snapshot]);

  useEffect(() => {
    return () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    };
  }, []);

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

  const surrender = () => {
    if (!window.confirm("Surrender? Your orbs leave the board and you are out of this game.")) {
      return;
    }
    send({ type: "chain.surrender" });
  };

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
    ? Math.max(0, Math.min(8, roomSettings.maxPlayers) - snapshot.players.length)
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
                  <p className="eyebrow">Chain Reaction room</p>
                  <h1 className="room-title">Waiting for players</h1>
                  <p className="subline">
                    Share the code or the invite link. The host starts once at least two players are
                    in the room.
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
                    <span className="setting-label">Max players</span>
                    {isHost ? (
                      <Segmented
                        label="Max players"
                        value={roomSettings.maxPlayers}
                        options={[
                          { label: "4", value: 4 },
                          { label: "6", value: 6 },
                          { label: "8", value: 8 },
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
                  <div className="setting-row">
                    <span className="setting-label">Turn clock</span>
                    {isHost ? (
                      <Segmented
                        label="Turn clock"
                        value={roomSettings.turnTimeSeconds ?? 45}
                        options={[
                          { label: "30s", value: 30 },
                          { label: "45s", value: 45 },
                          { label: "60s", value: 60 },
                        ]}
                        onChange={(value) => updateSettings({ turnTimeSeconds: value })}
                      />
                    ) : (
                      <span className="setting-value">{roomSettings.turnTimeSeconds ?? 45}s</span>
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
                    ? "One more player is needed before the first move."
                    : isHost
                      ? "Everyone in the room is ready. Start when you are."
                      : "The room code is in the top bar. Invite anyone you want in the next game."}
                </p>
              </section>
            </aside>
          </div>
        ) : (
          <div className="room-grid">
            <section className="chain-card">
              <div className="chain-head">
                <div className="chain-head-main">
                  <span className="chain-head-title">
                    Round {Math.max(1, snapshot.roundNumber)} · {chain?.moveCount ?? 0} moves
                  </span>
                  <span className="chain-head-sub">
                    {phase === "game-over"
                      ? "Final board"
                      : canPlay
                        ? "Your turn — pick a cell"
                        : currentPlayer
                          ? `${currentPlayer.nickname} is choosing a cell`
                          : "Waiting for the next turn"}
                  </span>
                </div>
                <div className="chain-timer" aria-label={`${remaining} seconds left`}>
                  <ClockIcon size={14} />
                  <span className="timer-value num">{snapshot.endsAt ? remaining : "–"}</span>
                  <span className="timer-track">
                    <span className="timer-fill" style={{ width: `${progress * 100}%` }} />
                  </span>
                </div>
              </div>

              <div className="board-shell">
                {chain ? (
                  <Board
                    chain={chain}
                    players={snapshot.players}
                    meId={playerId}
                    canPlay={canPlay}
                    onPlace={(row, col) => send({ type: "chain.place", row, col })}
                    flash={flash}
                  />
                ) : (
                  <div className="empty">Setting up the board…</div>
                )}

                {phase === "game-over" && (
                  <div className="canvas-overlay">
                    <div className="overlay-card">
                      <p className="eyebrow">Game over</p>
                      <p className="overlay-title">
                        {winner ? `${winner.nickname} wins the board` : "Final board"}
                      </p>
                      <p className="overlay-sub">
                        {rankings.length} players · {chain?.moveCount ?? 0} moves played
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
                            <span className="result-rank-score">
                              {entry.score} <span className="small faint">orbs</span>
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="overlay-actions">
                        {isHost ? (
                          <button className="btn btn--primary" type="button" onClick={() => send({ type: "game.rematch" })}>
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
                  </div>
                )}
              </div>

              <div className="chain-actions">
                <span className={`turn-pill ${canPlay ? "turn-pill--mine" : ""}`}>
                  <i
                    style={{
                      background: canPlay ? "var(--accent)" : currentPlayer?.color ?? "var(--faint)",
                    }}
                  />
                  {canPlay
                    ? "Your move"
                    : currentPlayer
                      ? `${currentPlayer.nickname}'s move`
                      : "Board settled"}
                </span>
                {phase === "playing" && !eliminated && (
                  <button className="btn btn--danger btn--sm" type="button" onClick={surrender}>
                    Surrender
                  </button>
                )}
                {eliminated && <span className="tag tag--negative">Eliminated</span>}
                <span className="capture-line">
                  {chain?.lastMove
                    ? `Last move: row ${chain.lastMove.row + 1}, column ${chain.lastMove.col + 1}${
                        chain.lastMove.captured > 0
                          ? ` · ${chain.lastMove.captured} orb${chain.lastMove.captured === 1 ? "" : "s"} captured`
                          : ""
                      }`
                    : "Place the first orb."}
                </span>
              </div>
            </section>

            <aside className="rail">
              <section className="card">
                <div className="rail-head">
                  <span className="rail-title">Players</span>
                  <span className="rail-count">
                    {snapshot.players.length} in room
                  </span>
                </div>
                <PlayerList
                  players={snapshot.players}
                  meId={playerId}
                  hostId={snapshot.hostId}
                  turnPlayerId={chain?.turnPlayerId ?? null}
                  eliminatedIds={chain?.eliminatedPlayerIds ?? []}
                />
                <div className="divider" style={{ margin: "12px 0" }} />
                <div className="chain-rules">
                  <div className="chain-rule">
                    <span className="legend-dot" style={{ background: me?.color ?? "var(--faint)" }} />
                    <span>
                      <b>You</b> hold {me?.score ?? 0} orbs on the board.
                    </span>
                  </div>
                  <div className="chain-rule">
                    <span className="legend-dot" style={{ background: "var(--accent)" }} />
                    <span>
                      Corner cells pop at <b>2</b>, edges at <b>3</b>, the middle at <b>4</b>.
                    </span>
                  </div>
                  <div className="chain-rule">
                    <span className="legend-dot" style={{ background: "var(--control)" }} />
                    <span>Surrendering removes your orbs from the board.</span>
                  </div>
                </div>
              </section>

              <Chat
                messages={messages}
                onSend={(text) => send({ type: "chat.guess", text })}
                disabled={status !== "connected"}
                placeholder="Type a message…"
                hint="Trash talk is part of the game."
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

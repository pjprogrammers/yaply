"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePhase, GameSettings, SpyRole } from "@yaply/shared/types";
import type { ServerEvent } from "@yaply/shared/events";
import { MAX_NICKNAME_LENGTH, SPY_MIN_PLAYERS, maxSpyCount } from "@yaply/shared/constants";
import { useCountdown, useGameRoom, useNow } from "@yaply/shared/react";
import { inviteUrl, readStoredNickname, REALTIME_URL, storeNickname } from "@/lib/config";
import {
  localConfigToPatch,
  localConfigToSettings,
  readLocalConfig,
  settingsToLocalConfig,
  type LocalSpyConfig,
} from "@/lib/spy-settings";
import { useVoiceRoom, type VoiceRoom } from "@/lib/voice";
import { Chat, type ChatMessage } from "./chat";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  LeaveIcon,
  MicIcon,
  MicOffIcon,
  PlayIcon,
  ShieldIcon,
  SpeakerIcon,
  SpyMark,
  WifiIcon,
} from "./icons";
import { LobbyIntro, LobbyRules } from "./lobby-panel";
import {
  CluePanel,
  DiscussionPanel,
  EliminationPanel,
  FinalGuessPanel,
  PhaseHeader,
} from "./phase-panels";
import { PlayerGrid } from "./player-grid";
import { PrivateCard, RoleDossier, type SpyRoleInfo } from "./role-card";
import { ResultsPanel } from "./results-panel";
import { SpySettingsFields } from "./spy-settings-fields";
import { VotePanel } from "./vote-panel";

const FATAL_CODES = new Set([
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_EXISTS",
  "ROOM_NOT_RESERVED",
  "GAME_MISMATCH",
  "ROOM_IN_PROGRESS",
  "REMOVED_BY_HOST",
  "RESUME_FAILED",
  "PROTOCOL_MISMATCH",
  "SESSION_REPLACED",
]);

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
  failed: "Connection failed",
};

type Toast = { message: string; error?: boolean };

function messageId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the saved nickname
    if (stored) setGateName(stored);
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
      <div className="room-app room-app--gate">
        <RoomBar code={code} status="connecting" onLeave={undefined} />
        <main className="join-gate">
          <div className="join-gate-card">
            <p className="eyebrow">Case {code.toUpperCase()}</p>
            <h1>Join this room</h1>
            <p>
              Pick the name the table will see. Your role and word arrive after
              the host deals the cards.
            </p>
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
                  autoComplete="nickname"
                  autoFocus
                />
              </label>
              {gateError && <p className="form-error">{gateError}</p>}
              <button className="button button--large" type="submit">
                <PlayIcon size={16} />
                Join room
              </button>
              <Link href="/" className="button button--ghost">
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
      createdByHost={searchParams.get("host") === "1"}
    />
  );
}

function ConnectedRoom({
  code,
  nickname,
  createdByHost,
}: {
  code: string;
  nickname: string;
  createdByHost: boolean;
}) {
  const router = useRouter();
  const [initialSettings] = useState<GameSettings>(() =>
    localConfigToSettings(readLocalConfig(nickname)),
  );
  const [role, setRole] = useState<SpyRoleInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [clueDraft, setClueDraft] = useState("");
  const [guessDraft, setGuessDraft] = useState("");
  const [lobbyConfig, setLobbyConfig] = useState<LocalSpyConfig | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<{ key: string; targetId: string } | null>(null);
  const [guessSubmit, setGuessSubmit] = useState<{ key: string; submitted: boolean } | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const previousPhase = useRef("lobby");
  // The realtime hook owns the socket, so the voice hook is created after it.
  // This indirection lets the socket callback reach the latest voice handler.
  const voiceEventHandler = useRef<(event: ServerEvent) => void>(() => {});

  const now = useNow(250);

  const handleEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case "spy.role":
        setRole({
          role: event.role,
          word: event.word,
          categoryId: event.categoryId,
          categoryLabel: event.categoryLabel,
          round: event.round,
        });
        break;
      case "chat.message":
        setMessages((previous) => [
          ...previous.slice(-199),
          {
            id: messageId(),
            playerId: event.playerId,
            nickname: event.nickname,
            text: event.text,
            createdAt: event.createdAt,
            system: event.system,
            kind: event.kind,
            private: event.private,
            spectator: event.spectator,
          },
        ]);
        break;
      case "voice.state":
      case "voice.signal":
        voiceEventHandler.current(event);
        break;
      default:
        break;
    }
  }, []);

  const { snapshot, status, playerId, error, send, leave, clearError } = useGameRoom({
    baseUrl: REALTIME_URL,
    code,
    game: "whos-the-spy",
    nickname,
    create: createdByHost,
    settings: initialSettings,
    onEvent: handleEvent,
  });

  const phase = snapshot?.phase ?? "lobby";
  const spyState = snapshot?.spy ?? null;
  const matchRound = spyState?.round ?? 0;
  const players = snapshot?.players ?? [];
  const settings = snapshot?.settings ?? initialSettings;
  const me = players.find((player) => player.id === playerId) ?? null;
  const isHost = snapshot ? snapshot.hostId === playerId : createdByHost;
  const activeIds = spyState?.activePlayerIds ?? players.map((player) => player.id);
  const eliminatedIds = players
    .filter((player) => !activeIds.includes(player.id))
    .map((player) => player.id);
  const isSpectator =
    phase !== "lobby" && phase !== "results" && Boolean(playerId) && !activeIds.includes(playerId!);
  const readyIds = spyState?.readyPlayerIds ?? [];
  const ready = Boolean(playerId && readyIds.includes(playerId));
  const remaining = useCountdown(snapshot?.endsAt ?? null, now);
  const connectedCount = players.filter((player) => player.connected).length;

  const speakerId =
    phase === "clue"
      ? spyState?.activeSpeakerId ?? null
      : phase === "final-guess"
        ? spyState?.finalGuessPlayerId ?? null
        : null;
  const speaker = players.find((player) => player.id === speakerId) ?? null;

  const voteKey = `${phase}:${matchRound}:${spyState?.tiedPlayerIds.join(",") ?? ""}`;
  const myVote = vote?.key === voteKey ? vote.targetId : null;
  const finalGuessKey = phase === "final-guess" ? `${matchRound}:${spyState?.finalGuessPlayerId ?? ""}` : "";
  const guessSubmitted =
    finalGuessKey !== "" && guessSubmit?.key === finalGuessKey && guessSubmit.submitted;

  const fatal = error && FATAL_CODES.has(error.code) ? error : null;

  const voiceEnabled = settings.spyVoiceChat !== false;
  const voice = useVoiceRoom({
    enabled: voiceEnabled,
    send,
    playerId,
    phase,
    spectator: isSpectator,
    status,
  });

  useEffect(() => {
    voiceEventHandler.current = voice.handleEvent;
  }, [voice.handleEvent]);

  const leaveVoice = voice.leave;
  useEffect(() => {
    if (!fatal) return;
    // A fatal socket error means this tab can never rejoin; release the
    // microphone and tear down every peer immediately.
    leaveVoice();
  }, [fatal, leaveVoice]);

  useEffect(() => {
    if (!error) return;
    if (FATAL_CODES.has(error.code)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- surface non-fatal server errors
    setToast({ message: error.message, error: true });
    clearError();
  }, [clearError, error]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (phase === "lobby") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a fresh lobby clears the finished match
      setRole(null);
      setMessages([]);
      setClueDraft("");
      setGuessDraft("");
    }
    if (phase === "role-reveal" && previousPhase.current !== "role-reveal") {
      setMessages([]);
      setClueDraft("");
      setGuessDraft("");
    }
    previousPhase.current = phase;
  }, [phase]);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  const currentLobbyConfig =
    lobbyConfig ?? (snapshot ? settingsToLocalConfig(settings, nickname) : null);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      setCopied(true);
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setToast({ message: "Could not copy the link. Read the room code aloud instead.", error: true });
    }
  };

  const updateLobby = (patch: Partial<LocalSpyConfig>) => {
    if (!isHost || !currentLobbyConfig) return;
    const next = { ...currentLobbyConfig, ...patch };
    setLobbyConfig(next);
    send({ type: "room.settings.update", settings: localConfigToPatch(next) });
  };

  const leaveRoom = () => {
    voice.leave();
    leave();
    router.push("/");
  };

  if (fatal) {
    return (
      <RoomFatal
        code={code}
        errorCode={fatal.code}
        message={fatal.message}
      />
    );
  }

  if (!snapshot) {
    return (
      <div className="room-app">
        <RoomBar code={code} status={status} onLeave={leaveRoom} />
        <main className="room-loading">
          <div className="loading-card">
            <span className="loading-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {status === "reconnecting"
              ? "Reconnecting to the case…"
              : status === "failed"
                ? error?.message ?? "The room could not be reached."
                : "Opening the case file…"}
          </div>
          {status === "failed" && (
            <Link href="/" className="button button--ghost">
              Back to home
            </Link>
          )}
        </main>
      </div>
    );
  }

  const chatAllowed =
    phase === "lobby" ||
    phase === "results" ||
    (isSpectator
      ? settings.spySpectatorChat === true
      : settings.spyTextChat !== false);
  const chatReason =
    phase === "lobby" || phase === "results"
      ? ""
      : isSpectator
        ? "Spectator chat is disabled in this room."
        : "The host turned table chat off for this match.";
  const chatHint =
    phase === "lobby"
      ? "Lobby chat is open to everyone in the room."
      : phase === "results"
        ? "All chat is public on the result screen."
        : isSpectator
          ? "Only eliminated players can read this channel."
          : "Either secret word is blocked by the server.";

  const emptySlots =
    phase === "lobby" ? Math.min(4, Math.max(0, settings.maxPlayers - players.length)) : 0;
  const roleKey = role ? `${role.round}:${role.role}:${role.word}` : "dealing";
  const categoryLabel = spyState?.categoryLabel ?? null;

  return (
    <div className="room-app">
      <RoomBar code={code} status={status} onLeave={leaveRoom} />

      {status === "reconnecting" && (
        <div className="reconnect-banner" role="status">
          <WifiIcon offline size={15} />
          Connection lost. Restoring your seat…
        </div>
      )}

      <main className="room-layout">
        <section className="room-main">
          <PhaseHeader
            phase={phase}
            round={matchRound}
            remaining={remaining}
            categoryLabel={categoryLabel}
            speakerName={speaker?.nickname ?? null}
          />

          {phase === "lobby" && (
            <LobbyIntro
              code={code}
              copied={copied}
              onCopy={copyInvite}
              players={players}
              connectedCount={connectedCount}
              isHost={isHost}
              settings={settings}
              onStart={() => send({ type: "room.start" })}
            />
          )}

          {phase === "role-reveal" && (
            <RoleDossier
              key={roleKey}
              role={role}
              ready={ready}
              readyCount={readyIds.length}
              total={activeIds.length}
              remaining={remaining}
              onReady={() => send({ type: "spy.ready" })}
            />
          )}

          {phase === "clue" && spyState && (
            <CluePanel
              players={players}
              clues={spyState.clues}
              turnOrder={spyState.turnOrder.filter((id) => activeIds.includes(id))}
              speakerId={speakerId}
              meId={playerId}
              remaining={remaining}
              clueFormat={settings.spyClueFormat ?? "both"}
              draft={clueDraft}
              onDraftChange={setClueDraft}
              onSubmit={() => {
                const text = clueDraft.trim();
                if (!text) return;
                send({ type: "spy.clue", text });
                setClueDraft("");
              }}
            />
          )}

          {phase === "discussion" && spyState && (
            <DiscussionPanel
              players={players}
              clues={spyState.clues}
              remaining={remaining}
            />
          )}

          {(phase === "voting" || phase === "revote") && spyState && (
            <VotePanel
              players={players}
              meId={playerId}
              aliveIds={activeIds}
              tiedIds={spyState.tiedPlayerIds}
              phase={phase}
              myVoteTarget={myVote}
              votesCast={spyState.votesCast}
              eligibleVoters={spyState.eligibleVoters}
              remaining={remaining}
              spectator={isSpectator}
              onVote={(targetId) => {
                send({ type: "spy.vote", targetId });
                setVote({ key: voteKey, targetId });
              }}
            />
          )}

          {phase === "elimination" && spyState && (
            <EliminationPanel
              players={players}
              elimination={spyState.lastElimination}
              remaining={remaining}
            />
          )}

          {phase === "final-guess" && spyState && (
            <FinalGuessPanel
              player={players.find((player) => player.id === spyState.finalGuessPlayerId) ?? null}
              isMe={Boolean(playerId && spyState.finalGuessPlayerId === playerId)}
              remaining={remaining}
              draft={guessDraft}
              onChange={setGuessDraft}
              onSubmit={() => {
                const word = guessDraft.trim();
                if (!word) return;
                send({ type: "spy.final.guess", word });
                setGuessSubmit({ key: finalGuessKey, submitted: true });
                setGuessDraft("");
              }}
              failed={Boolean(guessSubmitted || spyState.finalGuessResult)}
            />
          )}

          {phase === "results" && spyState && (
            <ResultsPanel
              snapshot={snapshot}
              spy={spyState}
              meId={playerId}
              isHost={isHost}
              onRematch={() => send({ type: "game.rematch" })}
              onLobby={() => send({ type: "game.lobby" })}
            />
          )}

          {phase !== "results" && (
            <PlayerGrid
              players={players}
              meId={playerId}
              hostId={snapshot.hostId}
              phase={phase}
              speakerId={speakerId}
              readyIds={readyIds}
              eliminatedIds={phase === "lobby" ? [] : eliminatedIds}
              roles={spyState?.roles ?? null}
              emptySlots={emptySlots}
              voice={voice.participants}
              voiceMutedAll={voice.muteAll}
              voiceOff={voice.disabled}
              onRemove={
                isHost
                  ? (targetId) => send({ type: "room.player.remove", playerId: targetId })
                  : undefined
              }
            />
          )}

          {phase === "lobby" && (
            <section className="lobby-rules" aria-labelledby="lobby-rules-title">
              <div className="section-rail-head">
                <h2 id="lobby-rules-title">Room rules</h2>
                <span>{isHost ? "Host only" : "Set by the host"}</span>
              </div>
              {isHost && currentLobbyConfig ? (
                <div className="settings-panel">
                  <SpySettingsFields
                    value={{
                      ...currentLobbyConfig,
                      spyCount:
                        currentLobbyConfig.spyCount > maxSpyCount(players.length)
                          ? 0
                          : currentLobbyConfig.spyCount,
                    }}
                    onChange={updateLobby}
                    playerCount={players.length}
                  />
                </div>
              ) : (
                <LobbyRules settings={settings} />
              )}
            </section>
          )}
        </section>

        <aside className="room-rail">
          {phase !== "lobby" && phase !== "role-reveal" && phase !== "results" && (
            <PrivateCard
              role={role}
              eliminated={isSpectator}
              finalGuess={settings.spyFinalGuess !== false}
            />
          )}

          <Chat
            messages={messages}
            onSend={(text) => send({ type: "chat.guess", text })}
            disabled={!chatAllowed}
            disabledReason={chatReason}
            spectator={isSpectator}
            title={phase === "lobby" ? "Lobby chat" : "Table chat"}
            emptyCopy={
              phase === "lobby"
                ? "Nothing said yet. Break the ice while the table fills."
                : "Quiet table. Somebody has to start the accusations."
            }
            hint={chatHint}
          />

          {settings.spyVoiceChat !== false && (
            <VoicePanel
              phase={phase}
              isHost={isHost}
              spectator={isSpectator}
              voice={voice}
            />
          )}
        </aside>
      </main>

      {toast && (
        <div className={toast.error ? "toast toast--error" : "toast"} role="status">
          {toast.message}
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
            <CloseIcon size={13} />
          </button>
        </div>
      )}

      {!me && (
        <div className="room-reconnect-strip">
          <WifiIcon offline size={14} />
          Your seat is not in this snapshot yet. The room will restore it.
        </div>
      )}
    </div>
  );
}

function RoomBar({
  code,
  status,
  onLeave,
}: {
  code: string;
  status: string;
  onLeave?: () => void;
}) {
  return (
    <header className="room-bar">
      <Link href="/" className="room-brand" aria-label="Yaply Who's the Spy home">
        <SpyMark size={30} />
        <span>
          Yaply <em>Spy</em>
        </span>
      </Link>

      <div className="room-bar-center">
        <span className="room-code-pill">Case {code.toUpperCase()}</span>
        <span className={`room-status room-status--${status}`}>
          <i />
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <div className="room-bar-right">
        <span className="room-bar-note">
          <ShieldIcon size={13} />
          Words stay server-side
        </span>
        {onLeave && (
          <button type="button" className="room-leave" onClick={onLeave}>
            <LeaveIcon size={15} />
            Leave
          </button>
        )}
      </div>
    </header>
  );
}

function RoomFatal({
  code,
  errorCode,
  message,
}: {
  code: string;
  errorCode: string;
  message: string;
}) {
  return (
    <div className="room-app">
      <RoomBar code={code} status="failed" />
      <main className="room-fatal">
        <div className="room-fatal-card">
          <p className="eyebrow">{errorCode.replaceAll("_", " ")}</p>
          <h1>
            {errorCode === "ROOM_IN_PROGRESS"
              ? "This case is already open."
              : errorCode === "REMOVED_BY_HOST"
                ? "You were removed from the case."
                : "This seat is closed."}
          </h1>
          <p>{message}</p>
          <div className="room-fatal-actions">
            <Link href="/" className="button">
              Back to home
            </Link>
            <Link href="/join" className="button button--ghost">
              Join another room
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function VoicePanel({
  phase,
  isHost,
  spectator,
  voice,
}: {
  phase: GamePhase;
  isHost: boolean;
  spectator: boolean;
  voice: VoiceRoom;
}) {
  // The plan's competitive rule: microphones close while a vote is open.
  const voteLocked = phase === "voting" || phase === "revote";
  const joined = voice.joined;
  const micBlocked = voteLocked || spectator || voice.muteAll || voice.disabled;
  const micOn = joined && !voice.micMuted && !micBlocked;
  const liveCount = voice.participants.length;

  const status = voice.disabled
    ? "Off"
    : voice.connecting
      ? "Connecting"
      : !joined
        ? liveCount > 0
          ? `${liveCount} live`
          : "Off"
        : voteLocked
          ? "Vote lock"
          : voice.muteAll
            ? "Muted"
            : `${liveCount} live`;

  const note = voice.disabled
    ? "The host closed voice for this room. Table chat is still open."
    : voteLocked
      ? "Nobody can speak while a vote is open. Voice reopens when the ballots are sealed."
      : spectator
        ? "Spectators can listen, but cannot transmit until the results screen."
        : voice.muteAll
          ? "The host muted every microphone. You can still hear the table."
          : joined
            ? voice.connectedPeers > 0
              ? `${voice.connectedPeers} peer connection${
                  voice.connectedPeers === 1 ? "" : "s"
                } live. Audio is peer-to-peer; the server only relays setup messages.`
              : "Building the audio mesh…"
            : "Voice is optional. Joining asks the browser for microphone access once.";

  return (
    <section className="voice-card" aria-labelledby="voice-title">
      <div className="rail-head">
        <h2 id="voice-title">Voice</h2>
        <span className={voteLocked ? "rail-count is-locked" : "rail-count"}>{status}</span>
      </div>

      {voice.error && (
        <div className="voice-error" role="alert">
          <p>{voice.error}</p>
          <button type="button" onClick={voice.clearError}>
            Dismiss
          </button>
        </div>
      )}

      {voice.disabled ? (
        <div className="voice-row">
          <span className="voice-icon is-muted">
            <MicOffIcon size={17} />
          </span>
          <div>
            <p>Voice disabled</p>
            <span>The host turned the voice channel off.</span>
          </div>
        </div>
      ) : !joined ? (
        <div className="voice-row">
          <span className="voice-icon is-muted">
            <MicIcon size={17} />
          </span>
          <div>
            <p>{liveCount > 0 ? `${liveCount} player${liveCount === 1 ? "" : "s"} on voice` : "Join the voice room"}</p>
            <span>
              {liveCount > 0
                ? "Join to listen and speak with the table."
                : "Talk it out instead of typing every clue."}
            </span>
          </div>
          <button
            type="button"
            className="voice-toggle voice-toggle--join"
            onClick={() => void voice.join()}
            disabled={voice.connecting}
          >
            {voice.connecting ? "Joining…" : "Join"}
          </button>
        </div>
      ) : (
        <>
          <div className="voice-row">
            <span className={micOn ? "voice-icon" : "voice-icon is-muted"}>
              {micOn ? <MicIcon size={17} /> : <MicOffIcon size={17} />}
            </span>
            <div>
              <p>
                {voteLocked
                  ? "Microphones closed"
                  : voice.muteAll
                    ? "Muted by host"
                    : spectator
                      ? "Spectating"
                      : voice.micMuted
                        ? "You are muted"
                        : "Microphone live"}
              </p>
              <span>
                {voteLocked
                  ? "Voice reopens after the vote."
                  : voice.muteAll
                    ? "The host muted the whole table."
                    : spectator
                      ? "You can hear the table."
                      : voice.micMuted
                        ? "Your track is disabled until you unmute."
                        : "The table can hear you."}
              </span>
            </div>
            <button
              type="button"
              className="voice-toggle"
              aria-pressed={!voice.micMuted}
              onClick={voice.toggleMic}
              disabled={micBlocked}
            >
              {voice.micMuted ? "Unmute" : "Mute"}
            </button>
          </div>

          <div className="voice-secondary">
            <button
              type="button"
              className="voice-mini"
              aria-pressed={!voice.speakerMuted}
              onClick={voice.toggleSpeaker}
            >
              <SpeakerIcon size={13} />
              {voice.speakerMuted ? "Speaker off" : "Speaker on"}
            </button>
            <button type="button" className="voice-mini" onClick={voice.leave}>
              <LeaveIcon size={13} />
              Leave voice
            </button>
          </div>
        </>
      )}

      {isHost && (
        <div className="voice-host">
          <span>Host controls</span>
          <div>
            <button
              type="button"
              className="voice-mini"
              aria-pressed={voice.muteAll}
              onClick={() => voice.setMuteAll(!voice.muteAll)}
            >
              {voice.muteAll ? "Unmute all" : "Mute all"}
            </button>
            <button
              type="button"
              className="voice-mini"
              aria-pressed={voice.disabled}
              onClick={() => voice.setDisabled(!voice.disabled)}
            >
              {voice.disabled ? "Enable voice" : "Disable voice"}
            </button>
          </div>
        </div>
      )}

      <p className="voice-note">{note}</p>
    </section>
  );
}

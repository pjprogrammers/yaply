"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionStatus } from "@yaply/shared/client";
import type { ClientEvent, ServerEvent } from "@yaply/shared/events";
import type { GamePhase, VoiceParticipant, VoiceSignal } from "@yaply/shared/types";

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

/**
 * Optional production TURN/STUN configuration. The value is a JSON array of
 * RTCIceServer objects, for example:
 * [{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]
 */
function loadIceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (!raw) return DEFAULT_ICE_SERVERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ICE_SERVERS;
    const servers = parsed.flatMap((entry): RTCIceServer[] => {
      if (!entry || typeof entry !== "object") return [];
      const { urls, username, credential } = entry as Record<string, unknown>;
      const validUrls =
        typeof urls === "string" ||
        (Array.isArray(urls) && urls.length > 0 && urls.every((url) => typeof url === "string"));
      if (!validUrls) return [];
      return [
        {
          urls: urls as string | string[],
          ...(typeof username === "string" ? { username } : {}),
          ...(typeof credential === "string" ? { credential } : {}),
        },
      ];
    });
    return servers.length > 0 ? servers : DEFAULT_ICE_SERVERS;
  } catch {
    return DEFAULT_ICE_SERVERS;
  }
}

const ICE_SERVERS = loadIceServers();

export type UseVoiceRoomOptions = {
  enabled: boolean;
  send: (event: ClientEvent) => void;
  playerId: string | null;
  phase: GamePhase;
  /** Eliminated players listen but cannot transmit until the results screen. */
  spectator: boolean;
  status: ConnectionStatus;
};

export type VoiceRoom = {
  handleEvent: (event: ServerEvent) => void;
  joined: boolean;
  connecting: boolean;
  participants: VoiceParticipant[];
  muteAll: boolean;
  disabled: boolean;
  micMuted: boolean;
  speakerMuted: boolean;
  canSpeak: boolean;
  connectedPeers: number;
  error: string | null;
  join: () => Promise<void>;
  leave: () => void;
  toggleMic: () => void;
  toggleSpeaker: () => void;
  setMuteAll: (muted: boolean) => void;
  setDisabled: (disabled: boolean) => void;
  clearError: () => void;
};

function removeAudioElement(audio: HTMLAudioElement) {
  audio.pause();
  audio.srcObject = null;
  audio.remove();
}

export function useVoiceRoom({
  enabled,
  send,
  playerId,
  phase,
  spectator,
  status,
}: UseVoiceRoomOptions): VoiceRoom {
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [muteAll, setMuteAll] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sendRef = useRef(send);
  const playerIdRef = useRef(playerId);
  const phaseRef = useRef(phase);
  const spectatorRef = useRef(spectator);
  const enabledRef = useRef(enabled);

  // Keep callbacks stable while still reading the latest props. Effects run in
  // declaration order, so these refs are fresh before the state-sync effect
  // below touches the microphone.
  useEffect(() => {
    sendRef.current = send;
    playerIdRef.current = playerId;
    phaseRef.current = phase;
    spectatorRef.current = spectator;
    enabledRef.current = enabled;
  }, [send, playerId, phase, spectator, enabled]);

  const joinedRef = useRef(false);
  const connectingRef = useRef(false);
  const desiredJoinRef = useRef(false);
  const micMutedRef = useRef(false);
  const speakerMutedRef = useRef(false);
  const muteAllRef = useRef(false);
  const disabledRef = useRef(false);
  const sentSpeakingRef = useRef(false);
  const participantsRef = useRef<VoiceParticipant[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const audioRef = useRef(new Map<string, HTMLAudioElement>());
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const negotiatedRef = useRef(new Set<string>());
  const retryTimersRef = useRef(new Map<string, number>());
  // Assigned after `createPeer` is declared so its connection-retry callback can
  // recreate itself without capturing an out-of-date closure.
  const createPeerRef = useRef<((peerId: string) => RTCPeerConnection | undefined) | null>(
    null,
  );

  const computeCanSpeak = useCallback(
    () =>
      enabledRef.current &&
      joinedRef.current &&
      !disabledRef.current &&
      !muteAllRef.current &&
      !micMutedRef.current &&
      phaseRef.current !== "voting" &&
      phaseRef.current !== "revote" &&
      !spectatorRef.current,
    [],
  );

  const countConnectedPeers = useCallback(() => {
    let count = 0;
    for (const pc of peersRef.current.values()) {
      if (pc.connectionState === "connected") count += 1;
    }
    return count;
  }, []);

  const clearRetry = useCallback((peerId: string) => {
    const timer = retryTimersRef.current.get(peerId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      retryTimersRef.current.delete(peerId);
    }
  }, []);

  const closePeer = useCallback(
    (peerId: string) => {
      clearRetry(peerId);
      const pc = peersRef.current.get(peerId);
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.onnegotiationneeded = null;
        pc.close();
        peersRef.current.delete(peerId);
      }
      const audio = audioRef.current.get(peerId);
      if (audio) {
        removeAudioElement(audio);
        audioRef.current.delete(peerId);
      }
      pendingIceRef.current.delete(peerId);
      negotiatedRef.current.delete(peerId);
      setConnectedPeers(countConnectedPeers());
    },
    [clearRetry, countConnectedPeers],
  );

  const closeAllPeers = useCallback(() => {
    for (const peerId of [...peersRef.current.keys()]) closePeer(peerId);
    setConnectedPeers(0);
  }, [closePeer]);

  const sendSignal = useCallback((targetId: string, signal: VoiceSignal) => {
    sendRef.current({ type: "voice.signal", targetId, signal });
  }, []);

  const createPeer = useCallback(
    (peerId: string) => {
      const stream = localStreamRef.current;
      if (!stream || peersRef.current.has(peerId) || peerId === playerIdRef.current) {
        return peersRef.current.get(peerId);
      }

      let pc: RTCPeerConnection;
      try {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      } catch {
        setError("Voice could not start with the configured ICE servers.");
        return undefined;
      }
      for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);

      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.muted = speakerMutedRef.current;
      audio.dataset.voicePlayer = peerId;
      audio.className = "voice-audio";
      document.body.appendChild(audio);
      audioRef.current.set(peerId, audio);

      pc.ontrack = (event) => {
        const remote = event.streams[0] ?? new MediaStream([event.track]);
        audio.srcObject = remote;
        void audio.play().catch(() => {
          setError("Audio playback was blocked. Use the speaker button to retry.");
        });
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        sendSignal(peerId, {
          type: "candidate",
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment,
        });
      };

      pc.onconnectionstatechange = () => {
        setConnectedPeers(countConnectedPeers());
        if (pc.connectionState !== "failed") return;
        clearRetry(peerId);
        const timer = window.setTimeout(() => {
          retryTimersRef.current.delete(peerId);
          if (!joinedRef.current) return;
          if (!participantsRef.current.some((participant) => participant.playerId === peerId)) {
            return;
          }
          closePeer(peerId);
          createPeerRef.current?.(peerId);
        }, 1_200);
        retryTimersRef.current.set(peerId, timer);
      };

      // Deterministic initiator: the lower player id offers. This avoids glare
      // without needing a perfect-negotiation state machine for an audio-only
      // mesh.
      pc.onnegotiationneeded = () => {
        if (!playerIdRef.current || playerIdRef.current >= peerId) return;
        if (negotiatedRef.current.has(peerId)) return;
        if (pc.signalingState !== "stable") return;
        negotiatedRef.current.add(peerId);
        void (async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (offer.sdp) sendSignal(peerId, { type: "offer", sdp: offer.sdp });
          } catch {
            negotiatedRef.current.delete(peerId);
          }
        })();
      };

      peersRef.current.set(peerId, pc);
      setConnectedPeers(countConnectedPeers());
      return pc;
    },
    [clearRetry, closePeer, countConnectedPeers, sendSignal],
  );

  useEffect(() => {
    createPeerRef.current = createPeer;
  }, [createPeer]);

  const syncPeers = useCallback(
    (next: VoiceParticipant[]) => {
      if (!joinedRef.current) return;
      const ids = new Set(next.map((participant) => participant.playerId));
      for (const peerId of [...peersRef.current.keys()]) {
        if (!ids.has(peerId)) closePeer(peerId);
      }
      for (const id of ids) {
        if (id !== playerIdRef.current) createPeer(id);
      }
    },
    [closePeer, createPeer],
  );

  const handleSignal = useCallback(
    async (fromId: string, signal: VoiceSignal) => {
      if (!joinedRef.current) return;
      const pc = createPeer(fromId);
      if (!pc) return;

      try {
        if (signal.type === "candidate") {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(signal);
          } else {
            const queued = pendingIceRef.current.get(fromId) ?? [];
            queued.push(signal);
            pendingIceRef.current.set(fromId, queued);
          }
          return;
        }

        await pc.setRemoteDescription({ type: signal.type, sdp: signal.sdp });
        const queued = pendingIceRef.current.get(fromId) ?? [];
        pendingIceRef.current.delete(fromId);
        for (const candidate of queued) {
          await pc.addIceCandidate(candidate).catch(() => {
            // Candidates can expire while a connection is being replaced.
          });
        }

        if (signal.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (answer.sdp) sendSignal(fromId, { type: "answer", sdp: answer.sdp });
        }
      } catch {
        // A stale offer/answer from a replaced peer is safe to drop.
      }
    },
    [createPeer, sendSignal],
  );

  const stopSpeakingDetection = useCallback(() => {
    if (speakingTimerRef.current !== null) {
      window.clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {
        // Already closed.
      });
      audioContextRef.current = null;
    }
  }, []);

  const startSpeakingDetection = useCallback(
    (stream: MediaStream) => {
      stopSpeakingDetection();
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      try {
        const context = new AudioContextCtor();
        audioContextRef.current = context;
        void context.resume().catch(() => {});
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.65;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        // Keep the speaking flag up briefly across the gaps between words so a
        // normal sentence does not toggle the server state several times a
        // second. Roughly three ticks at 180 ms.
        let holdTicks = 0;

        speakingTimerRef.current = window.setInterval(() => {
          if (!joinedRef.current || !localStreamRef.current) return;
          analyser.getByteTimeDomainData(data);
          let energy = 0;
          for (const sample of data) {
            const value = (sample - 128) / 128;
            energy += value * value;
          }
          const loud = Math.sqrt(energy / data.length) > 0.035;
          const canSpeak = computeCanSpeak();
          if (!canSpeak) holdTicks = 0;
          if (loud && canSpeak) holdTicks = 3;
          else if (holdTicks > 0) holdTicks -= 1;
          const speaking = canSpeak && (loud || holdTicks > 0);
          if (speaking === sentSpeakingRef.current) return;
          sentSpeakingRef.current = speaking;
          sendRef.current({ type: "voice.speaking", speaking });
        }, 180);
      } catch {
        // Speaking detection is a visual nicety; voice still works without it.
      }
    },
    [computeCanSpeak, stopSpeakingDetection],
  );

  const applyMicState = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const canSpeak = computeCanSpeak();
    for (const track of stream.getAudioTracks()) {
      track.enabled = canSpeak;
    }
    if (!canSpeak && sentSpeakingRef.current) {
      sentSpeakingRef.current = false;
      sendRef.current({ type: "voice.speaking", speaking: false });
    }
  }, [computeCanSpeak]);

  const join = useCallback(async () => {
    if (!enabledRef.current || disabledRef.current || joinedRef.current || connectingRef.current) {
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("This browser does not support microphone capture.");
      return;
    }

    connectingRef.current = true;
    setConnecting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      desiredJoinRef.current = true;
      joinedRef.current = true;
      setJoined(true);
      applyMicState();
      startSpeakingDetection(stream);
      sendRef.current({ type: "voice.join" });
      sendRef.current({ type: "voice.mute", muted: micMutedRef.current });
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access was blocked. Allow it in the browser and try again."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "Could not start voice chat.",
      );
      desiredJoinRef.current = false;
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  }, [applyMicState, startSpeakingDetection]);

  const leave = useCallback(() => {
    desiredJoinRef.current = false;
    joinedRef.current = false;
    setJoined(false);
    setParticipants([]);
    participantsRef.current = [];
    sendRef.current({ type: "voice.leave" });
    if (sentSpeakingRef.current) {
      sentSpeakingRef.current = false;
      sendRef.current({ type: "voice.speaking", speaking: false });
    }
    closeAllPeers();
    stopSpeakingDetection();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, [closeAllPeers, stopSpeakingDetection]);

  const toggleMic = useCallback(() => {
    const next = !micMutedRef.current;
    micMutedRef.current = next;
    setMicMuted(next);
    if (!joinedRef.current) return;
    sendRef.current({ type: "voice.mute", muted: next });
    if (next && sentSpeakingRef.current) {
      sentSpeakingRef.current = false;
      sendRef.current({ type: "voice.speaking", speaking: false });
    }
    // A self-muted track must also be disabled locally, not just reported.
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next && computeCanSpeak();
    });
  }, [computeCanSpeak]);

  const toggleSpeaker = useCallback(() => {
    const next = !speakerMutedRef.current;
    speakerMutedRef.current = next;
    setSpeakerMuted(next);
    for (const audio of audioRef.current.values()) audio.muted = next;
    if (!next) {
      for (const audio of audioRef.current.values()) {
        void audio.play().catch(() => {
          setError("Audio playback is still blocked by the browser.");
        });
      }
    }
  }, []);

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      if (event.type === "voice.signal") {
        void handleSignal(event.fromId, event.signal);
        return;
      }
      if (event.type !== "voice.state") return;

      participantsRef.current = event.participants;
      setParticipants(event.participants);
      muteAllRef.current = event.muteAll;
      setMuteAll(event.muteAll);
      disabledRef.current = event.disabled;
      setDisabled(event.disabled);
      applyMicState();

      if (!joinedRef.current) return;
      if (event.disabled) {
        closeAllPeers();
        return;
      }

      if (
        desiredJoinRef.current &&
        playerIdRef.current &&
        !event.participants.some((participant) => participant.playerId === playerIdRef.current)
      ) {
        sendRef.current({ type: "voice.join" });
        return;
      }
      syncPeers(event.participants);
    },
    [applyMicState, closeAllPeers, handleSignal, syncPeers],
  );

  // A socket reconnect loses the server's ephemeral voice membership. Rejoin
  // automatically while keeping the same local microphone stream.
  useEffect(() => {
    if (status !== "connected") return;
    if (!desiredJoinRef.current || disabledRef.current || !localStreamRef.current) return;
    sendRef.current({ type: "voice.join" });
    sendRef.current({ type: "voice.mute", muted: micMutedRef.current });
  }, [status]);

  useEffect(() => {
    applyMicState();
  }, [applyMicState, phase, spectator, muteAll, micMuted, disabled, joined, enabled]);

  useEffect(() => {
    if (!enabled && joinedRef.current) leave();
  }, [enabled, leave]);

  useEffect(() => {
    // Capture the stable container objects: these maps are created once and
    // never replaced, so cleanup sees every peer added during the session.
    const retryTimers = retryTimersRef.current;
    const peers = peersRef.current;
    const audios = audioRef.current;
    return () => {
      if (speakingTimerRef.current !== null) {
        window.clearInterval(speakingTimerRef.current);
        speakingTimerRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      for (const timer of retryTimers.values()) window.clearTimeout(timer);
      retryTimers.clear();
      for (const pc of peers.values()) pc.close();
      peers.clear();
      for (const audio of audios.values()) removeAudioElement(audio);
      audios.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, []);

  const canSpeak =
    enabled &&
    joined &&
    !disabled &&
    !muteAll &&
    !micMuted &&
    phase !== "voting" &&
    phase !== "revote" &&
    !spectator;

  return {
    handleEvent,
    joined,
    connecting,
    participants,
    muteAll,
    disabled,
    micMuted,
    speakerMuted,
    canSpeak,
    connectedPeers,
    error,
    join,
    leave,
    toggleMic,
    toggleSpeaker,
    setMuteAll: (muted) => sendRef.current({ type: "voice.host", muteAll: muted }),
    setDisabled: (next) => sendRef.current({ type: "voice.host", disabled: next }),
    clearError: () => setError(null),
  };
}

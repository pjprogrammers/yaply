import { describe, expect, it } from "vitest";
import { createAndJoin } from "./helpers";

type VoiceHarness = Awaited<ReturnType<typeof createAndJoin>>;

function voiceStateOf(room: VoiceHarness, socketIndex = 0) {
  return room.sockets[socketIndex]!.last("voice.state");
}

function participantOf(room: VoiceHarness, playerId: string, socketIndex = 0) {
  return voiceStateOf(room, socketIndex).participants.find(
    (participant: { playerId: string }) => participant.playerId === playerId,
  );
}

async function joinVoice(room: VoiceHarness, socketIndex: number) {
  await room.sockets[socketIndex]!.message({ type: "voice.join" });
}

async function startSpyGame(room: VoiceHarness) {
  await room.sockets[0]!.message({ type: "room.start" });
}

describe("Who's the Spy voice room", () => {
  it("tracks joins, mutes and leaves in one broadcast state", async () => {
    const room = await createAndJoin("whos-the-spy", ["Alice", "Bob", "Cara"]);

    // Welcome already includes an empty voice state so a client can render the
    // join button before any other event arrives.
    expect(voiceStateOf(room).participants).toEqual([]);

    await joinVoice(room, 0);
    let state = voiceStateOf(room, 1);
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0]).toEqual({
      playerId: room.playerIds[0],
      micMuted: false,
      speaking: false,
    });

    await joinVoice(room, 1);
    state = voiceStateOf(room, 0);
    expect(state.participants.map((entry: { playerId: string }) => entry.playerId)).toEqual(
      room.playerIds.slice(0, 2),
    );

    await room.sockets[1]!.message({ type: "voice.speaking", speaking: true });
    expect(participantOf(room, room.playerIds[1]!).speaking).toBe(true);

    await room.sockets[1]!.message({ type: "voice.mute", muted: true });
    expect(participantOf(room, room.playerIds[1]!).micMuted).toBe(true);
    expect(participantOf(room, room.playerIds[1]!).speaking).toBe(false);
    await room.sockets[1]!.message({ type: "voice.mute", muted: false });
    expect(participantOf(room, room.playerIds[1]!).micMuted).toBe(false);

    await room.sockets[1]!.message({ type: "voice.leave" });
    expect(voiceStateOf(room).participants).toHaveLength(1);
    expect(voiceStateOf(room).participants[0].playerId).toBe(room.playerIds[0]);
  });

  it("relays signaling only between joined peers and never broadcasts it", async () => {
    const room = await createAndJoin("whos-the-spy", ["Alice", "Bob", "Cara"]);
    await joinVoice(room, 0);
    await joinVoice(room, 1);

    await room.sockets[0]!.message({
      type: "voice.signal",
      targetId: room.playerIds[1],
      signal: { type: "offer", sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n" },
    });

    const offer = room.sockets[1]!.last("voice.signal");
    expect(offer).toEqual({
      type: "voice.signal",
      fromId: room.playerIds[0],
      signal: { type: "offer", sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n" },
    });
    // The third seat never joined voice, so the offer must not leak to it.
    expect(room.sockets[2]!.events("voice.signal")).toHaveLength(0);

    const candidate = {
      type: "candidate" as const,
      candidate: "candidate:1 1 udp 2122260223 192.168.1.2 54321 typ host",
      sdpMid: "0",
      sdpMLineIndex: 0,
    };
    await room.sockets[1]!.message({
      type: "voice.signal",
      targetId: room.playerIds[0],
      signal: candidate,
    });
    expect(room.sockets[0]!.last("voice.signal")).toEqual({
      type: "voice.signal",
      fromId: room.playerIds[1],
      signal: candidate,
    });

    // A member who never joined the voice room cannot inject a relay.
    const before = room.sockets[0]!.events("voice.signal").length;
    await room.sockets[2]!.message({
      type: "voice.signal",
      targetId: room.playerIds[0],
      signal: { type: "offer", sdp: "v=0" },
    });
    expect(room.sockets[0]!.events("voice.signal")).toHaveLength(before);
    expect(room.sockets[2]!.events("voice.signal")).toHaveLength(0);
  });

  it("lets only the host mute all, disable and re-enable voice", async () => {
    const room = await createAndJoin("whos-the-spy", ["Alice", "Bob", "Cara"]);
    await joinVoice(room, 0);
    await joinVoice(room, 1);
    await room.sockets[0]!.message({ type: "voice.speaking", speaking: true });
    expect(participantOf(room, room.playerIds[0]!).speaking).toBe(true);

    await room.sockets[1]!.message({ type: "voice.host", muteAll: true });
    expect(room.sockets[1]!.last("room.error").code).toBe("NOT_HOST");
    expect(voiceStateOf(room).muteAll).toBe(false);

    await room.sockets[0]!.message({ type: "voice.host", muteAll: true });
    let state = voiceStateOf(room, 1);
    expect(state.muteAll).toBe(true);
    expect(
      state.participants.find((entry: { playerId: string }) => entry.playerId === room.playerIds[0])
        .speaking,
    ).toBe(false);

    // The server rejects a speaking flag while every mic is muted.
    await room.sockets[1]!.message({ type: "voice.speaking", speaking: true });
    expect(participantOf(room, room.playerIds[1]!).speaking).toBe(false);

    await room.sockets[0]!.message({ type: "voice.host", disabled: true });
    state = voiceStateOf(room, 1);
    expect(state.disabled).toBe(true);

    // Existing members stay in the map so re-enabling can reconnect peers, but
    // a new seat cannot join while the room is closed.
    expect(state.participants).toHaveLength(2);
    await joinVoice(room, 2);
    expect(room.sockets[2]!.last("room.error").code).toBe("VOICE_DISABLED");
    expect(voiceStateOf(room).participants).toHaveLength(2);

    await room.sockets[0]!.message({ type: "voice.host", disabled: false });
    expect(voiceStateOf(room).disabled).toBe(false);
    await joinVoice(room, 2);
    expect(voiceStateOf(room).participants).toHaveLength(3);

    // Leaving mute-all must not resurrect a stale speaking flag.
    await room.sockets[0]!.message({ type: "voice.host", muteAll: false });
    expect(voiceStateOf(room).muteAll).toBe(false);
    expect(participantOf(room, room.playerIds[0]!).speaking).toBe(false);
  });

  it("closes microphones during voting and reopens them afterwards", async () => {
    const room = await createAndJoin("whos-the-spy", ["Alice", "Bob", "Cara"]);
    await startSpyGame(room);
    const socket = (room.harness.room as any);

    await joinVoice(room, 0);
    await room.sockets[0]!.message({ type: "voice.speaking", speaking: true });
    expect(participantOf(room, room.playerIds[0]!).speaking).toBe(true);

    socket.room.phase = "voting";
    socket.broadcastSpyPhase();
    expect(participantOf(room, room.playerIds[0]!).speaking).toBe(false);

    await room.sockets[0]!.message({ type: "voice.speaking", speaking: true });
    expect(participantOf(room, room.playerIds[0]!).speaking).toBe(false);

    // Elimination is not a vote, and the microphone opens again for the reveal.
    socket.room.phase = "elimination";
    socket.broadcastSpyPhase();
    await room.sockets[0]!.message({ type: "voice.speaking", speaking: true });
    expect(participantOf(room, room.playerIds[0]!).speaking).toBe(true);
  });

  it("keeps eliminated players listening and opens their mic at results", async () => {
    const room = await createAndJoin("whos-the-spy", ["Alice", "Bob", "Cara"]);
    await startSpyGame(room);
    const socket = (room.harness.room as any);
    const eliminatedId = room.playerIds[1]!;
    socket.room.spy.eliminatedIds.push(eliminatedId);
    socket.refreshVoiceLocks();

    await joinVoice(room, 1);
    await room.sockets[1]!.message({ type: "voice.speaking", speaking: true });
    expect(participantOf(room, eliminatedId).speaking).toBe(false);
    // They still receive voice state and stay in the room as listeners.
    expect(voiceStateOf(room, 1).participants).toHaveLength(1);

    socket.room.phase = "results";
    socket.broadcastSpyPhase();
    await room.sockets[1]!.message({ type: "voice.speaking", speaking: true });
    expect(participantOf(room, eliminatedId).speaking).toBe(true);
  });

  it("refuses voice when the room setting is off", async () => {
    const room = await createAndJoin("whos-the-spy", ["Alice", "Bob", "Cara"]);
    (room.harness.room as any).room.settings.spyVoiceChat = false;

    await joinVoice(room, 0);
    expect(room.sockets[0]!.last("room.error").code).toBe("VOICE_DISABLED");
    expect(voiceStateOf(room).participants).toEqual([]);
  });

  it("drops a host-removed player from the voice room immediately", async () => {
    const room = await createAndJoin("whos-the-spy", ["Alice", "Bob", "Cara"]);
    await joinVoice(room, 0);
    await joinVoice(room, 1);
    expect(voiceStateOf(room).participants).toHaveLength(2);

    await room.sockets[0]!.message({
      type: "room.player.remove",
      playerId: room.playerIds[1],
    });

    expect(voiceStateOf(room).participants.map((entry: { playerId: string }) => entry.playerId)).toEqual([
      room.playerIds[0],
    ]);
    expect(room.sockets[1]!.last("room.error").code).toBe("REMOVED_BY_HOST");
  });
});

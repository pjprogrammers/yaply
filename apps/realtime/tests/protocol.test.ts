import { describe, expect, it } from "vitest";
import {
  ClientEventSchema,
  ServerEventSchema,
  parseClientEvent,
  parseServerEvent,
} from "@yaply/shared/schemas";
import {
  generateRoomCode,
  normalizeHttpUrl,
  normalizeRealtimeBaseUrl,
  realtimeHttpOrigin,
  resolveRealtimeBaseUrl,
} from "@yaply/shared/config";
import { PROTOCOL_VERSION } from "@yaply/shared/constants";

describe("client event validation", () => {
  it("accepts a well formed join", () => {
    const result = parseClientEvent({
      type: "room.join",
      protocolVersion: PROTOCOL_VERSION,
      game: "skribbl",
      code: "ABC123",
      nickname: "Alice",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.code).toBe("abc123");
  });

  it("rejects unknown fields that could bypass validation", () => {
    const result = parseClientEvent({
      type: "room.create",
      protocolVersion: PROTOCOL_VERSION,
      game: "skribbl",
      nickname: "Alice",
      isHost: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid coordinates", () => {
    const result = ClientEventSchema.safeParse({
      type: "drawing.stroke",
      strokeId: "s1",
      color: "#ffffff",
      width: 4,
      points: [{ x: 1.4, y: -0.2 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-hex colours", () => {
    const result = ClientEventSchema.safeParse({
      type: "drawing.stroke",
      strokeId: "s1",
      color: "url(javascript:alert(1))",
      width: 4,
      points: [{ x: 0.1, y: 0.2 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized stroke batches", () => {
    const result = ClientEventSchema.safeParse({
      type: "drawing.stroke",
      strokeId: "s1",
      color: "#ffffff",
      width: 4,
      points: Array.from({ length: 200 }, () => ({ x: 0.5, y: 0.5 })),
    });
    expect(result.success).toBe(false);
  });

  it("rejects chat over the maximum length", () => {
    const result = ClientEventSchema.safeParse({ type: "chat.guess", text: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects room codes with the wrong shape", () => {
    const result = ClientEventSchema.safeParse({
      type: "room.join",
      protocolVersion: PROTOCOL_VERSION,
      game: "skribbl",
      code: "../../etc",
      nickname: "Alice",
    });
    expect(result.success).toBe(false);
  });
});

describe("server event validation", () => {
  const snapshot = {
    code: "abc123",
    game: "skribbl",
    phase: "lobby",
    hostId: "p1",
    players: [
      {
        id: "p1",
        nickname: "Alice",
        avatar: "A",
        color: "#4cb3f0",
        score: 0,
        connected: true,
        guessedCorrectly: false,
        joinedAt: 1,
      },
    ],
    settings: {
      maxPlayers: 8,
      rounds: 3,
      drawingTimeSeconds: 80,
      language: "en",
      allowLateJoin: false,
      wordCount: 3,
      turnTimeSeconds: 45,
    },
    roundNumber: 0,
    drawerId: null,
    maskedWord: null,
    endsAt: null,
    strokes: [],
    chain: null,
    version: 1,
  };

  it("accepts a valid snapshot event", () => {
    expect(ServerEventSchema.safeParse({ type: "room.snapshot", snapshot }).success).toBe(true);
  });

  it("rejects an unknown server event", () => {
    expect(parseServerEvent({ type: "server.shutdown", reason: "x" }).success).toBe(false);
  });

  it("rejects a malformed snapshot", () => {
    expect(
      parseServerEvent({ type: "room.snapshot", snapshot: { ...snapshot, players: "nope" } }).success,
    ).toBe(false);
  });
});

describe("realtime URL configuration", () => {
  it("normalizes https URLs to wss and adds the room path", () => {
    expect(normalizeRealtimeBaseUrl("https://realtime.example.com")).toBe(
      "wss://realtime.example.com/room",
    );
    expect(normalizeRealtimeBaseUrl("wss://realtime.example.com/room/")).toBe(
      "wss://realtime.example.com/room",
    );
  });

  it("falls back to localhost only in local development", () => {
    expect(resolveRealtimeBaseUrl(undefined, { hostname: "localhost" })).toBe(
      "ws://localhost:8787/room",
    );
    expect(resolveRealtimeBaseUrl(undefined, { hostname: "yaply.example.com" })).toBe("");
  });

  it("derives the HTTP origin for room creation", () => {
    expect(realtimeHttpOrigin("wss://realtime.example.com/room")).toBe("https://realtime.example.com");
    expect(realtimeHttpOrigin("ws://localhost:8787/room")).toBe("http://localhost:8787");
  });

  it("normalizes public http URLs and rejects malformed values", () => {
    expect(normalizeHttpUrl("https://example.com/", "https://fallback.test")).toBe(
      "https://example.com",
    );
    expect(normalizeHttpUrl("http://example.com/path/", "https://fallback.test")).toBe(
      "http://example.com/path",
    );
    expect(normalizeHttpUrl("example.com", "https://fallback.test")).toBe(
      "https://fallback.test",
    );
    expect(normalizeHttpUrl("javascript:alert(1)", "https://fallback.test")).toBe(
      "https://fallback.test",
    );
    expect(normalizeHttpUrl(undefined, "https://fallback.test")).toBe(
      "https://fallback.test",
    );
  });

  it("generates room codes from the unambiguous alphabet", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateRoomCode()).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{6}$/);
    }
  });
});

import { z } from "zod";
import { MAX_CHAT_LENGTH, MAX_NICKNAME_LENGTH, MAX_STROKE_ID_LENGTH, MAX_STROKE_POINTS_PER_MESSAGE } from "./constants";

const noControlCharacters = (value: string) => !/[\u0000-\u001f\u007f]/.test(value);

export const NicknameSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_NICKNAME_LENGTH)
  .refine(noControlCharacters, "Nickname contains control characters");

export const RoomCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{6}$/i, "Room codes are six letters or digits")
  .transform((value) => value.toLowerCase());

export const GameKindSchema = z.enum(["skribbl", "chain"]);

export const ProtocolVersionSchema = z.number().int().optional();

export const PointSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  })
  .strict();

export const StrokeColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value");

export const GameSettingsSchema = z
  .object({
    maxPlayers: z.number().int().min(2).max(12).optional(),
    rounds: z.number().int().min(1).max(10).optional(),
    drawingTimeSeconds: z.number().int().min(30).max(180).optional(),
    language: z.literal("en").optional(),
    allowLateJoin: z.boolean().optional(),
    wordCount: z.number().int().min(2).max(5).optional(),
    turnTimeSeconds: z.number().int().min(15).max(120).optional(),
  })
  .strict();

export const ClientEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("room.create"),
      protocolVersion: ProtocolVersionSchema,
      game: GameKindSchema,
      nickname: NicknameSchema,
      settings: GameSettingsSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("room.join"),
      protocolVersion: ProtocolVersionSchema,
      code: RoomCodeSchema,
      game: GameKindSchema,
      nickname: NicknameSchema,
      resumeToken: z.string().min(8).max(128).optional(),
    })
    .strict(),
  z.object({ type: z.literal("room.leave") }).strict(),
  z.object({ type: z.literal("room.start") }).strict(),
  z.object({ type: z.literal("room.settings.update"), settings: GameSettingsSchema }).strict(),
  z.object({ type: z.literal("game.word.choose"), wordId: z.string().min(1).max(16) }).strict(),
  z
    .object({
      type: z.literal("drawing.stroke"),
      strokeId: z.string().min(1).max(MAX_STROKE_ID_LENGTH),
      color: StrokeColorSchema,
      width: z.number().int().min(1).max(20),
      points: z.array(PointSchema).max(MAX_STROKE_POINTS_PER_MESSAGE),
      done: z.boolean().optional(),
    })
    .strict(),
  z.object({ type: z.literal("drawing.undo"), strokeId: z.string().max(MAX_STROKE_ID_LENGTH).optional() }).strict(),
  z.object({ type: z.literal("drawing.clear") }).strict(),
  z
    .object({
      type: z.literal("chat.guess"),
      text: z.string().trim().min(1).max(MAX_CHAT_LENGTH),
    })
    .strict(),
  z
    .object({
      type: z.literal("chain.place"),
      row: z.number().int().min(0).max(20),
      col: z.number().int().min(0).max(20),
    })
    .strict(),
  z.object({ type: z.literal("chain.surrender") }).strict(),
  z.object({ type: z.literal("game.rematch") }).strict(),
  z.object({ type: z.literal("room.sync") }).strict(),
]);

export type ParsedClientEvent = z.infer<typeof ClientEventSchema>;

export function parseClientEvent(value: unknown): z.SafeParseReturnType<unknown, ParsedClientEvent> {
  return ClientEventSchema.safeParse(value);
}

/* ------------------------------------------------------------------------- */
/* Server to client                                                           */
/* ------------------------------------------------------------------------- */

export const PlayerSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  avatar: z.string(),
  color: z.string(),
  score: z.number(),
  connected: z.boolean(),
  guessedCorrectly: z.boolean(),
  joinedAt: z.number(),
});

export const StrokeSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  color: z.string(),
  width: z.number(),
  points: z.array(PointSchema),
});

export const ChainCellSchema = z.object({
  ownerId: z.string().nullable(),
  orbs: z.number().int().min(0),
});

export const ChainExplosionSchema = z.object({
  row: z.number().int(),
  col: z.number().int(),
  ownerId: z.string(),
});

export const ChainMoveSchema = z.object({
  playerId: z.string(),
  row: z.number().int(),
  col: z.number().int(),
  explosions: z.array(ChainExplosionSchema),
  captured: z.number().int(),
  orbsPlaced: z.number().int(),
});

export const ChainStateSchema = z.object({
  rows: z.number().int(),
  cols: z.number().int(),
  cells: z.array(ChainCellSchema),
  turnPlayerId: z.string().nullable(),
  eliminatedPlayerIds: z.array(z.string()),
  winnerId: z.string().nullable(),
  lastMove: ChainMoveSchema.nullable(),
  turnEndsAt: z.number().nullable(),
  moveCount: z.number().int(),
});

export const RankingSchema = z.object({
  playerId: z.string(),
  nickname: z.string(),
  score: z.number(),
});

export const RoomSnapshotSchema = z.object({
  code: z.string(),
  game: GameKindSchema,
  phase: z.enum(["lobby", "choosing", "drawing", "round-result", "playing", "game-over"]),
  hostId: z.string(),
  players: z.array(PlayerSchema),
  settings: z.object({
    maxPlayers: z.number(),
    rounds: z.number(),
    drawingTimeSeconds: z.number(),
    language: z.literal("en"),
    allowLateJoin: z.boolean(),
    wordCount: z.number().optional(),
    turnTimeSeconds: z.number().optional(),
  }),
  roundNumber: z.number(),
  drawerId: z.string().nullable(),
  maskedWord: z.string().nullable(),
  endsAt: z.number().nullable(),
  strokes: z.array(StrokeSchema),
  chain: ChainStateSchema.nullable(),
  rankings: z.array(RankingSchema).optional(),
  winnerId: z.string().nullable().optional(),
  version: z.number(),
});

export const ServerEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("room.snapshot"), snapshot: RoomSnapshotSchema }),
  z.object({
    type: z.literal("room.welcome"),
    playerId: z.string(),
    resumeToken: z.string(),
    protocolVersion: z.number().int(),
  }),
  z.object({ type: z.literal("room.player.joined"), playerId: z.string() }),
  z.object({ type: z.literal("room.player.left"), playerId: z.string() }),
  z.object({ type: z.literal("room.closed"), reason: z.string() }),
  z.object({ type: z.literal("room.error"), code: z.string(), message: z.string() }),
  z.object({
    type: z.literal("game.word.choices"),
    choices: z.array(z.object({ id: z.string(), display: z.string() })),
  }),
  z.object({ type: z.literal("game.word.selected"), word: z.string() }),
  z.object({ type: z.literal("game.word.hint"), maskedWord: z.string() }),
  z.object({
    type: z.literal("drawing.stroke"),
    strokeId: z.string(),
    playerId: z.string(),
    color: z.string(),
    width: z.number(),
    points: z.array(PointSchema),
    done: z.boolean(),
  }),
  z.object({ type: z.literal("drawing.undo"), strokeId: z.string() }),
  z.object({ type: z.literal("drawing.clear") }),
  z.object({
    type: z.literal("chat.message"),
    playerId: z.string(),
    nickname: z.string(),
    text: z.string(),
    createdAt: z.number(),
    system: z.boolean().optional(),
    private: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("game.correct-guess"),
    playerId: z.string(),
    nickname: z.string(),
    points: z.number(),
  }),
  z.object({
    type: z.literal("game.round.ended"),
    reason: z.enum(["all-guessed", "timeout", "drawer-disconnected"]),
    word: z.string(),
    rankings: z.array(RankingSchema),
  }),
  z.object({ type: z.literal("chain.move"), move: ChainMoveSchema, snapshot: RoomSnapshotSchema }),
  z.object({ type: z.literal("chain.turn.timeout"), playerId: z.string() }),
  z.object({
    type: z.literal("game.finished"),
    rankings: z.array(RankingSchema),
    winnerId: z.string().optional(),
  }),
]);

export function parseServerEvent(value: unknown): z.SafeParseReturnType<unknown, z.infer<typeof ServerEventSchema>> {
  return ServerEventSchema.safeParse(value);
}

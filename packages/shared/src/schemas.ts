import { z } from "zod";
import {
  MAX_CHAT_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_STROKE_ID_LENGTH,
  MAX_STROKE_POINTS_PER_MESSAGE,
  SMASH_MAX_PLAYERS,
} from "./constants";

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

export const GameKindSchema = z.enum(["skribbl", "chain", "smashkarts"]);

export const WordLanguageSchema = z.enum(["en", "tl", "ja", "ko"]);

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
    maxPlayers: z.number().int().min(2).max(SMASH_MAX_PLAYERS).optional(),
    rounds: z.number().int().min(1).max(10).optional(),
    drawingTimeSeconds: z.number().int().min(30).max(180).optional(),
    language: WordLanguageSchema.optional(),
    allowLateJoin: z.boolean().optional(),
    wordCount: z.number().int().min(2).max(5).optional(),
    turnTimeSeconds: z.number().int().min(15).max(120).optional(),
    playerCount: z.number().int().min(2).max(SMASH_MAX_PLAYERS).optional(),
    boardSize: z.enum(["small", "medium", "large", "xxl"]).optional(),
    palette: z.enum(["classic", "vivid", "pastel", "neon", "mono", "custom"]).optional(),
    customColors: z.array(StrokeColorSchema).max(8).optional(),
    theme: z.enum(["dark", "light", "neon"]).optional(),
    gridStyle: z.enum(["2d", "3d"]).optional(),
    confirmMoves: z.boolean().optional(),
    vsCpu: z.boolean().optional(),
    cpuDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
    mapId: z.enum(["foundry", "scrapyard", "rooftop"]).optional(),
    killTarget: z.number().int().min(5).max(100).optional(),
    durationSeconds: z.number().int().min(60).max(1800).optional(),
  })
  .strict();

export const SmashInputSchema = z
  .object({
    /** Optional for compatibility with clients from before input sequencing. */
    seq: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
    throttle: z.number().min(-1).max(1),
    steer: z.number().min(-1).max(1),
    drift: z.boolean(),
    fire: z.boolean(),
  })
  .strict();

const SmashWeaponSchema = z.enum([
  "machinegun",
  "bullets",
  "rockets",
  "cannonballs",
  "nuke",
  "grenuke",
  "snowball",
  "mines",
  "spikey",
  "invincibility",
  "fakebox",
]);
const SmashWeaponSlotSchema = z.union([SmashWeaponSchema, z.literal("none")]);
const SmashProjectileKindSchema = z.enum([
  "tracer",
  "bullet",
  "rocket",
  "cannonball",
  "nuke",
  "grenuke",
  "snowball",
]);
const SmashPositionSchema = z.number().finite().min(-512).max(512);

export const SmashKartSnapshotSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(32),
    color: StrokeColorSchema,
    x: SmashPositionSchema,
    y: z.number().finite().min(-64).max(512),
    z: SmashPositionSchema,
    yaw: z.number().finite().min(-Math.PI * 8).max(Math.PI * 8),
    hp: z.number().finite().min(0).max(1000),
    shield: z.number().finite().min(0).max(120),
    boost: z.number().finite().min(0).max(120),
    slow: z.number().finite().min(0).max(120),
    spike: z.number().finite().min(0).max(120),
    weapon: SmashWeaponSlotSchema,
    ammo: z.number().int().min(0).max(100),
    kills: z.number().int().min(0).max(100000),
    deaths: z.number().int().min(0).max(100000),
    shots: z.number().int().min(0).max(1000000),
    hits: z.number().int().min(0).max(1000000),
    alive: z.boolean(),
    respawnIn: z.number().finite().min(0).max(120),
    speed: z.number().finite().min(0).max(200),
    drifting: z.boolean(),
    driftCharge: z.number().finite().min(0).max(20),
  })
  .strict();

export const SmashMatchSnapshotSchema = z
  .object({
    phase: z.enum(["playing", "over"]),
    round: z.number().int().min(0).max(1_000_000),
    mapId: z.enum(["foundry", "scrapyard", "rooftop"]),
    timeLeft: z.number().finite().min(0).max(3600),
    killTarget: z.number().int().min(1).max(1000),
    matchSeconds: z.number().finite().min(0).max(86_400),
    karts: z.array(SmashKartSnapshotSchema).max(SMASH_MAX_PLAYERS),
    pickups: z
      .array(
        z
          .object({
            id: z.number().int().min(0).max(10_000),
            active: z.boolean(),
          })
          .strict(),
      )
      .max(64),
    projectiles: z
      .array(
        z
          .object({
            id: z.number().int().min(0).max(10_000_000),
            kind: SmashProjectileKindSchema,
            x: SmashPositionSchema,
            y: z.number().finite().min(-64).max(512),
            z: SmashPositionSchema,
            vx: z.number().finite().min(-512).max(512),
            vy: z.number().finite().min(-512).max(512),
            vz: z.number().finite().min(-512).max(512),
          })
          .strict(),
      )
      .max(128),
    traps: z
      .array(
        z
          .object({
            id: z.number().int().min(0).max(10_000_000),
            kind: z.enum(["mine", "fake"]),
            x: SmashPositionSchema,
            y: z.number().finite().min(-64).max(512),
            z: SmashPositionSchema,
          })
          .strict(),
      )
      .max(64),
    feed: z
      .array(
        z
          .object({
            id: z.number().int().min(0).max(10_000_000),
            killer: z.string().min(1).max(32),
            victim: z.string().min(1).max(32),
            weapon: SmashWeaponSchema,
            self: z.boolean(),
            at: z.number().min(0).max(1_000_000).optional(),
          })
          .strict(),
      )
      .max(16),
    winner: z
      .object({
        id: z.string().min(1).max(64),
        name: z.string().min(1).max(32),
        color: StrokeColorSchema,
        kills: z.number().int().min(0).max(100000),
      })
      .strict()
      .nullable(),
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
  z.object({ type: z.literal("smash.input"), input: SmashInputSchema }).strict(),
  z.object({ type: z.literal("smash.snapshot"), snapshot: SmashMatchSnapshotSchema }).strict(),
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
    maxPlayers: z.number().int().min(2).max(SMASH_MAX_PLAYERS),
    rounds: z.number(),
    drawingTimeSeconds: z.number(),
    language: WordLanguageSchema,
    allowLateJoin: z.boolean(),
    wordCount: z.number().optional(),
    turnTimeSeconds: z.number().optional(),
    playerCount: z.number().optional(),
    boardSize: z.enum(["small", "medium", "large", "xxl"]).optional(),
    palette: z.enum(["classic", "vivid", "pastel", "neon", "mono", "custom"]).optional(),
    customColors: z.array(StrokeColorSchema).optional(),
    theme: z.enum(["dark", "light", "neon"]).optional(),
    gridStyle: z.enum(["2d", "3d"]).optional(),
    confirmMoves: z.boolean().optional(),
    vsCpu: z.boolean().optional(),
    cpuDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
    mapId: z.enum(["foundry", "scrapyard", "rooftop"]).optional(),
    killTarget: z.number().int().min(5).max(100).optional(),
    durationSeconds: z.number().int().min(60).max(1800).optional(),
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
    type: z.literal("smash.input"),
    playerId: z.string(),
    input: SmashInputSchema,
  }),
  z.object({ type: z.literal("smash.snapshot"), snapshot: SmashMatchSnapshotSchema }),
  z.object({
    type: z.literal("game.finished"),
    rankings: z.array(RankingSchema),
    winnerId: z.string().optional(),
  }),
]);

export function parseServerEvent(value: unknown): z.SafeParseReturnType<unknown, z.infer<typeof ServerEventSchema>> {
  return ServerEventSchema.safeParse(value);
}

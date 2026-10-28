import { z } from "zod";

export const NicknameSchema = z.string().trim().min(1).max(16);

export const RoomCodeSchema = z.string().toLowerCase().length(6);

export const PointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const ClientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("room.create"), nickname: NicknameSchema, settings: z.any().optional() }),
  z.object({ type: z.literal("room.join"), code: RoomCodeSchema, nickname: NicknameSchema, resumeToken: z.string().optional() }),
  z.object({ type: z.literal("room.leave") }),
  z.object({ type: z.literal("room.start") }),
  z.object({ type: z.literal("room.settings.update"), settings: z.any() }),
  z.object({ type: z.literal("game.word.choose"), wordId: z.string() }),
  z.object({ type: z.literal("drawing.stroke"), strokeId: z.string(), color: z.string(), width: z.number().min(1).max(20), points: z.array(PointSchema).min(1).max(1000) }),
  z.object({ type: z.literal("drawing.undo") }),
  z.object({ type: z.literal("drawing.clear") }),
  z.object({ type: z.literal("chat.guess"), text: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal("game.rematch") }),
  z.object({ type: z.literal("room.sync") }),
]);

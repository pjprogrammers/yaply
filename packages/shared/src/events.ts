import type { Point, RoomSnapshot } from "./types";

export type ClientEvent =
  | { type: "room.create"; nickname: string; settings?: Partial<import("./types").GameSettings> }
  | { type: "room.join"; code: string; nickname: string; resumeToken?: string }
  | { type: "room.leave" }
  | { type: "room.start" }
  | { type: "room.settings.update"; settings: Partial<import("./types").GameSettings> }
  | { type: "game.word.choose"; wordId: string }
  | { type: "drawing.stroke"; strokeId: string; color: string; width: number; points: Point[] }
  | { type: "drawing.undo" }
  | { type: "drawing.clear" }
  | { type: "chat.guess"; text: string }
  | { type: "game.rematch" }
  | { type: "room.sync" };

export type ServerEvent =
  | { type: "room.snapshot"; snapshot: RoomSnapshot }
  | { type: "room.player.joined"; playerId: string }
  | { type: "room.player.left"; playerId: string }
  | { type: "room.error"; code: string; message: string }
  | { type: "game.word.choices"; choices: { id: string; display: string }[] }
  | { type: "game.word.hint"; maskedWord: string }
  | { type: "drawing.stroke"; strokeId: string; playerId: string; color: string; width: number; points: Point[] }
  | { type: "drawing.undo"; strokeId: string }
  | { type: "drawing.clear" }
  | { type: "chat.message"; playerId: string; nickname: string; text: string; createdAt: number }
  | { type: "game.correct-guess"; playerId: string; nickname: string; points: number }
  | { type: "game.round.ended"; reason: "all-guessed" | "timeout" | "drawer-disconnected" }
  | { type: "game.finished"; rankings: { playerId: string; nickname: string; score: number }[] };

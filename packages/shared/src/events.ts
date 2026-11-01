import type {
  ChainMove,
  GameKind,
  GameSettings,
  Point,
  Ranking,
  RoomSnapshot,
} from "./types";

export type ClientEvent =
  | {
      type: "room.create";
      protocolVersion: number;
      game: GameKind;
      nickname: string;
      settings?: Partial<GameSettings>;
    }
  | {
      type: "room.join";
      protocolVersion: number;
      code: string;
      game: GameKind;
      nickname: string;
      resumeToken?: string;
    }
  | { type: "room.leave" }
  | { type: "room.start" }
  | { type: "room.settings.update"; settings: Partial<GameSettings> }
  | { type: "game.word.choose"; wordId: string }
  | {
      type: "drawing.stroke";
      strokeId: string;
      color: string;
      width: number;
      points: Point[];
      done?: boolean;
    }
  | { type: "drawing.undo"; strokeId?: string }
  | { type: "drawing.clear" }
  | { type: "chat.guess"; text: string }
  | { type: "chain.place"; row: number; col: number }
  | { type: "chain.surrender" }
  | { type: "game.rematch" }
  | { type: "room.sync" };

export type ServerEvent =
  | { type: "room.snapshot"; snapshot: RoomSnapshot }
  | {
      type: "room.welcome";
      playerId: string;
      resumeToken: string;
      protocolVersion: number;
    }
  | { type: "room.player.joined"; playerId: string }
  | { type: "room.player.left"; playerId: string }
  | { type: "room.closed"; reason: string }
  | { type: "room.error"; code: string; message: string }
  | { type: "game.word.choices"; choices: { id: string; display: string }[] }
  | { type: "game.word.selected"; word: string }
  | { type: "game.word.hint"; maskedWord: string }
  | {
      type: "drawing.stroke";
      strokeId: string;
      playerId: string;
      color: string;
      width: number;
      points: Point[];
      done: boolean;
    }
  | { type: "drawing.undo"; strokeId: string }
  | { type: "drawing.clear" }
  | {
      type: "chat.message";
      playerId: string;
      nickname: string;
      text: string;
      createdAt: number;
      system?: boolean;
      /** True when the server applied secret-word visibility to this message. */
      private?: boolean;
    }
  | {
      type: "game.correct-guess";
      playerId: string;
      nickname: string;
      points: number;
    }
  | {
      type: "game.round.ended";
      reason: "all-guessed" | "timeout" | "drawer-disconnected";
      word: string;
      rankings: Ranking[];
    }
  | { type: "chain.move"; move: ChainMove; snapshot: RoomSnapshot }
  | { type: "chain.turn.timeout"; playerId: string }
  | {
      type: "game.finished";
      rankings: Ranking[];
      winnerId?: string;
    };

import type {
  ChainMove,
  GameKind,
  GamePhase,
  GameSettings,
  HoleioInput,
  HoleioMatchSnapshot,
  PlayerId,
  Point,
  Ranking,
  RoomSnapshot,
  SmashInput,
  SmashMatchSnapshot,
  SpyElimination,
  SpyResultReason,
  SpyRole,
  SpyTeam,
  VoiceParticipant,
  VoiceSignal,
} from "./types";

/**
 * Semantic kinds for system chat lines. The server says what happened and the
 * chat UI decides how it looks, so colours stay a presentation concern and
 * never leak into the game rules.
 */
export const CHAT_EVENT_KINDS = [
  "player_joined",
  "player_left",
  "correct_guess",
  "own_correct_guess",
  "secret",
  "liked",
  "disliked",
  "drawing_started",
  "close_guess",
  "word_revealed",
  "round_started",
  "disconnected",
  "reconnected",
  "announcement",
  "error",
  "clue",
  "vote",
  "elimination",
  "phase",
  "spectator",
] as const;

export type ChatEventKind = (typeof CHAT_EVENT_KINDS)[number];

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
  /** Host only: permanently remove another seat from the room. */
  | { type: "room.player.remove"; playerId: PlayerId }
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
  | { type: "chat.reaction"; reaction: "like" | "dislike" }
  | { type: "chain.place"; row: number; col: number }
  | { type: "chain.surrender" }
  | { type: "smash.input"; input: SmashInput }
  | { type: "smash.snapshot"; snapshot: SmashMatchSnapshot }
  | { type: "holeio.input"; input: HoleioInput }
  | { type: "holeio.snapshot"; snapshot: HoleioMatchSnapshot }
  | { type: "spy.clue"; text: string }
  | { type: "spy.ready" }
  | { type: "spy.vote"; targetId: string }
  | { type: "spy.final.guess"; word: string }
  | { type: "voice.join" }
  | { type: "voice.leave" }
  | { type: "voice.mute"; muted: boolean }
  | { type: "voice.speaking"; speaking: boolean }
  | {
      type: "voice.signal";
      targetId: PlayerId;
      signal: VoiceSignal;
    }
  /** Host only: override the room's voice channel. */
  | { type: "voice.host"; muteAll?: boolean; disabled?: boolean }
  | { type: "game.rematch" }
  /** Host only: return the finished room to its lobby instead of rematching. */
  | { type: "game.lobby" }
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
      /** Semantic event kind for system lines; the UI maps it to a colour. */
      kind?: ChatEventKind;
      /** True when the server applied secret-word visibility to this message. */
      private?: boolean;
      /** True for the eliminated-players-only spectator channel. */
      spectator?: boolean;
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
  | { type: "smash.input"; playerId: string; input: SmashInput }
  | { type: "smash.snapshot"; snapshot: SmashMatchSnapshot }
  | { type: "holeio.input"; playerId: string; input: HoleioInput }
  | { type: "holeio.snapshot"; snapshot: HoleioMatchSnapshot }
  | {
      /** Private: only the addressed player receives their own role and word. */
      type: "spy.role";
      role: SpyRole;
      word: string;
      categoryId: string;
      categoryLabel: string;
      round: number;
    }
  | { type: "spy.clue"; playerId: string; text: string; round: number; createdAt: number }
  | { type: "spy.ready"; playerId: string; readyCount: number; total: number }
  | { type: "spy.vote.progress"; cast: number; total: number }
  | { type: "spy.elimination"; elimination: SpyElimination }
  | {
      type: "spy.phase";
      phase: GamePhase;
      round: number;
      endsAt: number | null;
      activeSpeakerId: string | null;
    }
  | { type: "spy.final-guess.result"; playerId: string; correct: boolean }
  | {
      type: "spy.results";
      winnerTeam: SpyTeam;
      reason: SpyResultReason;
      civilianWord: string;
      spyWord: string;
      roles: Record<string, SpyRole>;
      rankings: Ranking[];
    }
  | {
      type: "voice.state";
      participants: VoiceParticipant[];
      muteAll: boolean;
      disabled: boolean;
    }
  | { type: "voice.signal"; fromId: PlayerId; signal: VoiceSignal }
  | {
      type: "game.finished";
      rankings: Ranking[];
      winnerId?: string;
    };

export const PROTOCOL_VERSION = 1;

export const DEFAULT_GAME_SETTINGS = {
  maxPlayers: 8,
  rounds: 3,
  drawingTimeSeconds: 80,
  language: "en" as const,
  allowLateJoin: false,
  wordCount: 3,
  turnTimeSeconds: 45,
};

export const ROOM_CODE_LENGTH = 6;
/**
 * Ambiguous characters (0/o, 1/l/i) are deliberately excluded so a room code
 * can be read out loud or copied from a screen without mistakes.
 */
export const ROOM_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const ROOM_CODE_PATTERN = /^[a-z0-9]{6}$/;

export const MAX_NICKNAME_LENGTH = 16;
export const MAX_CHAT_LENGTH = 200;
export const MAX_STROKES_PER_ROUND = 500;
export const MAX_POINTS_PER_STROKE = 1000;
export const MAX_STROKE_POINTS_PER_MESSAGE = 128;
export const MAX_STROKE_ID_LENGTH = 64;
export const DRAWING_BATCH_INTERVAL_MS = 40;
export const RECONNECT_GRACE_PERIOD_MS = 30000;
export const ROOM_INACTIVITY_EXPIRY_MS = 600000;
export const EMPTY_ROOM_TTL_MS = 60000;

/** Hard cap on a single WebSocket frame. Larger frames are dropped unparsed. */
export const MAX_MESSAGE_BYTES = 16 * 1024;
/** Per-socket token bucket used for every client message. */
export const MESSAGE_RATE_LIMIT = {
  capacity: 60,
  refillPerSecond: 30,
};
/** How many invalid frames a socket may send before it is closed. */
export const MAX_INVALID_MESSAGES = 20;
/** Unauthenticated sockets are closed after this long. */
export const UNJOINED_SOCKET_TTL_MS = 30000;
/** Hard cap on sockets (joined or not) attached to one room. */
export const MAX_SOCKETS_PER_ROOM = 32;

export const CHAIN_ROWS = 6;
export const CHAIN_COLS = 9;
export const CHAIN_MAX_MOVES = 400;
export const CHAIN_MAX_EXPLOSIONS = 4000;

export const PLAYER_COLORS = [
  "#4cb3f0",
  "#f2b33d",
  "#e5484d",
  "#c6f24e",
  "#e6e6e6",
  "#d97757",
  "#7dd3c7",
  "#f28ab2",
];

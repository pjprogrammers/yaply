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
/**
 * Total points stored across every stroke in one round. This bounds both the
 * Durable Object value size and the snapshot payload regardless of how many
 * strokes a drawer creates.
 */
export const MAX_STROKE_POINTS_PER_ROUND = 20_000;
export const MAX_STROKE_POINTS_PER_MESSAGE = 128;
export const MAX_STROKE_ID_LENGTH = 64;
export const DRAWING_BATCH_INTERVAL_MS = 40;
export const RECONNECT_GRACE_PERIOD_MS = 30000;
export const ROOM_INACTIVITY_EXPIRY_MS = 600000;
export const EMPTY_ROOM_TTL_MS = 60000;
/**
 * A room code allocated by `POST /rooms` is reserved for this long before the
 * first player connects. It is released automatically so abandoned create
 * attempts do not permanently burn codes.
 */
export const ROOM_RESERVATION_TTL_MS = 2 * 60_000;

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
/**
 * Best-effort cap on sockets from one client (IP) in one room. This blunts
 * attempts to multiply the per-socket rate limit by opening many connections,
 * while still allowing a group behind one NAT/router to fill a default room.
 * The Worker also rate limits upgrades per client; Cloudflare's account-wide
 * limits remain the final backstop.
 */
export const MAX_SOCKETS_PER_CLIENT_PER_ROOM = 8;

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

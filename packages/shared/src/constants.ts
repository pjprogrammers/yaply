export const DEFAULT_GAME_SETTINGS = {
  maxPlayers: 8,
  rounds: 3,
  drawingTimeSeconds: 80,
  language: "en" as const,
  allowLateJoin: false,
  wordCount: 3,
};

export const ROOM_CODE_LENGTH = 6;
export const MAX_NICKNAME_LENGTH = 16;
export const MAX_CHAT_LENGTH = 200;
export const MAX_STROKES_PER_ROUND = 500;
export const MAX_POINTS_PER_STROKE = 1000;
export const DRAWING_BATCH_INTERVAL_MS = 40;
export const RECONNECT_GRACE_PERIOD_MS = 30000;
export const ROOM_INACTIVITY_EXPIRY_MS = 600000;

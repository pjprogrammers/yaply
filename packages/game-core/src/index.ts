export type PlayerId = string;
export type RoomCode = string;

export type BaseRoomState = {
  code: RoomCode;
  version: number;
  players: Array<{
    id: PlayerId;
    nickname: string;
    connected: boolean;
    score: number;
  }>;
};

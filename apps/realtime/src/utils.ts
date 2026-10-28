import { ROOM_CODE_LENGTH } from "@yaply/shared/constants";

export function generateRoomCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(array);
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

import type { ChatEventKind } from "@yaply/shared/events";

export type ChatMessageType = "normal" | ChatEventKind;

export type ChatMessage = {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  system?: boolean;
  correct?: boolean;
  type?: ChatMessageType;
  private?: boolean;
};

/**
 * Fallback classifier for messages that predate the server's semantic `kind`.
 * New messages carry their kind, so colour decisions stay out of the game
 * logic and this only keeps older room histories readable.
 */
export function classifyChatEvent(text: string): ChatEventKind {
  const value = text.toLowerCase();

  // Check the narrower wording first: "rejoined" contains "joined" and
  // "disliked the drawing" contains "liked the drawing".
  if (value.includes("rejoined the room") || value.includes("reconnected")) return "reconnected";
  if (value.includes("joined the room")) return "player_joined";
  if (value.includes("left the room")) return "player_left";
  if (value.includes("disconnected")) return "disconnected";
  if (value.includes("you guessed") || value.includes("you got it")) return "own_correct_guess";
  if (value.includes("guessed the word")) return "correct_guess";
  if (value.includes("very close") || value.includes("close to the word")) return "close_guess";
  if (value.includes("disliked the drawing")) return "disliked";
  if (value.includes("liked the drawing")) return "liked";
  if (value.includes("word was") || value.includes("word is revealed")) return "word_revealed";
  if (
    value.includes("is drawing") ||
    value.includes("is choosing") ||
    value.includes("started drawing")
  ) {
    return "drawing_started";
  }
  if (
    value.includes("round") ||
    value.includes("game started") ||
    value.includes("rematch") ||
    value.includes("new turn")
  ) {
    return "round_started";
  }
  if (value.includes("hosting") || value.includes("host")) return "announcement";
  if (value.includes("error") || value.includes("failed")) return "error";

  return "announcement";
}

/** Resolve the visual type for a stored message. */
export function resolveChatMessageType(
  message: Pick<ChatMessage, "type" | "system" | "correct" | "text">,
): ChatMessageType {
  if (message.type) return message.type;
  if (message.system) return classifyChatEvent(message.text);
  if (message.correct) return "correct_guess";
  return "normal";
}

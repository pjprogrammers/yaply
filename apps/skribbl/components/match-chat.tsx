"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_CHAT_LENGTH } from "@yaply/shared/constants";
import type { ChatMessage } from "./chat";

type MatchChatProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

function messageTone(message: ChatMessage): "" | "sys" | "ok" | "blue" {
  if (message.private) return "ok";
  if (!message.system) return "";

  switch (message.type) {
    case "player_joined":
    case "correct_guess":
    case "own_correct_guess":
    case "reconnected":
      return "ok";
    case "player_left":
    case "disconnected":
    case "error":
      return "sys";
    case "drawing_started":
    case "round_started":
    case "word_revealed":
    case "close_guess":
    case "announcement":
      return "blue";
    default:
      break;
  }

  // Older messages can arrive without a type; fall back to the same wording
  // checks the regular room chat uses.
  const text = message.text.toLowerCase();
  if (text.includes("joined the room") || text.includes("guessed the word")) return "ok";
  if (text.includes("left the room") || text.includes("disconnected")) return "sys";
  if (text.includes("drawing") || text.includes("round") || text.includes("word was")) return "blue";
  return "";
}

/**
 * The match chat mirrors the classic layout: a plain message stack whose rows
 * alternate backgrounds and a borderless input docked under it.
 */
export function MatchChat({
  messages,
  onSend,
  disabled = false,
  placeholder = "Type your guess here...",
}: MatchChatProps) {
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  const submit = () => {
    if (composingRef.current) return;
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="chat">
      <div className="msgs" ref={listRef} role="log" aria-live="polite">
        {messages.map((message) => {
          const tone = messageTone(message);
          return (
            <div key={message.id} className={`m ${tone}`.trim()}>
              {message.system ? message.text : `${message.nickname}: ${message.text}`}
            </div>
          );
        })}
      </div>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          submit();
        }}
        maxLength={MAX_CHAT_LENGTH}
        placeholder={disabled ? "Reconnecting..." : placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-label="Chat message"
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_CHAT_LENGTH } from "@yaply/shared/constants";
import { SendIcon } from "./icons";

export type ChatMessageType =
  | "normal"
  | "player_joined"
  | "player_left"
  | "correct_guess"
  | "own_correct_guess"
  | "drawing_started"
  | "close_guess"
  | "word_revealed"
  | "round_started"
  | "disconnected"
  | "reconnected"
  | "announcement"
  | "error";

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

type ChatProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
};

function getMessageType(message: ChatMessage): ChatMessageType {
  if (message.type) return message.type;
  if (message.system) {
    const text = message.text.toLowerCase();
    if (text.includes("joined the room") || text.includes("reconnect")) return "player_joined";
    if (text.includes("left the room")) return "player_left";
    if (text.includes("disconnected")) return "disconnected";
    if (text.includes("you guessed")) return "own_correct_guess";
    if (text.includes("guessed the word")) return "correct_guess";
    if (text.includes("drawing")) return "drawing_started";
    if (text.includes("round")) return "round_started";
    if (text.includes("word was") || text.includes("revealed")) return "word_revealed";
    if (text.includes("close")) return "close_guess";
    return "announcement";
  }
  if (message.correct) return "correct_guess";
  return "normal";
}

export function Chat({ messages, onSend, disabled = false, placeholder, hint }: ChatProps) {
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="chat-card">
      <div className="rail-head">
        <span className="rail-title">Room chat</span>
        <span className="rail-count">{messages.length > 0 ? `${messages.length} lines` : "quiet"}</span>
      </div>
      <div className="chat-list" ref={listRef} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty">
            Guesses land here.
            <br />
            Wrong guesses stay in the room.
          </div>
        ) : (
          messages.map((message) => {
            const msgType = getMessageType(message);
            const isSystem = message.system || msgType !== "normal";
            return (
              <div
                key={message.id}
                className={[
                  "chat-line",
                  isSystem ? `chat-line--event chat-line--${msgType}` : "",
                  message.private ? "chat-line--private" : "",
                  message.correct && msgType !== "normal" ? "chat-line--correct" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {!isSystem && (
                  <span className="chat-name">
                    {message.nickname}
                  </span>
                )}
                {isSystem ? message.text : `${message.nickname}: ${message.text}`}
              </div>
            );
          })
        )}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          className="input input--chat"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={MAX_CHAT_LENGTH}
          placeholder={disabled ? "Guess sent" : placeholder ?? "Type a guess…"}
          disabled={disabled}
          autoComplete="off"
          aria-label="Chat message"
        />
        <button
          type="submit"
          className="btn btn--primary btn--sm"
          disabled={disabled || value.trim().length === 0}
          aria-label="Send message"
        >
          <SendIcon size={14} />
        </button>
      </form>
      {hint && <p className="chat-hint">{hint}</p>}
    </div>
  );
}

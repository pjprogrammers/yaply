"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_CHAT_LENGTH } from "@yaply/shared/constants";
import { SendIcon } from "./icons";

export type ChatMessage = {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  system?: boolean;
  correct?: boolean;
};

type ChatProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
};

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
          messages.map((message) => (
            <div
              key={message.id}
              className={[
                "chat-line",
                message.system ? "chat-line--system" : "",
                message.correct ? "chat-line--correct" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {!message.system && (
                <span className={`chat-name ${message.correct ? "chat-name--system" : ""}`}>
                  {message.nickname}
                </span>
              )}
              {message.text}
            </div>
          ))
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

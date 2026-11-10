"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_CHAT_LENGTH } from "@yaply/shared/constants";
import type { ChatEventKind } from "@yaply/shared/events";
import { SendIcon } from "./icons";

export type ChatMessage = {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  createdAt: number;
  system?: boolean;
  kind?: ChatEventKind;
  private?: boolean;
  spectator?: boolean;
};

type ChatProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  spectator?: boolean;
  title?: string;
  emptyCopy?: string;
  hint?: string;
};

export function Chat({
  messages,
  onSend,
  disabled = false,
  disabledReason,
  spectator = false,
  title = "Table chat",
  emptyCopy = "Nothing said yet. Somebody has to talk first.",
  hint,
}: ChatProps) {
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
    <section className="chat-card" aria-labelledby="chat-title">
      <div className="rail-head">
        <h2 id="chat-title">{spectator ? "Spectator channel" : title}</h2>
        <span className="rail-count">
          {messages.length > 0 ? `${messages.length} lines` : "quiet"}
        </span>
      </div>

      <div className="chat-list" ref={listRef} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">{emptyCopy}</p>
        ) : (
          messages.map((message) => (
            <p
              key={message.id}
              className={[
                "chat-line",
                message.system ? "chat-line--system" : "",
                message.private ? "chat-line--private" : "",
                message.spectator ? "chat-line--spectator" : "",
                message.kind === "error" ? "chat-line--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {message.spectator && <span className="chat-tag">spectator</span>}
              {message.private && <span className="chat-tag chat-tag--private">only you</span>}
              {!message.system && <span className="chat-name">{message.nickname}</span>}
              {message.text}
            </p>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <input
          className="input chat-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={MAX_CHAT_LENGTH}
          placeholder={
            disabled
              ? disabledReason ?? "Chat is closed."
              : spectator
                ? "Message the spectators…"
                : "Message the table…"
          }
          disabled={disabled}
          autoComplete="off"
          aria-label="Chat message"
        />
        <button
          type="submit"
          className="chat-send"
          disabled={disabled || value.trim().length === 0}
          aria-label="Send message"
        >
          <SendIcon size={15} />
        </button>
      </form>

      {disabled && disabledReason ? (
        <p className="chat-hint">{disabledReason}</p>
      ) : (
        hint && <p className="chat-hint">{hint}</p>
      )}
    </section>
  );
}

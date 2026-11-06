"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { MAX_CHAT_LENGTH } from "@yaply/shared/constants";
import { resolveChatMessageType } from "@/lib/chat-message";
import type { ChatMessage } from "@/lib/chat-message";
import { SendIcon } from "./icons";

export type { ChatMessage, ChatMessageType } from "@/lib/chat-message";

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
  const stayAtBottomRef = useRef(true);
  const composingRef = useRef(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // New messages should not yank the list away from someone reading history.
    if (stayAtBottomRef.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
    stayAtBottomRef.current = distance < 32;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // Enter can confirm an IME candidate (Japanese/Korean). Never send the
    // half-composed string when that happens.
    if (composingRef.current) return;
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="chat-card">
      <div className="rail-head">
        <span className="rail-title">Game chat</span>
        <span className="rail-count">{messages.length > 0 ? `${messages.length} lines` : "quiet"}</span>
      </div>
      <div className="chat-list" ref={listRef} onScroll={handleScroll} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty">
            Guesses land here.
            <br />
            Wrong guesses stay in the room.
          </div>
        ) : (
          messages.map((message) => {
            const msgType = resolveChatMessageType(message);
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
                {isSystem ? (
                  message.text
                ) : (
                  <>
                    <span className="chat-name">{message.nickname}:</span>
                    {message.text}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      {hint && <p className="chat-hint">{hint}</p>}
      <form className="chat-form" onSubmit={submit}>
        <input
          className="input input--chat"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
            ) {
              event.preventDefault();
            }
          }}
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
    </div>
  );
}

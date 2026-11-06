"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { MAX_CHAT_LENGTH } from "@yaply/shared/constants";
import { resolveChatMessageType } from "@/lib/chat-message";
import type { ChatMessage } from "@/lib/chat-message";

type MatchChatProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * The match chat mirrors the classic layout: neutral player messages and
 * full-width, softly tinted rows for game events. The list sticks to the
 * newest line only while the reader is already at the bottom.
 */
export function MatchChat({
  messages,
  onSend,
  disabled = false,
  placeholder = "Type your guess here...",
}: MatchChatProps) {
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const stayAtBottomRef = useRef(true);
  const composingRef = useRef(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (stayAtBottomRef.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
    stayAtBottomRef.current = distance < 32;
  };

  const submit = () => {
    if (composingRef.current) return;
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="chat">
      <div className="msgs" ref={listRef} onScroll={handleScroll} role="log" aria-live="polite">
        {messages.map((message) => {
          const type = resolveChatMessageType(message);
          const isEvent = type !== "normal";
          return (
            <div
              key={message.id}
              className={["m", isEvent ? `m--${type}` : ""].filter(Boolean).join(" ")}
            >
              {message.system ? (
                message.text
              ) : (
                <>
                  <span className="m-name">{message.nickname}:</span> {message.text}
                </>
              )}
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

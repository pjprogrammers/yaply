"use client";

import Link from "next/link";
import { useState } from "react";
import { formatScore } from "@/lib/format";

type MenuMode = "bots" | "online";

interface MenuProps {
  name: string;
  muted: boolean;
  best: number;
  creating: boolean;
  error: string | null;
  onNameChange: (name: string) => void;
  onPlay: () => void;
  onCreateRoom: (botCount: number) => void;
  onJoinRoom: (code: string) => void;
  onToggleMute: () => void;
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      {muted ? (
        <path
          d="m16 9 5 6m0-6-5 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

export function Menu({
  name,
  muted,
  best,
  creating,
  error,
  onNameChange,
  onPlay,
  onCreateRoom,
  onJoinRoom,
  onToggleMute,
}: MenuProps) {
  const [mode, setMode] = useState<MenuMode>("bots");
  const [code, setCode] = useState("");
  const [createBots, setCreateBots] = useState(7);
  const cleanCode = code.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  const humansOnly = createBots === 0;

  return (
    <div className="menu">
      <header className="menu-top">
        <Link href="/" className="menu-brand" aria-label="Hole.io home">
          <span className="menu-brand__hole" aria-hidden />
          Hole.io
        </Link>
        <div className="menu-top__links">
          <Link href="/install">Install app</Link>
          <button
            type="button"
            className="menu-sound"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            title={muted ? "Unmute" : "Mute"}
          >
            <SoundIcon muted={muted} />
          </button>
        </div>
      </header>

      <div className="menu-card">
        <p className="menu-kicker">
          <span aria-hidden />
          A city-sized eating contest
        </p>
        <h1 className="menu-title">
          Hole<span>.</span>io
        </h1>
        <p className="menu-lede">
          You are the hole. Swallow cars, trees, statues and whole buildings.
          Seven rival holes are hungry too.
        </p>

        <form
          className="menu-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === "bots") {
              onPlay();
              return;
            }
            if (cleanCode.length === 6) onJoinRoom(cleanCode);
          }}
        >
          <label htmlFor="hole-name">Your name</label>
          <input
            id="hole-name"
            name="name"
            value={name}
            onChange={(event) => onNameChange(event.target.value.slice(0, 14))}
            maxLength={14}
            autoComplete="nickname"
            spellCheck={false}
            placeholder="You"
            className="menu-name"
          />

          <div
            className="menu-modes"
            role="group"
            aria-label="Match mode"
          >
            <button
              type="button"
              className={`menu-mode ${mode === "bots" ? "is-active" : ""}`}
              aria-pressed={mode === "bots"}
              onClick={() => setMode("bots")}
            >
              Play with bots
            </button>
            <button
              type="button"
              className={`menu-mode ${mode === "online" ? "is-active" : ""}`}
              aria-pressed={mode === "online"}
              onClick={() => setMode("online")}
            >
              Create room
            </button>
          </div>

          {mode === "bots" ? (
            <button type="submit" className="menu-play menu-play--wide">
              Dig in
              <span aria-hidden>→</span>
            </button>
          ) : (
            <div className="menu-online">
              <div className="menu-opponents">
                <span className="menu-opponents__label">Who fills the city?</span>
                <div
                  className="menu-opponents__modes"
                  role="group"
                  aria-label="Room opponents"
                >
                  <button
                    type="button"
                    className={`menu-opponent ${humansOnly ? "is-active" : ""}`}
                    aria-pressed={humansOnly}
                    onClick={() => setCreateBots(0)}
                  >
                    <b>Only humans</b>
                    <span>Invite friends, no bots</span>
                  </button>
                  <button
                    type="button"
                    className={`menu-opponent ${humansOnly ? "" : "is-active"}`}
                    aria-pressed={!humansOnly}
                    onClick={() => setCreateBots((current) => (current > 0 ? current : 7))}
                  >
                    <b>Bots</b>
                    <span>Fill the spare seats</span>
                  </button>
                </div>
                {humansOnly ? null : (
                  <div
                    className="menu-bot-count"
                    role="group"
                    aria-label="Number of bots"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={`menu-bot-count__option ${
                          createBots === count ? "is-active" : ""
                        }`}
                        aria-pressed={createBots === count}
                        onClick={() => setCreateBots(count)}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                )}
                <p className="menu-online__hint">
                  {humansOnly
                    ? "Humans only. You need at least two players in the room to start."
                    : `${createBots} bot${createBots === 1 ? "" : "s"} fill spare seats. Friends can still join.`}
                </p>
              </div>
              <button
                type="button"
                className="menu-play menu-play--wide"
                onClick={() => onCreateRoom(createBots)}
                disabled={creating}
              >
                {creating ? "Opening room…" : "Create a room"}
                <span aria-hidden>→</span>
              </button>
              <div className="menu-join">
                <label htmlFor="hole-room-code" className="sr-only">
                  Room code
                </label>
                <input
                  id="hole-room-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Room code"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={8}
                />
                <button
                  type="submit"
                  className="menu-join__button"
                  disabled={cleanCode.length !== 6}
                >
                  Join
                </button>
              </div>
              <p className="menu-online__hint">
                Share the six-character code, or join a friend&apos;s city.
              </p>
            </div>
          )}

          {error ? (
            <p className="menu-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <div className="menu-meta">
          <span>
            <b>2:00</b> match
          </span>
          <span>
            <b>8</b> holes
          </span>
          <span>
            <b>{formatScore(best)}</b> best score
          </span>
        </div>
      </div>

      <div className="menu-tips">
        <p className="menu-tips__title">How to play</p>
        <ul>
          <li>
            <span aria-hidden>01</span>
            Move with WASD, arrows, or the mouse.
          </li>
          <li>
            <span aria-hidden>02</span>
            Anything smaller than your rim is food.
          </li>
          <li>
            <span aria-hidden>03</span>
            Eat smaller holes, run from bigger ones.
          </li>
        </ul>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import { Doodle } from "@/components/doodle";
import { ArrowRightIcon, PlayIcon, UsersIcon } from "@/components/icons";
import { Segmented } from "@/components/segmented";
import { Topbar } from "@/components/topbar";
import {
  cleanRoomCode,
  createRoomCode,
  MAIN_URL,
  readStoredNickname,
  storeNickname,
} from "@/lib/config";

const PLAYERS = [
  { name: "Mara", color: "#4cb3f0" },
  { name: "Jules", color: "#f2b33d" },
  { name: "Niko", color: "#e5484d" },
  { name: "Ari", color: "#c6f24e" },
];

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [words, setWords] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const stored = readStoredNickname();
    if (stored) setNickname(stored);
  }, []);

  const displayName = () => nickname.trim() || "Player";

  const createRoom = async () => {
    if (creating) return;
    const name = displayName();
    storeNickname(name);
    setCreateError("");
    setCreating(true);
    try {
      const code = await createRoomCode();
      const params = new URLSearchParams({
        name,
        host: "1",
        rounds: String(rounds),
        time: String(drawTime),
        words: String(words),
        max: String(maxPlayers),
      });
      router.push(`/room/${code}?${params.toString()}`);
    } catch (cause) {
      setCreateError(
        cause instanceof Error
          ? cause.message
          : "Could not create a room right now. Please try again.",
      );
      setCreating(false);
    }
  };

  const joinRoom = () => {
    const code = cleanRoomCode(roomCode);
    if (code.length !== 6) {
      setError("Room codes are six characters.");
      return;
    }
    const name = displayName();
    storeNickname(name);
    router.push(`/room/${code}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="app-shell">
      <Topbar />

      <main className="page">
        <div className="home-grid">
          <section className="home-copy">
            <p className="eyebrow">Yaply · Skribbl</p>
            <h1 className="home-title">
              Draw badly.
              <br />
              Guess fast.
            </h1>
            <p className="subline">
              A private room, a blank sheet and a word nobody can draw. One player sketches while
              everyone else types guesses into the chat. The faster the guess, the more it scores.
            </p>

            <div className="home-actions">
              <Link href="/how-to-play" className="btn btn--ghost">
                How to play
                <ArrowRightIcon size={14} />
              </Link>
              <a href={MAIN_URL} className="text-link">
                More Yaply games
              </a>
            </div>

            <div className="preview-card">
              <div className="preview-head">
                <span className="preview-caption">
                  <span className="status-dot" data-status="connected" />
                  Room preview
                </span>
                <span className="pill pill--accent">Round 2 of 3</span>
              </div>
              <div className="paper">
                <div className="paper-mask">_ _ _ _ _</div>
                <div className="paper-canvas">
                  <Doodle />
                </div>
              </div>
              <div className="preview-players">
                {PLAYERS.map((player) => (
                  <span className="preview-chip" key={player.name}>
                    <i style={{ background: player.color }} />
                    {player.name}
                  </span>
                ))}
                <span className="preview-chip">+4 more</span>
              </div>
              <p className="paper-caption">
                <span>Mara is drawing</span>
                <span className="num">0:42 left</span>
              </p>
            </div>

            <div className="fact-strip">
              <div className="fact">
                <p className="fact-label">Players</p>
                <p className="fact-value">2–12</p>
              </div>
              <div className="fact">
                <p className="fact-label">Draw time</p>
                <p className="fact-value">60–120s</p>
              </div>
              <div className="fact">
                <p className="fact-label">Rounds</p>
                <p className="fact-value">2–5</p>
              </div>
            </div>
          </section>

          <aside className="rail">
            <section className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Play with friends</h2>
                  <p className="small faint" style={{ marginTop: 3 }}>
                    No account, no install.
                  </p>
                </div>
                <span className="pill">
                  <UsersIcon size={11} />
                  Live room
                </span>
              </div>

              <label className="field">
                <span className="field-label">Nickname</span>
                <input
                  className="input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your name"
                  autoComplete="nickname"
                />
              </label>

              <div className="settings-list" style={{ marginTop: 18 }}>
                <div className="setting-row">
                  <span className="setting-label">Rounds</span>
                  <Segmented
                    label="Rounds"
                    value={rounds}
                    options={[
                      { label: "2", value: 2 },
                      { label: "3", value: 3 },
                      { label: "5", value: 5 },
                    ]}
                    onChange={setRounds}
                  />
                </div>
                <div className="setting-row">
                  <span className="setting-label">Draw time</span>
                  <Segmented
                    label="Draw time"
                    value={drawTime}
                    options={[
                      { label: "60s", value: 60 },
                      { label: "80s", value: 80 },
                      { label: "120s", value: 120 },
                    ]}
                    onChange={setDrawTime}
                  />
                </div>
                <div className="setting-row">
                  <span className="setting-label">Word choices</span>
                  <Segmented
                    label="Word choices"
                    value={words}
                    options={[
                      { label: "2", value: 2 },
                      { label: "3", value: 3 },
                      { label: "4", value: 4 },
                    ]}
                    onChange={setWords}
                  />
                </div>
                <div className="setting-row">
                  <span className="setting-label">Max players</span>
                  <Segmented
                    label="Max players"
                    value={maxPlayers}
                    options={[
                      { label: "4", value: 4 },
                      { label: "8", value: 8 },
                      { label: "12", value: 12 },
                    ]}
                    onChange={setMaxPlayers}
                  />
                </div>
              </div>

              <button
                className="btn btn--primary btn--block btn--lg"
                type="button"
                onClick={createRoom}
                disabled={creating}
                style={{ marginTop: 18 }}
              >
                <PlayIcon size={15} />
                {creating ? "Creating room…" : "Create a room"}
              </button>
              {createError && (
                <p className="small" style={{ color: "var(--negative)", marginTop: 8 }}>
                  {createError}
                </p>
              )}

              <div className="divider" style={{ margin: "20px 0 18px" }} />

              <div className="field">
                <span className="field-label">Join with a code</span>
                <div className="join-row">
                  <div className="code-input-wrap">
                    <input
                      className="input input--code"
                      value={roomCode}
                      onChange={(event) => {
                        setRoomCode(cleanRoomCode(event.target.value));
                        setError("");
                      }}
                      maxLength={6}
                      placeholder="ABC123"
                      inputMode="text"
                      autoCapitalize="characters"
                      spellCheck={false}
                      aria-label="Six character room code"
                    />
                    {roomCode.length > 0 && (
                      <button
                        type="button"
                        className="icon-btn code-clear"
                        onClick={() => setRoomCode("")}
                        aria-label="Clear room code"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={joinRoom}
                    disabled={roomCode.length !== 6}
                  >
                    Join
                  </button>
                </div>
                {error && (
                  <p className="small" style={{ color: "var(--negative)" }}>
                    {error}
                  </p>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">The shape of a round</h2>
                <span className="pill">3 min</span>
              </div>
              <div className="help-list" style={{ gap: 12 }}>
                <div>
                  <p className="setting-value">1 · Pick a word</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    The drawer gets a short list and 20 seconds to choose.
                  </p>
                </div>
                <div>
                  <p className="setting-value">2 · Draw and guess</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    Everyone types guesses. Correct answers score more the earlier they land.
                  </p>
                </div>
                <div>
                  <p className="setting-value">3 · Score and pass</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    The word is revealed, points go up and the next player takes the pen.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

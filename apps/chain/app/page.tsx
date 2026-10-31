"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import { ArrowRightIcon, PlayIcon, UsersIcon } from "@/components/icons";
import { MiniBoard } from "@/components/mini-board";
import { Segmented } from "@/components/segmented";
import { Topbar } from "@/components/topbar";
import {
  cleanRoomCode,
  MAIN_URL,
  makeRoomCode,
  readStoredNickname,
  storeNickname,
} from "@/lib/config";

const PLAYERS = [
  { name: "Mara", color: "#4cb3f0", orbs: 12 },
  { name: "Jules", color: "#f2b33d", orbs: 9 },
  { name: "Niko", color: "#e5484d", orbs: 7 },
  { name: "Ari", color: "#c6f24e", orbs: 4 },
];

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [turnTime, setTurnTime] = useState(45);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = readStoredNickname();
    if (stored) setNickname(stored);
  }, []);

  const displayName = () => nickname.trim() || "Player";

  const createRoom = () => {
    const name = displayName();
    storeNickname(name);
    const code = makeRoomCode();
    const params = new URLSearchParams({
      name,
      host: "1",
      max: String(maxPlayers),
      turn: String(turnTime),
    });
    router.push(`/room/${code}?${params.toString()}`);
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
            <p className="eyebrow">Yaply · Chain Reaction</p>
            <h1 className="home-title">
              Own the grid.
              <br />
              One orb at a time.
            </h1>
            <p className="subline">
              Place an orb on an empty cell or one you already own. Fill a cell past its critical
              mass and it bursts into its neighbours, flipping their colour and setting off the
              chain. Last player with orbs on the board wins.
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

            <div className="chain-preview">
              <div className="preview-head">
                <span className="preview-caption">
                  <span className="status-dot" data-status="connected" />
                  Board preview
                </span>
                <span className="pill pill--accent">Move 34</span>
              </div>
              <MiniBoard />
              <div className="preview-players">
                {PLAYERS.map((player) => (
                  <span className="preview-chip" key={player.name}>
                    <i style={{ background: player.color }} />
                    {player.name}
                    <span className="faint num">{player.orbs}</span>
                  </span>
                ))}
              </div>
              <p className="paper-caption">
                <span>Mara's corner is one orb from popping</span>
                <span className="num">0:31 left</span>
              </p>
            </div>

            <div className="fact-strip">
              <div className="fact">
                <p className="fact-label">Board</p>
                <p className="fact-value">6 × 9</p>
              </div>
              <div className="fact">
                <p className="fact-label">Players</p>
                <p className="fact-value">2–8</p>
              </div>
              <div className="fact">
                <p className="fact-label">Turn clock</p>
                <p className="fact-value">30–60s</p>
              </div>
            </div>
          </section>

          <aside className="rail">
            <section className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Enter the arena</h2>
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
                  <span className="setting-label">Max players</span>
                  <Segmented
                    label="Max players"
                    value={maxPlayers}
                    options={[
                      { label: "4", value: 4 },
                      { label: "6", value: 6 },
                      { label: "8", value: 8 },
                    ]}
                    onChange={setMaxPlayers}
                  />
                </div>
                <div className="setting-row">
                  <span className="setting-label">Turn clock</span>
                  <Segmented
                    label="Turn clock"
                    value={turnTime}
                    options={[
                      { label: "30s", value: 30 },
                      { label: "45s", value: 45 },
                      { label: "60s", value: 60 },
                    ]}
                    onChange={setTurnTime}
                  />
                </div>
              </div>

              <button
                className="btn btn--primary btn--block btn--lg"
                type="button"
                onClick={createRoom}
                style={{ marginTop: 18 }}
              >
                <PlayIcon size={15} />
                Create a room
              </button>

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
                <h2 className="card-title">Critical mass</h2>
                <span className="pill">2 / 3 / 4</span>
              </div>
              <div className="mass-grid" aria-hidden>
                <span className="mass-cell">2</span>
                <span className="mass-cell">3</span>
                <span className="mass-cell">2</span>
                <span className="mass-cell">3</span>
                <span className="mass-cell mass-cell--center">4</span>
                <span className="mass-cell">3</span>
                <span className="mass-cell">2</span>
                <span className="mass-cell">3</span>
                <span className="mass-cell">2</span>
              </div>
              <p className="mass-caption">
                Corners pop at 2 orbs, edges at 3 and the middle at 4. A cell that pops sends one
                orb into each neighbour — which can pop them too.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

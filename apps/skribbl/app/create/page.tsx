"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import { ArrowLeftIcon, PlayIcon } from "@/components/icons";
import { Segmented } from "@/components/segmented";
import { Topbar } from "@/components/topbar";
import { makeRoomCode, readStoredNickname, storeNickname } from "@/lib/config";

function CreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameParam = (searchParams.get("name") ?? "").trim();
  const [nickname, setNickname] = useState(nameParam);
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [words, setWords] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(8);

  useEffect(() => {
    if (nickname) return;
    const stored = readStoredNickname();
    if (stored) setNickname(stored);
  }, [nickname]);

  const create = () => {
    const name = nickname.trim() || "Player";
    storeNickname(name);
    const code = makeRoomCode();
    const params = new URLSearchParams({
      name,
      host: "1",
      rounds: String(rounds),
      time: String(drawTime),
      words: String(words),
      max: String(maxPlayers),
    });
    router.push(`/room/${code}?${params.toString()}`);
  };

  return (
    <div className="app-shell">
      <Topbar />
      <main className="page page--narrow">
        <div className="page-head">
          <div className="page-head-copy">
            <p className="eyebrow">Skribbl</p>
            <h1 className="home-title">Create a room</h1>
            <p className="subline">
              Pick the pace, then share the six-character code. Everyone else joins from the home
              screen.
            </p>
          </div>
          <Link href="/" className="btn btn--ghost btn--sm">
            <ArrowLeftIcon size={13} />
            Back
          </Link>
        </div>

        <div className="lobby-grid">
          <section className="card">
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Your nickname</span>
                <input
                  className="input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your name"
                  autoComplete="nickname"
                />
              </label>

              <div className="settings-list">
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

              <div className="form-actions">
                <button className="btn btn--primary btn--lg" type="button" onClick={create}>
                  <PlayIcon size={15} />
                  Create room
                </button>
                <Link href="/" className="btn btn--ghost btn--lg">
                  Cancel
                </Link>
              </div>
            </div>
          </section>

          <aside className="rail">
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">How this room plays</h2>
                <span className="pill">{rounds} rounds</span>
              </div>
              <div className="help-list" style={{ gap: 12 }}>
                <div>
                  <p className="setting-value">Every player draws</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    Turns rotate through the room. Each player gets the pen once per round.
                  </p>
                </div>
                <div>
                  <p className="setting-value">Fast guesses score more</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    Correct guesses earn up to 100 points. The drawer earns points when the room
                    guesses.
                  </p>
                </div>
                <div>
                  <p className="setting-value">Host controls the pace</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    You can still change rounds and draw time in the lobby before starting.
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

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <Topbar />
          <main className="page page--narrow">
            <div className="loading-card">Loading…</div>
          </main>
        </div>
      }
    >
      <CreateContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import { ArrowLeftIcon, PlayIcon } from "@/components/icons";
import { Topbar } from "@/components/topbar";
import { cleanRoomCode, readStoredNickname, storeNickname } from "@/lib/config";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(cleanRoomCode(searchParams.get("code") ?? ""));
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = readStoredNickname();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setNickname(stored);
  }, []);

  const joinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = cleanRoomCode(roomCode);
    if (code.length !== 6) {
      setError("Room codes are six characters.");
      return;
    }
    const name = nickname.trim() || "Player";
    storeNickname(name);
    router.push(`/room/${code}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="app-shell">
      <Topbar />
      <main className="page page--narrow">
        <div className="page-head">
          <div className="page-head-copy">
            <p className="eyebrow">Skribbl</p>
            <h1 className="home-title">Join a room</h1>
            <p className="subline">
              Six characters, a nickname, and you are in. Ask the host for the code if you do not
              have it yet.
            </p>
          </div>
          <Link href="/" className="btn btn--ghost btn--sm">
            <ArrowLeftIcon size={13} />
            Home
          </Link>
        </div>

        <div className="lobby-grid">
          <section className="card">
            <form className="form-grid" onSubmit={joinRoom}>
              <label className="field">
                <span className="field-label">Your nickname</span>
                <input
                  className="input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your name"
                  autoComplete="nickname"
                  autoFocus
                />
              </label>

              <label className="field">
                <span className="field-label">Room code</span>
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
              </label>

              {error && (
                <p className="small" style={{ color: "var(--negative)" }}>
                  {error}
                </p>
              )}

              <div className="form-actions">
                <button
                  className="btn btn--primary btn--lg"
                  type="submit"
                  disabled={roomCode.length !== 6}
                >
                  <PlayIcon size={15} />
                  Join room
                </button>
                <Link href="/create" className="btn btn--ghost btn--lg">
                  Create instead
                </Link>
              </div>
            </form>
          </section>

          <aside className="rail">
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">What you need</h2>
                <span className="pill">2 min</span>
              </div>
              <div className="help-list" style={{ gap: 12 }}>
                <div>
                  <p className="setting-value">A six-character code</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    The host can send the code or the full room link. Both land you in the same
                    room.
                  </p>
                </div>
                <div>
                  <p className="setting-value">A nickname</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    This is what the scoreboard shows. It stays saved in this browser for next
                    time.
                  </p>
                </div>
                <div>
                  <p className="setting-value">Nothing else</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    No account, no install and no download. The room opens straight into the lobby.
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

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <Topbar compact />
          <main className="join-gate">
            <div className="loading-card">Opening the join form…</div>
          </main>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}

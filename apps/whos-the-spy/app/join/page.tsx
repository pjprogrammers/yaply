"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import { cleanRoomCode, readStoredNickname, storeNickname } from "@/lib/config";
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon } from "@/components/icons";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(cleanRoomCode(searchParams.get("code") ?? ""));
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = readStoredNickname();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate stored nickname
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
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Yaply Who's the Spy home">
          <span className="brand-word">
            Yaply <span className="brand-sub">Spy</span>
          </span>
        </Link>
        <Link href="/" className="button button--ghost button--small">
          <ArrowLeftIcon size={14} />
          Home
        </Link>
      </header>

      <main className="page-shell">
        <div className="page-head">
          <div>
            <h1>Join a Who&apos;s the Spy room.</h1>
            <p>
              Six characters and a name. The host has the code; the room has the
              words.
            </p>
          </div>
        </div>

        <section className="join-card">
          <h2>Step into the room</h2>
          <p>
            No account, no download. You land in the lobby with the rest of the
            table.
          </p>

          <form className="join-form" onSubmit={joinRoom}>
            <label className="field">
              <span className="field-label">Nickname</span>
              <input
                className="input"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setError("");
                }}
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
              <span className="field-hint">
                The host can send the code or the full room link.
              </span>
            </label>

            {error && <p className="form-error">{error}</p>}

            <button className="button button--large" type="submit" disabled={roomCode.length !== 6}>
              <PlayIcon size={15} />
              Join room
            </button>
          </form>

          <Link href="/create" className="join-back">
            No code yet? Open a room
            <ArrowRightIcon size={13} />
          </Link>
        </section>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
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

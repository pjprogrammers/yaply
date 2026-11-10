"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import { PlayIcon } from "@/components/icons";
import { cleanRoomCode, readStoredNickname, storeNickname } from "@/lib/config";

export function JoinForm() {
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
  );
}

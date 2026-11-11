"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_NICKNAME_LENGTH, SKRIBBL_DEFAULT_MAX_PLAYERS } from "@yaply/shared/constants";
import { ArrowLeftIcon, PlayIcon } from "@/components/icons";
import { Topbar } from "@/components/topbar";
import { findOpenRoom, readStoredNickname, storeNickname } from "@/lib/config";

function playUrl(code: string, name: string, host: boolean): string {
  const params = new URLSearchParams({
    name,
    play: "1",
    vis: "public",
    max: String(SKRIBBL_DEFAULT_MAX_PLAYERS),
  });
  if (host) params.set("host", "1");
  return `/room/${code}?${params.toString()}`;
}

function subscribeNickname(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getStoredNickname(): string {
  return readStoredNickname();
}

export default function PlayPage() {
  const router = useRouter();
  const storedNickname = useSyncExternalStore(subscribeNickname, getStoredNickname, () => "");
  // null means the player has not edited the field, so the stored name shows.
  const [nickname, setNickname] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const name = nickname ?? storedNickname;

  const start = useCallback(
    async (rawName: string) => {
      if (starting) return;
      const name = rawName.trim() || "Player";
      storeNickname(name);
      setError("");
      setStarting(true);
      try {
        const room = await findOpenRoom();
        router.push(playUrl(room.code, name, room.host));
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not find an open room right now. Please try again.",
        );
        setStarting(false);
      }
    },
    [router, starting],
  );

  useEffect(() => {
    if (!storedNickname || startedRef.current) return;
    // Returning players jump straight into matchmaking; the first click of
    // Play should not ask for a name they already gave us.
    startedRef.current = true;
    void start(storedNickname);
  }, [start, storedNickname]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startedRef.current = true;
    void start(name);
  };

  return (
    <div className="app-shell">
      <Topbar />
      <main className="page page--narrow">
        <div className="page-head">
          <div className="page-head-copy">
            <p className="eyebrow">Skribbl</p>
            <h1 className="home-title">Play with everyone</h1>
            <p className="subline">
              We put you in the open public room. If it is full, a fresh one opens for the next
              player. Rooms start with {SKRIBBL_DEFAULT_MAX_PLAYERS} seats and the host can raise
              the limit to 12.
            </p>
          </div>
          <Link href="/" className="btn btn--ghost btn--sm">
            <ArrowLeftIcon size={13} />
            Home
          </Link>
        </div>

        <div className="lobby-grid">
          <section className="card">
            <form className="form-grid" onSubmit={submit}>
              <label className="field">
                <span className="field-label">Your nickname</span>
                <input
                  className="input"
                  value={name}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Your name"
                  autoComplete="nickname"
                  autoFocus={name === ""}
                  disabled={starting}
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
                  disabled={starting}
                >
                  <PlayIcon size={15} />
                  {starting ? "Finding a room…" : "Play now"}
                </button>
                <Link href="/create" className="btn btn--ghost btn--lg">
                  Create a private room
                </Link>
              </div>
            </form>
          </section>

          <aside className="rail">
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">How Play works</h2>
                <span className="pill">Public</span>
              </div>
              <div className="help-list" style={{ gap: 12 }}>
                <div>
                  <p className="setting-value">One open room at a time</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    Every Play click joins the same room until it fills. When the eighth seat is
                    taken, the ninth player starts the next room.
                  </p>
                </div>
                <div>
                  <p className="setting-value">The owner can add seats</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    Public rooms open with eight seats. The host can raise the limit to twelve
                    from the room settings before or during the match.
                  </p>
                </div>
                <div>
                  <p className="setting-value">Nothing to install</p>
                  <p className="small faint" style={{ marginTop: 2 }}>
                    Pick a nickname and you are in. A room closes as soon as the last player
                    leaves.
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

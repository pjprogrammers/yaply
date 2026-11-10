"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MAX_NICKNAME_LENGTH } from "@yaply/shared/constants";
import {
  createRoomCode,
  readStoredNickname,
  storeNickname,
} from "@/lib/config";
import {
  readLocalConfig,
  writeLocalConfig,
  type LocalSpyConfig,
} from "@/lib/spy-settings";
import { ArrowLeftIcon, LockIcon, PlayIcon, UsersIcon } from "./icons";
import { SpySettingsFields } from "./spy-settings-fields";

export function CreateRoom() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [config, setConfig] = useState<LocalSpyConfig>(() => readLocalConfig());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = readStoredNickname();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate stored nickname
    if (stored) setNickname(stored);
  }, []);

  const update = (patch: Partial<LocalSpyConfig>) => {
    setConfig((previous) => {
      const next = { ...previous, ...patch };
      writeLocalConfig(next);
      return next;
    });
  };

  const openRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nickname.trim();
    if (!name) {
      setError("Add the nickname the table should see.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const code = await createRoomCode();
      const stored = { ...config, nickname: name };
      writeLocalConfig(stored);
      storeNickname(name);
      router.push(`/room/${code}?host=1&name=${encodeURIComponent(name)}`);
    } catch (cause) {
      setBusy(false);
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "The room could not be opened. Try again in a moment.",
      );
    }
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
            <h1>Create a Who&apos;s the Spy room.</h1>
            <p>
              Pick the categories, set the clocks and choose how many spies are
              hiding. You can still change all of it in the lobby before the
              first card is dealt.
            </p>
          </div>
          <p className="page-aside">
            <strong>3–12 players.</strong> Share the six-character code once the
            room opens. Everyone gets their own private card.
          </p>
        </div>

        <form id="create-room-form" onSubmit={openRoom}>
          <div className="setup-layout">
            <div>
              <section className="panel setup-panel">
                <div className="setup-block-head">
                  <h2>Your name</h2>
                  <p>What the table calls you</p>
                </div>
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
                  <span className="field-hint">
                    Up to {MAX_NICKNAME_LENGTH} characters. Saved in this browser
                    for next time.
                  </span>
                </label>
              </section>

              <section className="panel setup-panel">
                <SpySettingsFields value={config} onChange={update} />
              </section>
            </div>

            <aside className="summary-card">
              <h2>Your table</h2>
              <dl className="summary-list">
                <div>
                  <dt>Players</dt>
                  <dd>3–12</dd>
                </div>
                <div>
                  <dt>Spies</dt>
                  <dd>{config.spyCount === 0 ? "Automatic" : config.spyCount}</dd>
                </div>
                <div>
                  <dt>Words</dt>
                  <dd>
                    {config.categories.includes("mixed")
                      ? "Mixed"
                      : `${config.categories.length} categories`}
                  </dd>
                </div>
                <div>
                  <dt>Difficulty</dt>
                  <dd className="summary-cap">{config.difficulty}</dd>
                </div>
                <div>
                  <dt>Clue turn</dt>
                  <dd>{config.clueSeconds}s</dd>
                </div>
                <div>
                  <dt>Discussion</dt>
                  <dd>{config.discussionSeconds}s</dd>
                </div>
                <div>
                  <dt>Voting</dt>
                  <dd>{config.votingSeconds}s</dd>
                </div>
                <div>
                  <dt>Final guess</dt>
                  <dd>{config.finalGuess ? "On" : "Off"}</dd>
                </div>
                <div>
                  <dt>Spectator chat</dt>
                  <dd>{config.spectatorChat ? "On" : "Off"}</dd>
                </div>
              </dl>

              {error && <p className="form-error">{error}</p>}

              <button
                className="button summary-cta"
                type="submit"
                form="create-room-form"
                disabled={busy}
              >
                <PlayIcon size={15} />
                {busy ? "Opening the room…" : "Create the room"}
              </button>

              <p className="summary-note">
                <LockIcon size={12} /> The server holds the words and roles. They
                never appear in the room link.
              </p>

              <div className="summary-facts">
                <span>
                  <UsersIcon size={14} /> Invite one link
                </span>
                <Link href="/how-to-play">Rules</Link>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}

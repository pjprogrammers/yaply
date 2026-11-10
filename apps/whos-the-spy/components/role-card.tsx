"use client";

import { useState } from "react";
import type { SpyRole } from "@yaply/shared/types";
import { CheckIcon, EyeIcon, EyeOffIcon, LockIcon, ShieldIcon } from "./icons";

export type SpyRoleInfo = {
  role: SpyRole;
  word: string;
  categoryId: string;
  categoryLabel: string;
  round: number;
};

function RoleWord({ word, hidden }: { word: string; hidden: boolean }) {
  if (hidden) {
    return (
      <span className="role-redaction" aria-label="Hidden word">
        <i />
        <i />
        <i />
      </span>
    );
  }
  return <span className="role-word-value">{word}</span>;
}

export function RoleDossier({
  role,
  ready,
  readyCount,
  total,
  remaining,
  onReady,
}: {
  role: SpyRoleInfo | null;
  ready: boolean;
  readyCount: number;
  total: number;
  remaining: number;
  onReady: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  const showWord = revealed || ready;

  return (
    <section className="role-dossier-wrap" aria-labelledby="role-title">
      <div className="role-dossier">
        <div className="role-dossier-tab">
          <span>Private case file</span>
          <span>Round {role?.round ?? 1}</span>
        </div>

        <div className="role-dossier-paper">
          <div className="role-dossier-head">
            <div>
              <p className="role-kicker">Your role</p>
              <h1 id="role-title">
                {role
                  ? showWord
                    ? role.role === "spy"
                      ? "Spy"
                      : "Civilian"
                    : "Sealed"
                  : "Dealing…"}
              </h1>
            </div>
            <span className="role-stamp">Top secret</span>
          </div>

          <p className="role-label">The word in your envelope</p>
          <div className="role-word">
            {role ? (
              <RoleWord word={role.word} hidden={!showWord} />
            ) : (
              <span className="role-waiting" />
            )}
          </div>

          <dl className="role-meta">
            <div>
              <dt>Category</dt>
              <dd>{role?.categoryLabel ?? "—"}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>
                {role ? (
                  showWord ? (
                    role.role === "spy" ? (
                      "Spy"
                    ) : (
                      "Civilian"
                    )
                  ) : (
                    "Sealed"
                  )
                ) : (
                  "Sealed"
                )}
              </dd>
            </div>
            <div>
              <dt>Players</dt>
              <dd>{total}</dd>
            </div>
          </dl>

          {ready ? (
            <div className="role-ready">
              <CheckIcon size={18} />
              <div>
                <p>Card opened. Waiting for the table.</p>
                <span>
                  {readyCount} of {total} ready
                </span>
              </div>
            </div>
          ) : (
            <>
              <p className="role-note">
                {!role
                  ? "The server is sealing your card."
                  : !showWord
                    ? "Open the card when nobody is looking over your shoulder."
                    : role.role === "spy"
                      ? "Your word is different. Infer the civilian word from the clues without giving yourself away."
                      : "Everyone else has this word too. Give a clue that proves you know it without naming it."}
              </p>

              {!showWord ? (
                <button
                  type="button"
                  className="button role-reveal-button"
                  onClick={() => setRevealed(true)}
                  disabled={!role}
                >
                  <LockIcon size={16} />
                  Open my card
                </button>
              ) : (
                <div className="role-actions">
                  <button type="button" className="button role-reveal-button" onClick={onReady}>
                    <CheckIcon size={16} />
                    I&apos;m ready
                  </button>
                  <button
                    type="button"
                    className="button button--ghost role-hide-button"
                    onClick={() => setRevealed(false)}
                  >
                    <EyeOffIcon size={15} />
                    Hide
                  </button>
                </div>
              )}
            </>
          )}

          <p className="role-timer">
            {ready ? "The round starts when everyone is ready" : "Clue round starts in"}{" "}
            <strong>{remaining}s</strong>
          </p>
        </div>
      </div>

      <p className="role-privacy">
        <ShieldIcon size={15} />
        Only this screen can see this card. It is addressed to your socket and
        restored on reconnect.
      </p>
    </section>
  );
}

export function PrivateCard({
  role,
  eliminated,
  finalGuess,
}: {
  role: SpyRoleInfo | null;
  eliminated: boolean;
  finalGuess: boolean;
}) {
  return (
    <section className="private-card" aria-labelledby="private-card-title">
      <div className="rail-head">
        <h2 id="private-card-title">Your card</h2>
        <span className="rail-count">{role ? role.role : "sealed"}</span>
      </div>

      <div className="private-card-body">
        {role ? (
          <>
            <div className="private-card-top">
              <span className={`private-role private-role--${role.role}`}>
                {role.role === "spy" ? "Spy" : "Civilian"}
              </span>
              <span className="private-category">{role.categoryLabel}</span>
            </div>
            <SecretWord word={role.word} />
            {eliminated && <p className="private-note">You are spectating. Your card stays yours.</p>}
            {!eliminated && finalGuess && role.role === "spy" && (
              <p className="private-note">If you are the last spy caught, you get one guess.</p>
            )}
          </>
        ) : (
          <p className="private-note">Dealing your private card…</p>
        )}
      </div>
    </section>
  );
}

function SecretWord({ word }: { word: string }) {
  return (
    <details className="secret-word">
      <summary>
        <span>Secret word</span>
        <span className="secret-toggle">
          <EyeIcon size={13} />
          show
        </span>
      </summary>
      <p className="secret-word-body">{word}</p>
      <span className="secret-hide">
        <EyeOffIcon size={12} /> Hide before you pass the phone
      </span>
    </details>
  );
}

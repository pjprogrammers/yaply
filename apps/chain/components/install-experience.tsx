"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getInstallGuides,
  usePwaInstall,
  type InstallGuideId,
} from "@yaply/shared/install";
import { ArrowRightIcon } from "@/components/icons";

const APP_NAME = "Chain Reaction";

function InstallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v11m0 0 4-4m-4 4-4-4M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GuideGlyph({ id }: { id: InstallGuideId }) {
  if (id === "desktop") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 18.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function InstallCard() {
  const { ready, installed, canInstall, platform, install } = usePwaInstall();
  const [message, setMessage] = useState("");

  async function handleInstall() {
    const outcome = await install();
    if (outcome === "accepted") {
      setMessage("Installed. Chain Reaction is waiting in your launcher.");
    } else if (outcome === "dismissed") {
      setMessage("Install cancelled. You can try again from the browser menu.");
    } else {
      setMessage("This browser will not show the install prompt. Use the steps below.");
    }
  }

  const status = !ready
    ? "Checking this browser"
    : installed
      ? "Installed on this device"
      : canInstall
        ? "Ready to install"
        : platform === "ios"
          ? "Add it from Safari"
          : "Install from your browser";

  const state = installed ? "installed" : canInstall ? "ready" : "manual";

  return (
    <aside className="cr-install-card" aria-label="Install Chain Reaction">
      <div className="cr-install-card__orb" aria-hidden>
        <i />
        <i />
        <i />
      </div>

      <div className="cr-install-card__head">
        <img
          className="cr-install-card__icon"
          src="/icon-192.png"
          alt=""
          width={76}
          height={76}
        />
        <div>
          <p className="cr-install-card__kicker">Yaply app</p>
          <p className="cr-install-card__name">Chain Reaction</p>
          <p className="cr-install-card__meta">2–8 players · Turn-based</p>
        </div>
      </div>

      <p className="cr-install-card__status" data-state={state} role="status" aria-live="polite">
        <i aria-hidden />
        {status}
      </p>

      <div className="cr-install-card__actions">
        {installed ? (
          <Link className="cr-button cr-button--lg" href="/">
            Open Chain Reaction
          </Link>
        ) : canInstall ? (
          <button
            className="cr-button cr-button--lg"
            type="button"
            onClick={() => void handleInstall()}
          >
            <InstallIcon />
            Install Chain Reaction
          </button>
        ) : (
          <a className="cr-button cr-button--lg" href="#install-guide">
            <InstallIcon />
            See install steps
          </a>
        )}
        <p className="cr-install-card__hint">
          {installed
            ? "You are viewing the installed app. The board is ready."
            : "Your browser shows its own confirmation before anything is installed."}
        </p>
      </div>

      <div className="cr-install-card__foot" aria-hidden>
        <span>Own window</span>
        <span>No app store</span>
        <span>Free</span>
      </div>

      {message ? (
        <p className="cr-install-card__message" role="status">
          {message}
        </p>
      ) : null}
    </aside>
  );
}

export function InstallGuide() {
  const { platform, browser, installed } = usePwaInstall();
  const { guides, recommended } = getInstallGuides(APP_NAME, platform, browser);

  return (
    <>
      <div className="cr-install-guide">
        {guides.map((guide) => (
          <article
            className="cr-install-guide__card"
            key={guide.id}
            data-recommended={guide.id === recommended}
          >
            <div className="cr-install-guide__top">
              <span className="cr-install-guide__badge">
                {guide.id === recommended ? "Your device" : guide.short}
              </span>
              <span className="cr-install-guide__glyph">
                <GuideGlyph id={guide.id} />
              </span>
            </div>
            <h3>{guide.title}</h3>
            <ol>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="cr-install-guide__note">{guide.note}</p>
          </article>
        ))}
      </div>

      <p className="cr-install-guide__after">
        {installed ? (
          "You are already running the installed Chain Reaction app."
        ) : (
          <>
            Already installed? Open Chain Reaction from your home screen or app launcher.
            <ArrowRightIcon size={14} />
          </>
        )}
      </p>
    </>
  );
}

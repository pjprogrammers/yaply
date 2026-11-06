"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getInstallGuides,
  usePwaInstall,
  type InstallGuideId,
} from "@yaply/shared/install";

const APP_NAME = "Yaply";

function InstallGlyph() {
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 18.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function InstallCard() {
  const { ready, installed, canInstall, platform, install } = usePwaInstall();
  const [message, setMessage] = useState("");

  async function handleInstall() {
    const outcome = await install();
    if (outcome === "accepted") {
      setMessage("Installed. Open Yaply from your home screen or app launcher.");
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
    <aside className="install-card" aria-label="Install Yaply">
      <div className="install-card__head">
        <img
          className="install-card__icon"
          src="/icon-192.png"
          alt=""
          width={72}
          height={72}
        />
        <div>
          <p className="install-card__kicker">Yaply app</p>
          <p className="install-card__name">Yaply</p>
          <p className="install-card__meta">Browser games · Free</p>
        </div>
      </div>

      <p className="install-card__status" data-state={state} role="status" aria-live="polite">
        <i aria-hidden />
        {status}
      </p>

      <div className="install-card__actions">
        {installed ? (
          <Link className="button" href="/">
            Open Yaply
          </Link>
        ) : canInstall ? (
          <button className="button" type="button" onClick={() => void handleInstall()}>
            <InstallGlyph />
            Install Yaply
          </button>
        ) : (
          <a className="button" href="#install-guide">
            <InstallGlyph />
            See install steps
          </a>
        )}

        <p className="install-card__hint">
          {installed
            ? "You are viewing the installed app. Everything is already set up."
            : "The browser shows its own confirmation before anything is installed."}
        </p>
      </div>

      {message ? (
        <p className="install-card__message" role="status">
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
      <div className="install-guide">
        {guides.map((guide) => (
          <article
            className="install-guide__card"
            key={guide.id}
            data-recommended={guide.id === recommended}
          >
            <div className="install-guide__top">
              <span className="install-guide__badge">
                {guide.id === recommended ? "Your device" : guide.short}
              </span>
              <span className="install-guide__glyph">
                <GuideGlyph id={guide.id} />
              </span>
            </div>
            <h3>{guide.title}</h3>
            <ol>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="install-guide__note">{guide.note}</p>
          </article>
        ))}
      </div>

      <p className="install-guide__after">
        {installed
          ? "You are already running the installed Yaply app."
          : "Already installed? Open Yaply from your home screen or app launcher."}
      </p>
    </>
  );
}

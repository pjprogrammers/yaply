"use client";

import { useState } from "react";
import { getInstallGuides, usePwaInstall } from "@yaply/shared/install";
import { DownloadIcon } from "./install-icons";

export function InstallCard() {
  const state = usePwaInstall();
  const [message, setMessage] = useState("");
  const { recommended, guides } = getInstallGuides(
    "Who's the Spy",
    state.platform,
    state.browser,
  );

  const install = async () => {
    if (state.canInstall) {
      const outcome = await state.install();
      setMessage(
        outcome === "accepted"
          ? "Installed. The case file is on your home screen."
          : outcome === "dismissed"
            ? "Install dismissed. You can open the guide below any time."
            : "This browser did not offer an install prompt. Use the guide below.",
      );
      return;
    }
    document.getElementById("install-guide")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="install-card" data-ui>
      <p className="install-card-kicker">Install status</p>
      <h2>
        {state.installed
          ? "Already installed."
          : state.canInstall
            ? "Ready to install."
            : "Install from your browser."}
      </h2>
      <p className="install-card-copy">
        {state.installed
          ? "You are running the installed app. Close this tab and open the icon whenever the table needs a spy."
          : state.canInstall
            ? "This browser can add the game to your home screen or app launcher in one tap."
            : "No store, no account. Open the short guide for your device and add the game to your home screen or dock."}
      </p>

      <div className="install-status-row">
        <span>
          <i className={state.installed ? "is-on" : ""} />
          {state.installed ? "Installed" : "Browser"}
        </span>
        <span>
          <i className="is-on" />
          Secure context
        </span>
        <span>
          <i className={state.ready ? "is-on" : ""} />
          {state.ready ? "Ready" : "Checking"}
        </span>
      </div>

      <button className="button install-action" type="button" onClick={install}>
        <DownloadIcon size={16} />
        {state.installed
          ? "Open the install guide"
          : state.canInstall
            ? "Install the app"
            : "Show me how"}
      </button>
      {message && <p className="install-message">{message}</p>}

      <p className="install-card-note">
        Recommended for this device:{" "}
        <strong>{guides.find((guide) => guide.id === recommended)?.title}</strong>
      </p>
    </div>
  );
}

export function InstallGuides() {
  const state = usePwaInstall();
  const { recommended, guides } = getInstallGuides(
    "Who's the Spy",
    state.platform,
    state.browser,
  );

  return (
    <section className="install-guide" id="install-guide" aria-labelledby="install-guide-title">
      <div className="install-guide-head">
        <h2 id="install-guide-title">Add it to the device.</h2>
        <p>
          The game runs in the browser. Installing gives it an icon, its own
          window and one less tab to lose.
        </p>
      </div>
      <div className="install-guide-grid">
        {guides.map((guide) => (
          <article
            key={guide.id}
            className={`install-guide-card${guide.id === recommended ? " is-recommended" : ""}`}
          >
            <div className="install-guide-card-head">
              <h3>{guide.title}</h3>
              {guide.id === recommended && <span>Recommended</span>}
            </div>
            <p className="install-guide-short">{guide.short}</p>
            <ol>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="install-guide-note">{guide.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

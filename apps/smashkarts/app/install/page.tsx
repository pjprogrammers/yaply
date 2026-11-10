import type { Metadata } from "next";
import Link from "next/link";
import { InstallCard, InstallGuide } from "@/components/install-experience";
import { SiteNav } from "@/components/site-nav";
import { MAIN_URL, SITE_URL } from "@/lib/config";
import "./install.css";

export const metadata: Metadata = {
  title: "Install Smash Karts",
  description:
    "Install Smash Karts on your phone, tablet or desktop. The browser kart arena gets its own home-screen icon and full-screen window with no app store.",
  alternates: { canonical: `${SITE_URL}/install` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/install`,
    title: "Install Smash Karts",
    description:
      "Put the arena on your home screen. Smash Karts installs in seconds and opens in its own window.",
  },
};

const TICKER_WORDS = [
  "Install once",
  "Own window",
  "No app store",
  "Three arenas",
  "Eleven weapons",
  "No brakes",
];

const BENEFITS = [
  {
    number: "01",
    title: "The arena stays loaded",
    body: "The installed app opens straight into Smash Karts. No tab hunt, no browser toolbar taking a bite out of the arena.",
    tag: "Full screen",
  },
  {
    number: "02",
    title: "One tap to the fight",
    body: "Your kart, your nickname and the controls are already set up. Installing just puts the front door on your home screen.",
    tag: "Ready to play",
  },
  {
    number: "03",
    title: "No store in the middle",
    body: "There is no download queue or account. Your browser installs the app and handles updates quietly in the background.",
    tag: "Browser install",
  },
];

export default function InstallPage() {
  return (
    <main id="main">
      <SiteNav variant="install" />

      <section className="hero sm-install-hero" aria-labelledby="install-title">
        <div className="hero-grid">
          <div className="hero-copy margins">
            <p className="sm-install-eyebrow">
              <span aria-hidden="true" />
              Smash Karts · Installable web app
            </p>
            <h1 id="install-title" className="display hero-title">
              Smash
              <br />
              Karts
            </h1>
            <p className="hero-sub">
              Install the arena and keep the fight one tap away. No store, no
              download queue, no account — just a home-screen icon that opens the
              game in its own full-screen window.
            </p>
            <div className="hero-actions">
              <a href="#install-guide" className="button button-primary">
                See install steps
                <span aria-hidden="true">→</span>
              </a>
              <Link href="/play" className="button button-outline">
                Play in the browser
              </Link>
            </div>
            <ul className="hero-specs">
              <li>Free</li>
              <li>Android, iOS &amp; desktop</li>
              <li>Own window</li>
              <li>No app store</li>
            </ul>
          </div>

          <div className="sm-install-hero-media">
            <span className="sm-install-hero-caption">Arena app · Installable</span>
            <InstallCard />
            <span className="sm-install-hero-stamp" aria-hidden="true">
              No store
            </span>
          </div>
        </div>
      </section>

      <div className="hazard-band" aria-hidden="true" />

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              {TICKER_WORDS.map((word) => (
                <span key={`${copy}-${word}`}>{word}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <section className="section section-ink" aria-labelledby="why-title">
        <div className="margins">
          <div className="section-head">
            <h2 id="why-title" className="display section-title">
              No store.
              <br />
              No brakes.
            </h2>
            <p className="section-lede">
              Installing is a browser job, not an app-store download. What you
              get is a Smash Karts icon that launches the arena in its own window,
              ready for the next match.
            </p>
          </div>

          <div className="sm-install-features">
            {BENEFITS.map((benefit) => (
              <article className="sm-install-feature" key={benefit.number}>
                <span className="sm-install-feature__no">{benefit.number}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
                <span className="sm-install-feature__tag">{benefit.tag}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="section section-bone"
        id="install-guide"
        aria-labelledby="guide-title"
      >
        <div className="margins">
          <div className="section-head">
            <h2 id="guide-title" className="display section-title">
              Pick your
              <br />
              device.
            </h2>
            <p className="section-lede">
              The highlighted card matches the device you are on. Every route
              ends with a Smash Karts icon on your home screen.
            </p>
          </div>

          <InstallGuide />
        </div>
      </section>

      <section className="cta" aria-labelledby="cta-title">
        <div className="margins">
          <h2 id="cta-title" className="display cta-title">
            Install
          </h2>
          <div className="cta-row">
            <p>
              Install the arena once, then go straight from your home screen to
              the starting grid. Three maps, eleven weapons, no excuses.
            </p>
            <Link href="/play" className="button button-primary">
              Enter the arena
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer margins">
        <p className="footer-word" aria-hidden="true">
          Smash Karts
        </p>
        <div className="footer-row">
          <span>An original browser arena game from Yaply. © 2026 Yaply.</span>
          <div className="footer-links">
            <Link href="/">Home</Link>
            <Link href="/install">Install app</Link>
            <Link href="/play">Play</Link>
            <Link href="/#arenas">Arenas</Link>
            <a href={MAIN_URL}>All games</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

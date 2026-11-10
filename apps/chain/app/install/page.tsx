import type { Metadata } from "next";
import Link from "next/link";
import { InstallCard, InstallGuide } from "@/components/install-experience";
import { ArrowRightIcon, PlayIcon } from "@/components/icons";
import { LandingNav } from "@/components/landing-nav";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { MAIN_URL, SITE_URL } from "@/lib/config";
import { installSchema } from "@/lib/structured-data";
import "./install.css";

export const metadata: Metadata = {
  title: { absolute: "Install Chain Reaction | Yaply" },
  description:
    "Install Chain Reaction on your phone, tablet or desktop. The free online chain reaction game opens in its own window with no app store and no account.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/install` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/install`,
    siteName: "Yaply Chain Reaction",
    title: "Install Chain Reaction | Free online board game",
    description: GAME_SHORT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Chain Reaction — a glowing blue jellyfish above a dark electric game table with stacked orbs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Install Chain Reaction | Free online board game",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

const TICKER = [
  "Install once",
  "Own window",
  "No app store",
  "2–8 players",
  "One orb. Whole board.",
  "Chain Reaction",
];

const BENEFITS = [
  {
    number: "01",
    title: "Opens like a table",
    body: "The installed app launches straight to the board with no browser toolbar in the way. One tap and the room is on screen.",
    tag: "Full screen",
  },
  {
    number: "02",
    title: "Your name stays put",
    body: "Chain Reaction remembers the nickname you use in rooms, so joining the next game is one less thing to type.",
    tag: "Saved locally",
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(installSchema()) }}
      />
      <a href="#main" className="cr-skip">
        Skip to content
      </a>

      <div className="cr">
        <LandingNav variant="install" />

        <main id="main">
          <section className="cr-hero" aria-labelledby="install-title">
            <div className="cr-hero-scene" aria-hidden>
              <div className="cr-hero-floor cr-hero-floor--back" />
              <div className="cr-hero-floor cr-hero-floor--front" />
              <div className="cr-hero-orbit cr-hero-orbit--a">
                <i />
                <i />
                <i />
              </div>
              <div className="cr-hero-orbit cr-hero-orbit--b">
                <i />
                <i />
              </div>
            </div>

            <div className="cr-margins cr-hero-grid">
              <div className="cr-hero-copy">
                <p className="cr-eyebrow">
                  <span aria-hidden />
                  Chain Reaction · Installable web app
                </p>
                <h1 id="install-title" className="cr-title">
                  <span className="cr-title-line">
                    <span>Install</span>
                  </span>
                  <span className="cr-title-line">
                    <span>Chain</span>
                  </span>
                  <span className="cr-title-line">
                    <span>Reaction</span>
                  </span>
                </h1>
                <p className="cr-lede">
                  Install Chain Reaction and the table is always one tap away.
                  No store, no download queue, no account — just the board in its
                  own window.
                </p>
                <ul className="cr-specs">
                  <li>
                    <i style={{ background: "#c6f24e" }} aria-hidden />
                    2–8 players
                  </li>
                  <li>
                    <i style={{ background: "#4cb3f0" }} aria-hidden />
                    Online, pass-and-play or CPU
                  </li>
                  <li>
                    <i style={{ background: "#f2b33d" }} aria-hidden />
                    No app store
                  </li>
                </ul>
              </div>

              <InstallCard />
            </div>
          </section>

          <div className="cr-ticker" aria-hidden="true">
            <div className="cr-ticker-track">
              {[0, 1].map((copy) => (
                <span key={copy}>
                  {TICKER.map((word) => (
                    <span key={`${copy}-${word}`}>{word}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          <section className="cr-section cr-section--paper">
            <div className="cr-margins">
              <div className="cr-section-head">
                <div>
                  <p className="cr-kicker">Why install</p>
                  <h2 className="cr-h2">
                    A table
                    <br />
                    of your own.
                  </h2>
                </div>
                <p className="cr-lede">
                  The browser does the installation. What you get is a home-screen
                  icon that opens Chain Reaction in its own window, ready for the
                  next room code.
                </p>
              </div>

              <div className="cr-install-features">
                {BENEFITS.map((benefit) => (
                  <article className="cr-install-feature" key={benefit.number}>
                    <span className="cr-install-feature__no">{benefit.number}</span>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.body}</p>
                    <span className="cr-install-feature__tag">{benefit.tag}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="cr-section cr-section--ice" id="install-guide">
            <div className="cr-margins">
              <div className="cr-section-head">
                <div>
                  <p className="cr-kicker">Install guide</p>
                  <h2 className="cr-h2">
                    Pick your
                    <br />
                    device.
                  </h2>
                </div>
                <p className="cr-lede">
                  The highlighted card matches the device you are on. Every route
                  ends with a Chain Reaction icon on your home screen.
                </p>
              </div>

              <InstallGuide />
            </div>
          </section>

          <section className="cr-cta" aria-labelledby="cta-title">
            <div className="cr-margins">
              <p className="cr-kicker">Your move</p>
              <h2 id="cta-title" className="cr-cta-title">
                The board is
                <br />
                one tap away.
              </h2>
              <div className="cr-cta-row">
                <p>
                  Install it once, then start a room or join with a code. The
                  rules do the rest.
                </p>
                <div className="cr-actions">
                  <Link href="/create" className="cr-button cr-button--dark cr-button--lg">
                    <PlayIcon size={15} />
                    Start a game
                  </Link>
                  <Link href="/" className="cr-button cr-button--outline-dark cr-button--lg">
                    Open the homepage
                    <ArrowRightIcon size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="cr-footer">
          <div className="cr-margins">
            <p className="cr-footer-word" aria-hidden="true">
              Chain
            </p>
            <div className="cr-footer-row">
              <span>An original browser board game from Yaply. © 2026 Yaply.</span>
              <div className="cr-footer-links">
                <Link href="/">Home</Link>
                <Link href="/install">Install app</Link>
                <Link href="/create">Start a game</Link>
                <Link href="/how-to-play">How to play</Link>
                <a href={MAIN_URL}>All games</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

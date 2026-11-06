import type { Metadata } from "next";
import Link from "next/link";
import { InstallCard, InstallGuide } from "@/components/install-experience";
import { ArrowRightIcon, PlayIcon, SkribblMark } from "@/components/icons";
import { MAIN_URL, SITE_URL } from "@/lib/config";
import "./install.css";

export const metadata: Metadata = {
  title: "Install Skribbl",
  description:
    "Install Skribbl on your phone, tablet or desktop. The drawing and guessing game gets its own home-screen icon with no app store and no account.",
  alternates: { canonical: `${SITE_URL}/install` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/install`,
    title: "Install Skribbl",
    description:
      "Put the pen on your home screen. Skribbl installs in seconds and opens in its own window.",
  },
};

const TICKER = [
  "One tap",
  "No app store",
  "Own window",
  "Draw badly",
  "Guess fast",
  "2–12 players",
];

const BENEFITS = [
  {
    number: "01",
    title: "A blank sheet, ready",
    body: "The installed app opens straight into Skribbl. Create a room or join with a code without hunting for the browser tab.",
    tag: "Own window",
  },
  {
    number: "02",
    title: "Your nickname stays",
    body: "Skribbl remembers the name you use in rooms, so the next game starts with fewer taps and less typing.",
    tag: "Saved locally",
  },
  {
    number: "03",
    title: "No store in the middle",
    body: "There is no download queue or account. Your browser installs the app and quietly keeps it up to date.",
    tag: "Browser install",
  },
];

export default function InstallPage() {
  return (
    <>
      <a href="#main" className="landing-skip">
        Skip to content
      </a>

      <div className="landing">
        <header className="landing-nav">
          <div className="landing-margins landing-nav-inner">
            <Link href="/" className="landing-brand" aria-label="Yaply Skribbl home">
              <SkribblMark />
              <span>Skribbl</span>
            </Link>

            <nav className="landing-links" aria-label="Primary">
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#words">Words</Link>
              <Link href="/#scoring">Scoring</Link>
              <Link href="/install">Install</Link>
            </nav>

            <div className="landing-nav-actions">
              <Link href="/join" className="landing-nav-join">
                Join a room
              </Link>
              <Link href="/create" className="landing-button">
                Create a room
              </Link>
            </div>
          </div>
        </header>

        <main id="main">
          <section className="landing-hero" aria-labelledby="install-title">
            <div className="landing-margins landing-hero-grid">
              <div className="landing-hero-copy">
                <p className="landing-eyebrow">Skribbl · Installable web app</p>
                <h1 id="install-title" className="landing-title">
                  Skribbl,
                  <br />
                  one tap away.
                </h1>
                <p className="landing-lede">
                  Install Skribbl and the blank sheet is always within reach. No
                  store, no download queue, no account — just a home-screen icon
                  that opens the game in its own window.
                </p>
                <ul className="landing-specs">
                  <li>2–12 players</li>
                  <li>60–120s rounds</li>
                  <li>No app store</li>
                </ul>
              </div>

              <InstallCard />
            </div>
          </section>

          <div className="landing-ticker" aria-hidden="true">
            <div className="landing-ticker-track">
              {[0, 1].map((copy) => (
                <span key={copy}>
                  {TICKER.map((word) => (
                    <span key={`${copy}-${word}`}>{word}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          <section className="landing-section landing-section--paper">
            <div className="landing-margins">
              <div className="landing-section-head">
                <h2 className="landing-h2">
                  The pen,
                  <br />
                  always ready.
                </h2>
                <p className="landing-lede">
                  The browser does the installation. What you get is a Skribbl icon
                  that opens the game in its own window, ready for the next room
                  code.
                </p>
              </div>

              <div className="sk-install-features">
                {BENEFITS.map((benefit) => (
                  <article className="sk-install-feature" key={benefit.number}>
                    <span className="sk-install-feature__no">{benefit.number}</span>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.body}</p>
                    <span className="sk-install-feature__tag">{benefit.tag}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="landing-section landing-section--yellow" id="install-guide">
            <div className="landing-margins">
              <div className="landing-section-head">
                <h2 className="landing-h2">
                  Pick your
                  <br />
                  device.
                </h2>
                <p className="landing-lede">
                  The highlighted card matches the device you are on. Every route
                  ends with a Skribbl icon on your home screen.
                </p>
              </div>

              <InstallGuide />
            </div>
          </section>

          <section className="landing-cta" aria-labelledby="cta-title">
            <div className="landing-margins">
              <h2 id="cta-title" className="landing-cta-title">
                Start a room.
                <br />
                Bring a pen.
              </h2>
              <div className="landing-cta-row">
                <p>
                  Install it once, then create a room or join with a code. The
                  first bad drawing is one tap away.
                </p>
                <div className="landing-actions">
                  <Link href="/create" className="landing-button landing-button--lg">
                    <PlayIcon size={15} />
                    Create a room
                  </Link>
                  <Link
                    href="/"
                    className="landing-button landing-button--ghost landing-button--lg"
                  >
                    Open the homepage
                    <ArrowRightIcon size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <div className="landing-margins">
            <p className="landing-footer-word" aria-hidden="true">
              Skribbl
            </p>
            <div className="landing-footer-row">
              <span>An original browser party game from Yaply. © 2026 Yaply.</span>
              <div className="landing-footer-links">
                <Link href="/">Home</Link>
                <Link href="/install">Install app</Link>
                <Link href="/create">Create a room</Link>
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

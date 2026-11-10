import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { InstallCard, InstallGuide } from "@/components/install/pwa";
import { installSchema } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import "./install.css";

export const metadata: Metadata = {
  title: "Install Yaply",
  description:
    "Install Yaply on your phone, tablet or desktop. Put every Yaply game one tap away with no app store and no account.",
  keywords: [
    "install yaply",
    "yaply app",
    "yaply games app",
    "yaplygames",
    "browser game app",
    "install web app",
    "pwa game",
    "add to home screen",
    "play browser games offline",
  ],
  alternates: { canonical: `${SITE_URL}/install` },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/install`,
    siteName: "Yaply Games",
    title: "Install Yaply",
    description:
      "Put the whole Yaply games shelf on your home screen. Free, no app store, no account.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Yaply browser games — a fanned deck of game posters on a blue and yellow field",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Install Yaply",
    description:
      "Put the whole Yaply games shelf on your home screen. Free, no app store, no account.",
    images: ["/og.png"],
  },
};

const TICKER = [
  "One tap",
  "No app store",
  "Full screen",
  "Home screen ready",
  "Android · iOS · Desktop",
  "Your games, your people",
];

const BENEFITS = [
  {
    number: "01",
    title: "Straight into the room",
    body: "The installed app opens on the games shelf. Pick a game, send a code and skip the browser tab hunt.",
  },
  {
    number: "02",
    title: "No store, no account",
    body: "Installation is handled by your browser. There is no download queue, no account and no update prompt from an app store.",
  },
  {
    number: "03",
    title: "Built for the group chat",
    body: "Yaply still shares room links and codes the same way. The app just keeps the front door on your home screen.",
  },
];

export default function InstallPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(installSchema()) }}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar initialChapter="blue" />
      <main id="main">
        <section className="install-hero" data-chapter="blue">
          <div className="shell install-hero__grid">
            <div>
              <p className="install-eyebrow">
                <span aria-hidden />
                Yaply · Installable web app
              </p>
              <h1>
                Your games.
                <span>One tap away.</span>
              </h1>
              <p className="install-lede">
                Install Yaply once and keep the whole games shelf on your home
                screen. No app store, no account, no launcher.
              </p>
              <ul className="install-specs" aria-label="Install facts">
                <li>Free</li>
                <li>Works on Android, iOS and desktop</li>
                <li>Opens full screen</li>
              </ul>
            </div>
            <InstallCard />
          </div>
        </section>

        <div className="install-ticker" aria-hidden="true">
          <div className="install-ticker__track">
            {[0, 1].map((copy) => (
              <span key={copy}>
                {TICKER.map((word) => (
                  <span key={`${copy}-${word}`}>{word}</span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section className="install-section install-section--black" data-chapter="black">
          <div className="shell">
            <div className="install-head">
              <h2>An app icon. Not another app store.</h2>
              <p>
                Yaply is a web app, so installing it takes seconds. The browser
                adds a home-screen icon and opens the site in its own window.
              </p>
            </div>

            <div className="install-features">
              {BENEFITS.map((benefit) => (
                <article className="install-feature" key={benefit.number}>
                  <span className="install-feature__no">{benefit.number}</span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="install-section install-section--yellow"
          id="install-guide"
          data-chapter="yellow"
        >
          <div className="shell">
            <div className="install-head">
              <h2>Pick your device.</h2>
              <p>
                Your browser handles installation. The highlighted card matches
                the device you are on right now.
              </p>
            </div>
            <InstallGuide />
          </div>
        </section>

        <section className="install-cta" data-chapter="blue">
          <div className="shell">
            <h2>Game night, already open.</h2>
            <div className="install-cta__row">
              <p>
                Install Yaply, then install only the games your group actually
                plays. Each game gets its own icon and its own window.
              </p>
              <div className="install-cta__actions">
                <Link href="/apps" className="button">
                  Install a game app
                </Link>
                <Link href="/games" className="button button--dark">
                  Browse all games
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

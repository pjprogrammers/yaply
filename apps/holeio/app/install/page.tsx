import type { Metadata } from "next";
import Link from "next/link";
import { InstallCard, InstallGuide } from "@/components/install-experience";
import { SiteNav } from "@/components/site-nav";
import { GAME_KEYWORDS } from "@/lib/content";
import { MAIN_URL, SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Install Hole.io — add the hole game to your home screen" },
  description:
    "Install Hole.io on your phone, tablet or desktop. The free browser hole game gets its own home-screen icon and full-screen window with no app store, no download queue and no account.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/install` },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/install`,
    siteName: "Yaply",
    title: "Install Hole.io — add the hole game to your home screen",
    description:
      "Put the hole on your home screen. Hole.io installs in seconds and opens in its own window.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Hole.io — a black hole swallowing a city block on a lime field",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Install Hole.io — add the hole game to your home screen",
    description:
      "Install once and keep the city one tap away. No store, no download queue, no account.",
    images: ["/og.png"],
  },
};

const breadcrumbs = breadcrumbSchema([
  { name: "Hole.io", path: "/" },
  { name: "Install Hole.io", path: "/install" },
]);

const BENEFITS = [
  {
    number: "01",
    title: "The city stays loaded",
    body: "The installed app opens straight into Hole.io. No tab hunt, no browser toolbar taking a bite out of the street.",
    tag: "Full screen",
  },
  {
    number: "02",
    title: "One tap to the match",
    body: "Your name and sound settings are remembered. Installing just puts the front door on your home screen.",
    tag: "Ready to play",
  },
  {
    number: "03",
    title: "No store in the middle",
    body: "There is no download queue or account. Your browser installs the app and handles updates quietly in the background.",
    tag: "Browser install",
  },
];

const TICKER = [
  "Install once",
  "Own window",
  "No app store",
  "Two-minute matches",
  "Eight holes",
  "No download queue",
];

export default function InstallPage() {
  return (
    <main id="main" className="install-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <SiteNav variant="install" />

      <section className="install-hero" aria-labelledby="install-title">
        <div className="install-hero__copy margins">
          <p className="eyebrow">
            <span aria-hidden />
            Hole.io · Installable web app
          </p>
          <h1 id="install-title" className="display install-hero__title">
            Hole.io,{" "}
            <br />
            on your{" "}
            <br />
            home screen.
          </h1>
          <p className="install-hero__sub">
            Install once and keep the city one tap away. No store, no download
            queue, no account — just an icon that opens the game in its own
            full-screen window.
          </p>
          <div className="hero__actions">
            <a href="#install-guide" className="pill pill--lime pill--big">
              See install steps
              <span aria-hidden>→</span>
            </a>
            <Link href="/play" className="pill pill--outline pill--big">
              Play in the browser
            </Link>
          </div>
          <ul className="hero__specs">
            <li>Free</li>
            <li>Android, iOS &amp; desktop</li>
            <li>Own window</li>
          </ul>
        </div>
        <div className="install-hero__card">
          <InstallCard />
        </div>
      </section>

      <div className="ticker" aria-hidden>
        <div className="ticker__track">
          {[0, 1].map((copy) => (
            <span className="ticker__group" key={copy}>
              {TICKER.map((word) => (
                <span key={`${copy}-${word}`}>
                  {word}
                  <i />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <section className="install-why margins" aria-labelledby="why-title">
        <div className="how-head">
          <h2 id="why-title" className="display how-title">
            No store.
            <br />
            No brakes.
          </h2>
          <p className="how-lede">
            Installing is a browser job, not an app-store download. What you get
            is a Hole.io icon that launches the city in its own window, ready for
            the next match.
          </p>
        </div>
        <div className="install-benefits">
          {BENEFITS.map((benefit) => (
            <article className="install-benefit" key={benefit.number}>
              <span className="install-benefit__no">{benefit.number}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
              <span className="install-benefit__tag">{benefit.tag}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="install-guide" className="install-guide-section margins" aria-labelledby="guide-title">
        <div className="how-head">
          <h2 id="guide-title" className="display how-title">
            Pick your
            <br />
            device.
          </h2>
          <p className="how-lede">
            The highlighted card matches the device you are on. Every route ends
            with a Hole.io icon on your home screen.
          </p>
        </div>
        <InstallGuide />
      </section>

      <section className="cta-section margins" aria-labelledby="install-cta">
        <p className="install-cta-line display">
          One icon between you and the city.
        </p>
        <div className="install-cta-row">
          <p id="install-cta">
            Install the app, then go from your home screen straight into the
            street. Two minutes a match, no excuses.
          </p>
          <Link href="/play" className="pill pill--lime pill--big">
            Enter the city
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <footer className="site-footer site-footer--simple">
        <div className="footer-bottom margins">
          <span>An original browser game from Yaply. © 2026 Yaply.</span>
          <div className="site-footer__links">
            <Link href="/">Home</Link>
            <Link href="/play">Play</Link>
            <a href={MAIN_URL}>All games</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { aboutSchema } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "About Yaply Games" },
  description:
    "Yaply (YaplyGames) is a browser games platform for game night. One link, no installs and a small shelf of multiplayer games built to start fast: Chain Reaction, Skribbl, Smash Karts, Hole.io and Who's the Spy.",
  keywords: [
    "about yaply",
    "yaply games",
    "yaplygames",
    "yaply game",
    "yaply browser games",
    "free browser games",
    "multiplayer browser games",
  ],
  alternates: { canonical: "/about" },
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
    url: `${SITE_URL}/about`,
    siteName: "Yaply Games",
    title: "About Yaply Games",
    description:
      "A browser games platform for game night. One link, no installs and a small shelf of multiplayer games built to start fast.",
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
    title: "About Yaply Games",
    description:
      "The browser games platform for game night. One link, no installs, five games live.",
    images: ["/og.png"],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema()) }}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar initialChapter="blue" />
      <main id="main">
        <section className="page-hero" data-chapter="blue">
          <div className="shell">
            <h1>About Yaply</h1>
            <p className="page-hero__lead">
              A small games platform for the part of the evening where everyone
              is still deciding what to play.
            </p>
          </div>
        </section>
        <section className="about-section" data-chapter="black">
          <div className="shell">
            <div className="about-grid">
              <h2>One link does the introductions.</h2>
              <div className="about-copy">
                <p>
                  Yaply (also written YaplyGames or Yaply Games) exists because
                  game night should start faster. Every game runs in the
                  browser, so there is no download, no launcher and no
                  five-minute setup before the first round.
                </p>
                <p>
                  Chain Reaction, Skribbl, Smash Karts, Hole.io and Who&apos;s the Spy
                  are live now. Ludo is next. Each game has its own room link,
                  its own rules and the same low-friction way in.
                </p>
                <p>
                  It is built for phones first, because that is where the group
                  chat already is. Open a link, pick a name and play.
                </p>
              </div>
            </div>
            <p className="about-pull">
              One link. Everyone in. That is the whole setup.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { GameGrid } from "@/components/game-grid";
import { Footer } from "@/components/footer";
import { gamesSchema } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Yaply Games — all browser games" },
  description:
    "Browse every Yaply browser game: Chain Reaction, Skribbl, Smash Karts, Hole.io, Ludo and Who's the Spy. Free multiplayer browser games with no installs, no launcher and no account — just one link.",
  keywords: [
    "yaply games",
    "yaplygames",
    "yaply game",
    "yaply",
    "all yaply games",
    "browser games",
    "free browser games",
    "multiplayer browser games",
    "games to play with friends",
    "games to play with friends online",
    "online party games",
    "chain reaction",
    "skribbl",
    "smash karts",
    "smashkarts",
    "holeio",
    "who is the spy",
  ],
  alternates: { canonical: "/games" },
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
    url: `${SITE_URL}/games`,
    siteName: "Yaply Games",
    title: "Yaply Games — all browser games",
    description:
      "Six browser games for game night. Five live now, one on the way.",
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
    title: "Yaply Games — all browser games",
    description:
      "Chain Reaction, Skribbl, Smash Karts, Hole.io and Who's the Spy. Free browser games for game night, no installs.",
    images: ["/og.png"],
  },
};

export default function GamesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gamesSchema()) }}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar initialChapter="blue" />
      <main id="main">
        <section className="page-hero" data-chapter="blue">
          <div className="shell">
            <h1>All games</h1>
            <p className="page-hero__lead">
              Six browser games for the same link and the same group chat.
            </p>
            <p className="page-hero__meta">
              No installs. No launcher. Pick a game and send the link.
            </p>
          </div>
        </section>
        <GameGrid />
      </main>
      <Footer />
    </>
  );
}

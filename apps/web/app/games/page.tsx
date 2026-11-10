import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { GameGrid } from "@/components/game-grid";
import { Footer } from "@/components/footer";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "All browser games",
  description:
    "Browse every Yaply browser game: Chain Reaction, Skribbl, Smash Karts, Hole.io, Ludo and Who's the Spy. No installs, no launcher, just one link.",
  alternates: { canonical: "/games" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/games`,
    siteName: "Yaply",
    title: "All browser games | Yaply",
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
};

export default function GamesPage() {
  return (
    <>
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

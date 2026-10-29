import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "About",
  description:
    "Yaply is a browser games platform for game night. One link, no installs and a small shelf of multiplayer games built to start fast.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://yaply.eu.org/about",
    siteName: "Yaply",
    title: "About Yaply",
    description:
      "A browser games platform for game night. One link, no installs and a small shelf of multiplayer games built to start fast.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Yaply browser games: Chain Reaction, Skribbl, Ludo, Who's the Spy and Smash Karts",
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <>
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
                  Yaply exists because game night should start faster. Every
                  game runs in the browser, so there is no download, no launcher
                  and no five-minute setup before the first round.
                </p>
                <p>
                  Chain Reaction and Skribbl are live now. Ludo, Who&apos;s the
                  Spy and Smash Karts are next. Each game has its own room link,
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

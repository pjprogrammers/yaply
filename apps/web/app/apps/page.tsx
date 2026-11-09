import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { availableGames } from "@/data/games";
import { SITE_URL } from "@/lib/site";
import "./apps.css";

export const metadata: Metadata = {
  title: "Install the Yaply apps",
  description:
    "Install each Yaply browser game as its own app. Yaply, Chain Reaction, Skribbl, Smash Karts and Hole.io each get a separate home-screen icon and window.",
  alternates: { canonical: `${SITE_URL}/apps` },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/apps`,
    siteName: "Yaply",
    title: "Install the Yaply apps | Yaply",
    description:
      "One install per game. Pick the Yaply apps your group actually plays and add them to your home screen.",
  },
};

type InstallableApp = {
  id: string;
  name: string;
  tag: string;
  description: string;
  installHref: string;
  playHref: string;
  playLabel: string;
  icon: string;
  color: string;
};

const apps: InstallableApp[] = [
  {
    id: "yaply",
    name: "Yaply",
    tag: "Platform",
    description:
      "The whole games shelf, installed as one app. Open Yaply and pick a game without opening a browser tab first.",
    installHref: "/install",
    playHref: "/games",
    playLabel: "Browse games",
    icon: "/icon-192.png",
    color: "#1423b8",
  },
  ...availableGames.flatMap((game) => {
    if (!game.url) return [];

    return [
      {
        id: game.id,
        name: game.name,
        tag: game.tag ?? "Game",
        description: game.statement,
        installHref: new URL("/install", game.url).toString(),
        playHref: game.url,
        playLabel: `Play ${game.name}`,
        // Keep the directory fast and readable even before a game deployment
        // has been updated with its own PWA icons.
        icon: `/app-icons/${game.slug}.png`,
        color: game.color,
      },
    ];
  }),
];

export default function AppsPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar initialChapter="blue" />
      <main id="main">
        <section className="apps-hero" data-chapter="blue">
          <div className="shell">
            <p className="apps-eyebrow">
              <span aria-hidden />
              One install per app
            </p>
            <h1>Install the shelf.</h1>
            <p className="apps-hero__lead">
              Every Yaply game installs separately, with its own icon and its own
              window. Pick the games your group actually plays — there is no
              bundle and no store.
            </p>
          </div>
        </section>

        <section className="apps-section" data-chapter="black">
          <div className="shell">
            <div className="apps-section__head">
              <h2>Five apps. Five home screens.</h2>
              <p>
                Install only what you need. Each app keeps its own origin,
                service worker and update cycle.
              </p>
            </div>

            <div className="apps-grid">
              {apps.map((app) => (
                <article
                  className="apps-card"
                  key={app.id}
                  style={{ "--apps-color": app.color } as CSSProperties}
                >
                  <div className="apps-card__top">
                    <img
                      className="apps-card__icon"
                      src={app.icon}
                      alt=""
                      width={72}
                      height={72}
                      loading="lazy"
                    />
                    <span className="apps-card__tag">{app.tag}</span>
                  </div>
                  <h2>{app.name}</h2>
                  <p>{app.description}</p>
                  <div className="apps-card__actions">
                    <a className="button" href={app.installHref}>
                      Install
                    </a>
                    <a className="apps-card__play" href={app.playHref}>
                      {app.playLabel}
                      <span aria-hidden>→</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="apps-note" data-chapter="yellow">
          <div className="shell apps-note__inner">
            <div>
              <h2>Start with the main app.</h2>
              <p>
                Install Yaply first if you want the shelf in one place. Install a
                game directly if that is the only one your group plays.
              </p>
            </div>
            <Link href="/install" className="button">
              Install Yaply
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

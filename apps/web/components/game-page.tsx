import Link from "next/link";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import GameLink from "./game-link";
import { gameStatusLabel, type GameEntry } from "@/data/games";
import { gamePageSchema } from "@/lib/structured-data";

export function GamePage({ game }: { game: GameEntry }) {
  const live = game.status === "available";
  const installUrl = game.url
    ? `${game.url.replace(/\/$/, "")}/install`
    : "/apps";
  const schema = gamePageSchema(game);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar initialChapter="blue" />
      <main id="main">
        <section className="page-hero game-page__hero" data-chapter="blue">
          <div className="shell game-page__hero-grid">
            <div>
              <h1>{game.name}</h1>
              <p className="page-hero__lead">{game.statement}</p>
              <p className="page-hero__meta">
                {game.tag} · {gameStatusLabel(game)}
              </p>
              <div className="page-hero__actions">
                {live ? (
                  <GameLink game={game} className="button">
                    Play {game.name}
                  </GameLink>
                ) : (
                  <Link href="/games" className="button">
                    Browse all games
                  </Link>
                )}
              </div>
            </div>
            <img
              className="game-page__poster"
              src={game.poster}
              alt={game.alt}
              width={900}
              height={1200}
              loading="eager"
            />
          </div>
        </section>
        <section className="game-page__body" data-chapter="black">
          <div className="shell game-page__body-grid">
            <h2>{live ? "Ready when you are." : "Still in the workshop."}</h2>
            <div>
              <p>{game.description}</p>
              <p>
                {live
                  ? `${game.name} is live now. Open the game and jump in — no installs, no account and no setup.`
                  : "This one is still being built. It will join the shelf when it is ready to play. Chain Reaction, Skribbl, Smash Karts, Hole.io and Who's the Spy are live in the meantime."}
              </p>
            </div>
          </div>
        </section>
        {game.about?.length ? (
          <section
            className="game-page__seo"
            aria-labelledby={`about-${game.slug}`}
          >
            <div className="shell game-page__seo-grid">
              <div>
                <p className="game-page__eyebrow">
                  {game.name} · Yaply browser arcade
                </p>
                <h2 id={`about-${game.slug}`}>About {game.name}</h2>
              </div>
              <div className="game-page__seo-copy">
                {game.about.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <p className="game-page__seo-links">
                  <Link href="/games">More Yaply games</Link>
                  <Link href="/apps">Install the apps</Link>
                  {live ? <a href={installUrl}>Install {game.name}</a> : null}
                </p>
              </div>
            </div>
          </section>
        ) : null}
        {game.faqs?.length ? (
          <section
            className="game-page__faq"
            aria-labelledby={`faq-${game.slug}`}
          >
            <div className="shell game-page__seo-grid">
              <div>
                <h2 id={`faq-${game.slug}`}>{game.name} FAQ</h2>
              </div>
              <div className="game-page__faq-list">
                {game.faqs.map((faq) => (
                  <details key={faq.question}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

import Link from "next/link";
import { CtaForm } from "@/components/cta-form";
import { ControlShowcase } from "@/components/control-showcase";
import { HowAccordion } from "@/components/how-accordion";
import { SeoSchema } from "@/components/seo-schema";
import { SiteNav } from "@/components/site-nav";
import { ABOUT_SECTIONS, FAQS, TIPS } from "@/lib/content";
import { MAIN_URL } from "@/lib/config";

export default function HomePage() {
  return (
    <main id="main" className="landing">
      <SeoSchema />
      <SiteNav />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy margins">
          <p className="eyebrow">
            <span aria-hidden />
            Free browser arcade · Two-minute matches
          </p>
          <h1 id="hero-title" className="hero__title display">
            Hole.io<span className="hero__title-dot">.</span>
            <br />
            swallow the city<span className="hero__title-dot">.</span>
          </h1>
          <p className="hero__sub">
            Hole.io is a free browser game: you are a hole with an appetite.
            Take the bins, then the cars, then the buildings, while seven rival
            holes eat the same streets.
          </p>
          <div className="hero__actions">
            <Link href="/play" className="pill pill--lime pill--big">
              Play free
              <span aria-hidden>→</span>
            </Link>
            <a href="#how" className="pill pill--outline pill--big">
              How it works
            </a>
          </div>
          <ul className="hero__specs">
            <li>No account</li>
            <li>No download</li>
            <li>Phone &amp; desktop</li>
          </ul>
        </div>

        <div className="hero__art" aria-hidden>
          <div className="hero-hole">
            <div className="hero-hole__core">
              <img src="/media/game-hero.png" alt="" />
              <span className="hero-hole__shade" />
            </div>
            <span className="hero-hole__rim" />
            <span className="hero-hole__rim hero-hole__rim--inner" />
          </div>
          <span className="hero-tag hero-tag--one">
            <i />
            8 holes live
          </span>
          <span className="hero-tag hero-tag--two">120 seconds</span>
          <span className="hero-tag hero-tag--three">The street is food</span>
        </div>
      </section>

      <div className="ticker" aria-hidden>
        <div className="ticker__track">
          {[0, 1].map((copy) => (
            <span className="ticker__group" key={copy}>
              <span>Cars are food</span>
              <i />
              <span>Buildings are food</span>
              <i />
              <span>Rivals are food</span>
              <i />
              <span>The clock is not</span>
              <i />
            </span>
          ))}
        </div>
      </div>

      <section className="statement" aria-label="The premise">
        <p className="statement__text">
          Two minutes. Eight holes. One city that{" "}
          <span className="inline-thumb inline-thumb--wide">
            <img src="/media/game-street.png" alt="The Hole.io city street" />
          </span>{" "}
          disappears block by block, and only the biggest hole{" "}
          <span className="inline-thumb">
            <img src="/media/game-swallow.png" alt="A hole swallowing a car" />
          </span>{" "}
          leaves a mark.
        </p>
      </section>

      <section id="city" className="city-section" aria-labelledby="city-title">
        <div className="city-media">
          <div className="city-media__circle">
            <img src="/media/game-city.png" alt="A grown hole beside a rival hole in the city" />
          </div>
          <span className="city-media__caption">Live city · one match</span>
        </div>

        <div className="city-copy">
          <h2 id="city-title" className="display city-copy__title">
            Everything
            <br />
            is food.
          </h2>
          <p className="city-copy__lede">
            A hand-built city with six blocks, real traffic and something to
            swallow on every corner. Growth is the only upgrade.
          </p>

          <ul className="city-points">
            <li>
              <span aria-hidden />
              <b>Street furniture</b>
              Bins, bollards, benches and hydrants get you started.
            </li>
            <li>
              <span aria-hidden />
              <b>Cars &amp; buses</b>
              Traffic keeps moving. Cut it off and it is lunch.
            </li>
            <li>
              <span aria-hidden />
              <b>Trees &amp; parks</b>
              Whole green blocks disappear if your rim is wide enough.
            </li>
            <li>
              <span aria-hidden />
              <b>Small buildings</b>
              Kiosks first, then shops, then the corner offices.
            </li>
            <li>
              <span aria-hidden />
              <b>Statues</b>
              The plaza centrepiece is worth more than a street of cars.
            </li>
            <li>
              <span aria-hidden />
              <b>Rival holes</b>
              Smaller holes are a score multiplier. Bigger holes are weather.
            </li>
            <li>
              <span aria-hidden />
              <b>Pedestrians</b>
              They scatter when they see you. Catch them early.
            </li>
            <li>
              <span aria-hidden />
              <b>The leaderboard</b>
              Eight names, live scores, two minutes of pressure.
            </li>
          </ul>
        </div>
      </section>

      <section id="how" className="how-section" aria-labelledby="how-title">
        <div className="how-head">
          <h2 id="how-title" className="display how-title">
            From pothole
            <br />
            to problem.
          </h2>
          <p className="how-lede">
            The rules fit on a drain cover. Eat what is smaller than you, grow,
            and be the biggest thing left when the clock stops.
          </p>
        </div>
        <HowAccordion />
      </section>

      <ControlShowcase />

      <section id="faq" className="faq-section margins" aria-labelledby="faq-title">
        <div className="faq-head">
          <h2 id="faq-title" className="display faq-title">
            Questions
            <br />
            from below.
          </h2>
          <p>
            Short answers to the things people ask before they drop in. If
            something is missing, the game itself is the fastest way to find out.
          </p>
        </div>

        <div className="faq-list">
          {FAQS.map((item, index) => (
            <details className="faq-item" name="holeio-faq" key={item.q}>
              <summary>
                <span className="faq-item__number">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span className="faq-item__q">{item.q}</span>
                <span className="faq-item__icon" aria-hidden>
                  <i />
                  <i />
                </span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        id="about"
        className="seo-section margins"
        aria-labelledby="about-title"
      >
        <div className="how-head seo-head">
          <div>
            <p className="eyebrow">
              <span aria-hidden />
              Hole.io · Yaply browser arcade
            </p>
            <h2 id="about-title" className="display how-title">
              The hole game,
              <br />
              in plain words.
            </h2>
          </div>
          <p className="how-lede">
            Hole.io is a free two-minute arcade game for a phone, tablet or
            desktop. It is also the easiest game to send when the group chat
            wants something to play with friends right now.
          </p>
        </div>

        <div className="seo-grid">
          {ABOUT_SECTIONS.map((section) => (
            <article className="seo-card" key={section.id}>
              <h3>{section.title}</h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
          <article className="seo-card seo-card--tips">
            <h3>Hole.io tips for a bigger score</h3>
            <ol className="seo-tips">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ol>
          </article>
        </div>

        <p className="seo-links">
          Ready to play? <Link href="/play">Play Hole.io free</Link>,{" "}
          <Link href="/install">install Hole.io</Link> for a home-screen icon,
          or browse <a href={MAIN_URL}>more browser games from Yaply</a>.
        </p>
      </section>

      <section className="cta-section margins" aria-labelledby="cta-title">
        <h2 id="cta-title" className="sr-only">
          Play Hole.io
        </h2>
        <CtaForm />
      </section>

      <footer className="site-footer">
        <div className="footer-mark" aria-hidden>
          <span className="footer-mark__tile footer-mark__tile--1">
            <i />
          </span>
          <span className="footer-mark__tile footer-mark__tile--2">
            <i />
          </span>
          <span className="footer-mark__tile footer-mark__tile--3">
            <i />
          </span>
          <span className="footer-mark__tile footer-mark__tile--4">
            <i />
          </span>
          <span className="footer-mark__tile footer-mark__tile--5">
            <i />
          </span>
        </div>

        <div className="footer-grid margins">
          <div className="footer-brand">
            <p className="wordmark wordmark--footer">
              <span className="wordmark__dot" aria-hidden />
              Hole.io
            </p>
            <p>
              An original browser arcade game from Yaply. Built with Three.js
              and a lot of missing pavement.
            </p>
          </div>
          <div className="footer-col">
            <p className="footer-col__title">Play</p>
            <Link href="/play">Play now</Link>
            <Link href="/install">Install app</Link>
            <a href="#control">Controls</a>
          </div>
          <div className="footer-col">
            <p className="footer-col__title">Game</p>
            <a href="#city">The city</a>
            <a href="#how">How it works</a>
            <a href="#about">About Hole.io</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-col footer-col--wide">
            <p className="footer-col__title">More from Yaply</p>
            <a href={MAIN_URL}>All games</a>
            <span>Made for the browser, not the app store.</span>
            <span>© 2026 Yaply. All original assets.</span>
          </div>
        </div>

        <div className="footer-bottom margins">
          <span>Hole.io · Yaply Arcade</span>
          <Link href="/play" className="pill pill--lime">
            Open the hole
            <span aria-hidden>→</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}

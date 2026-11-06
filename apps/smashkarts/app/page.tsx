import Link from "next/link";
import { ARENA_RULES, WEAPONS } from "@/game/constants";
import { MAP_LIST } from "@/game/maps";
import type { WeaponId } from "@/game/types";
import { ColorLab } from "@/components/color-lab";
import { MapPreview } from "@/components/map-preview";
import { Reveal } from "@/components/reveal";
import { WeaponGlyph } from "@/components/weapon-glyph";

const TICKER_WORDS = [
  "Drift",
  "Fire",
  "Ram",
  "Repeat",
  "Three arenas",
  "Eleven weapons",
  "No brakes",
];

const WEAPON_ORDER: WeaponId[] = [
  "machinegun",
  "bullets",
  "rockets",
  "cannonballs",
  "nuke",
  "grenuke",
  "snowball",
  "mines",
  "spikey",
  "invincibility",
  "fakebox",
];

export default function Home() {
  return (
    <main id="main">
      <nav className="nav margins" aria-label="Primary">
        <Link href="/" className="nav-word">
          Smash Karts
        </Link>
        <div className="nav-links">
          <a href="#arenas">Arenas</a>
          <a href="#arsenal">Arsenal</a>
          <a href="#controls">How to play</a>
          <a href="#paint">Garage</a>
          <Link href="/install">Install</Link>
        </div>
        <Link href="/play" className="nav-action">
          Play now
          <span aria-hidden="true">→</span>
        </Link>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid">
          <div className="hero-copy margins">
            <h1 id="hero-title" className="display hero-title">
              Smash
              <br />
              Karts
            </h1>
            <p className="hero-sub">
              A free-for-all kart arena in your browser. Three scrap-built maps,
              eleven weapons, and up to seven bots that will absolutely ram you.
            </p>
            <div className="hero-actions">
              <Link href="/play" className="button button-primary">
                Enter the arena
                <span aria-hidden="true">→</span>
              </Link>
              <a href="#arenas" className="button button-outline">
                See the arenas
              </a>
            </div>
            <ul className="hero-specs">
              <li>Runs in the browser</li>
              <li>1–7 bots</li>
              <li>WASD, arrows &amp; Space</li>
              <li>Touch controls built in</li>
              <li>No signup</li>
            </ul>
          </div>
          <div className="hero-media">
            <img
              src="/media/hero.jpg"
              alt="Karts fight around the slag pool in the Melt Shop arena."
              width={1100}
              height={1180}
            />
            <span className="hero-caption">Melt Shop. Mind the slag.</span>
          </div>
        </div>
      </section>

      <div className="hazard-band" aria-hidden="true" />

      <section id="arenas" className="section section-ink" aria-labelledby="arenas-title">
        <div className="margins">
          <Reveal className="section-head">
            <h2 id="arenas-title" className="display section-title">
              Three arenas.
              <br />
              No safe lane.
            </h2>
            <p className="section-lede">
              Every map follows the same rules: open lanes, hard cover, and a
              centerpiece that decides the fight. Learn the layout, or become
              part of it.
            </p>
          </Reveal>

          {MAP_LIST.map((map, index) => (
            <Reveal
              as="article"
              key={map.id}
              className={`arena-row ${index % 2 === 1 ? "is-flipped" : ""}`}
              delay={60}
            >
              <div className="arena-media">
                <MapPreview map={map} className="map-preview" />
                <span className="arena-caption">{map.tagline}</span>
              </div>
              <div className="arena-info">
                <h3>{map.name}</h3>
                <p className="arena-tagline">{map.tagline}</p>
                <p className="arena-description">{map.description}</p>
                <dl className="arena-stats">
                  <div>
                    <dt>Footprint</dt>
                    <dd>
                      {map.size} × {map.depth}
                    </dd>
                  </div>
                  <div>
                    <dt>Hard cover</dt>
                    <dd>{map.obstacles.length}</dd>
                  </div>
                  <div>
                    <dt>Boost pads</dt>
                    <dd>{map.boostPads.length}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              {TICKER_WORDS.map((word) => (
                <span key={`${copy}-${word}`}>{word}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <section id="arsenal" className="section section-signal" aria-labelledby="arsenal-title">
        <div className="margins">
          <Reveal className="section-head">
            <h2 id="arsenal-title" className="display section-title">
              Eleven weapons.
              <br />
              One slot.
            </h2>
            <p className="section-lede">
              Mystery crates hide the whole arsenal. You carry one weapon at a
              time, and the crate keeps its secret until you touch it. Machine
              Gun tracks; everything else needs your own aim. Crates respawn
              every nine seconds.
            </p>
          </Reveal>

          <div className="arsenal-list">
            {WEAPON_ORDER.map((id, index) => {
              const weapon = WEAPONS[id];
              return (
                <Reveal key={id} className="weapon-row" delay={index * 40}>
                  <div className="weapon-mark">
                    <WeaponGlyph weapon={id} className="h-9 w-9" />
                  </div>
                  <div className="weapon-body">
                    <h3>{weapon.name}</h3>
                    <p>{weapon.tagline}</p>
                  </div>
                  <p className="weapon-ammo">{weapon.ammoLabel}</p>
                </Reveal>
              );
            })}
          </div>

          <div className="arsenal-note">
            <span>Four boost pads per map. Use them before someone else does.</span>
            <Link href="/play" className="button button-dark button-sm">
              Load up
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="controls" className="section section-bone" aria-labelledby="controls-title">
        <div className="margins">
          <Reveal className="section-head">
            <h2 id="controls-title" className="display section-title">
              Five keys.
              <br />
              Zero excuses.
            </h2>
            <p className="section-lede">
              Arcade handling, no gearbox, no tyre temperatures. Point the kart,
              hold a hard turn to charge the mini-turbo, and keep the weapon
              circle hot. On a phone, the stick and the same fire circle appear
              automatically.
            </p>
          </Reveal>

          <div className="controls-grid">
            <Reveal>
              <div className="keyboard" aria-hidden="true">
                <div />
                <div className="key">W</div>
                <div />
                <div className="key">A</div>
                <div className="key">S</div>
                <div className="key">D</div>
                <div className="key key-wide">Space — fire</div>
              </div>
              <p className="key-note">
                Drive with WASD or the arrow keys. Hard turns charge a mini-turbo
                automatically, then straighten out to spend it. Space or the
                weapon circle fires. On touch screens, use the joystick and tap
                the circle on the right.
              </p>
            </Reveal>

            <Reveal delay={90}>
              <ul className="rules">
                {ARENA_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="paint" className="section section-coal" aria-labelledby="paint-title">
        <div className="margins">
          <Reveal className="section-head">
            <h2 id="paint-title" className="display section-title">
              Paint it loud.
              <br />
              Crash it louder.
            </h2>
            <p className="section-lede">
              Eight paints, one chunky little buggy. Pick a colour here and it
              will be waiting in the garage. The scratches are free.
            </p>
          </Reveal>

          <Reveal delay={60}>
            <ColorLab />
          </Reveal>
        </div>
      </section>

      <section className="section section-ink" aria-labelledby="proof-title">
        <div className="margins">
          <Reveal className="section-head">
            <h2 id="proof-title" className="display section-title">
              A bad lap
              <br />
              looks like this.
            </h2>
            <p className="section-lede">
              Two karts, one crate, no agreement about who gets it. The arena
              doesn&apos;t keep score of manners.
            </p>
          </Reveal>

          <Reveal>
            <div className="arena-media">
              <img
                src="/media/firefight.jpg"
                alt="A close-range firefight between two karts in the Night Shift arena."
                width={1280}
                height={720}
                loading="lazy"
              />
              <span className="arena-caption">Night Shift, forty seconds in.</span>
            </div>
          </Reveal>

          <div className="section-head" style={{ marginTop: "clamp(34px, 5vw, 56px)", marginBottom: 0 }}>
            <Reveal>
              <p className="section-lede" style={{ maxWidth: "34ch", fontSize: "clamp(22px, 2.4vw, 32px)", lineHeight: 1.35 }}>
                First to twenty wrecks, or the clock runs out. Respawn is three
                seconds. Grudges are optional.
              </p>
            </Reveal>
            <Reveal delay={80}>
              <dl className="arena-stats">
                <div>
                  <dt>Kill target</dt>
                  <dd>20</dd>
                </div>
                <div>
                  <dt>Respawn</dt>
                  <dd>3s</dd>
                </div>
                <div>
                  <dt>Match clock</dt>
                  <dd>5 min</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="cta" aria-labelledby="cta-title">
        <div className="margins">
          <Reveal>
            <h2 id="cta-title" className="display cta-title">
              Smash Karts
            </h2>
            <div className="cta-row">
              <p>
                Three maps, eleven weapons, seven bots, and a weapon circle that
                is also the trigger. The arena is one click away.
              </p>
              <Link href="/play" className="button button-primary">
                Enter the arena
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="footer margins">
        <p className="footer-word" aria-hidden="true">
          Smash Karts
        </p>
        <div className="footer-row">
          <span>An original browser arena game from Yaply. © 2026 Yaply.</span>
          <div className="footer-links">
            <Link href="/play">Play</Link>
            <a href="#arenas">Arenas</a>
            <a href="#arsenal">Arsenal</a>
            <a href="#controls">How to play</a>
            <Link href="/install">Install app</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

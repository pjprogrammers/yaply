import type { Viewport } from "next";
import Link from "next/link";
import {
  CHAIN_BOARD_PRESETS,
  PLAYER_COLORS,
} from "@yaply/shared/constants";
import { ArrowRightIcon, ChainMark, PlayIcon } from "@/components/icons";
import { ChainHeroBoard } from "@/components/hero-board";
import { MiniBoard } from "@/components/mini-board";
import { Reveal } from "@/components/reveal";
import { MAIN_URL } from "@/lib/config";

const SPECS = [
  { label: "2–8 players", color: PLAYER_COLORS[0] },
  { label: "4 board sizes", color: PLAYER_COLORS[1] },
  { label: "30–60s turns", color: PLAYER_COLORS[2] },
  { label: "Online, local or CPU", color: PLAYER_COLORS[3] },
];

const TICKER = ["Place", "Fill", "Pop", "Flip", "Chain", "Repeat", "One orb changes everything"];

const STEPS = [
  {
    title: "Claim a cell",
    body: "Place one orb on any empty cell, or stack one on a cell you already own. An opponent's cell is off-limits until the chain takes it for you.",
  },
  {
    title: "Load the cell",
    body: "Every cell has a critical mass. Corners give way at 2 orbs, edges at 3 and the middle at 4. Add the orb that crosses the line and it bursts.",
  },
  {
    title: "Let it chain",
    body: "A pop launches one orb into each orthogonal neighbour. Any cell pushed past its own limit pops next, flipping colours as the wave runs across the board.",
  },
  {
    title: "Be the last colour",
    body: "Lose every orb and you are out. The last player still holding a colour wins. Your score is simply the orbs you own when the dust settles.",
  },
];

const MASS = [
  { value: 2, label: "corner" },
  { value: 3, label: "edge" },
  { value: 2, label: "corner" },
  { value: 3, label: "edge" },
  { value: 4, label: "middle" },
  { value: 3, label: "edge" },
  { value: 2, label: "corner" },
  { value: 3, label: "edge" },
  { value: 2, label: "corner" },
];

type BoardSize = (typeof CHAIN_BOARD_PRESETS)[keyof typeof CHAIN_BOARD_PRESETS] & {
  name: string;
  blurb: string;
  tag: string;
  featured?: boolean;
};

const BOARD_SIZES: BoardSize[] = [
  {
    ...CHAIN_BOARD_PRESETS.small,
    name: "The quick one",
    blurb: "35 cells. Short games and sharp elbows.",
    tag: "Quick",
  },
  {
    ...CHAIN_BOARD_PRESETS.medium,
    name: "The default",
    blurb: "54 cells. Enough room to build a proper chain.",
    tag: "Recommended",
    featured: true,
  },
  {
    ...CHAIN_BOARD_PRESETS.large,
    name: "The long game",
    blurb: "96 cells. Cascades get room to breathe.",
    tag: "Long",
  },
  {
    ...CHAIN_BOARD_PRESETS.xxl,
    name: "The all-in",
    blurb: "140 cells. One move can run for a while.",
    tag: "XXL",
  },
];

const MODES = [
  {
    number: "01",
    title: "Online room",
    body: "Two to eight friends, one private table. The host sets the board and everyone joins from their own screen.",
    points: ["Share a six-character code", "Host controls the settings", "Rematch without rebuilding the room"],
    cta: "Create a room",
  },
  {
    number: "02",
    title: "Pass and play",
    body: "One screen, one table and a healthy amount of eye contact. Hand the device over when the turn ends.",
    points: ["Two to eight players locally", "Name every seat", "No connection needed"],
    cta: "Set up pass-and-play",
  },
  {
    number: "03",
    title: "Solo vs CPU",
    body: "Fill the empty seats with easy, medium or hard CPUs. A good place to learn the angles before you play people.",
    points: ["Three difficulty levels", "Same critical-mass rules", "Start another game instantly"],
    cta: "Set up a CPU game",
  },
];

const SETTINGS: Array<{ label: string; value: string; swatches?: string[] }> = [
  { label: "Board size", value: "5×7, 6×9, 8×12 or 10×14" },
  { label: "Turn clock", value: "30, 45 or 60 seconds" },
  {
    label: "Palette",
    value: "Classic, vivid, pastel, neon, mono — or your own",
    swatches: PLAYER_COLORS.slice(0, 5),
  },
  { label: "Table theme", value: "Dark, light or neon" },
  { label: "Grid", value: "2D flat or 3D table" },
  { label: "Confirm moves", value: "Off for speed, on for safety" },
  { label: "CPU seats", value: "Easy, medium or hard" },
];

const FAQS = [
  {
    question: "Do I need an account?",
    answer:
      "No. Pick a nickname, create a room or join with a six-character code. Your name is saved in this browser for next time.",
  },
  {
    question: "What is critical mass?",
    answer:
      "The number of orbs a cell can hold before it pops: corners 2, edges 3 and the middle 4. Add one more orb and it bursts into its orthogonal neighbours.",
  },
  {
    question: "Can I place an orb on an opponent's cell?",
    answer:
      "No. You can only place on an empty cell or one you already own. Cells change hands when a chain wave hits them, not when you tap them.",
  },
  {
    question: "What happens when my turn clock runs out?",
    answer:
      "The game auto-plays a legal cell for you, preferring one of your own cells that is one orb from popping. The clock keeps the table moving.",
  },
  {
    question: "How do I win?",
    answer:
      "Leave every opponent with zero orbs. The last colour on the board wins. If a chain takes the last orb from several players at once, the surviving player takes it.",
  },
  {
    question: "Can I change the table after the game starts?",
    answer:
      "Settings lock while a game is running. The host can reopen them before a rematch without rebuilding the room.",
  },
];

export const viewport: Viewport = {
  themeColor: "#06090e",
  colorScheme: "dark",
};

export default function Home() {
  return (
    <>
      <a href="#main" className="cr-skip">
        Skip to content
      </a>
      <div className="cr">
        <header className="cr-nav">
          <div className="cr-margins cr-nav-inner">
            <Link href="/" className="cr-brand" aria-label="Yaply Chain Reaction home">
              <ChainMark />
              <span>
                Chain <span>Reaction</span>
              </span>
            </Link>

            <nav className="cr-nav-links" aria-label="Primary">
              <a href="#how-it-works">How it works</a>
              <a href="#rules">Critical mass</a>
              <a href="#boards">The board</a>
              <Link href="/how-to-play">How to play</Link>
            </nav>

            <div className="cr-nav-actions">
              <Link href="/join" className="cr-nav-join">
                Join a room
              </Link>
              <Link href="/create" className="cr-button cr-button--nav">
                Start a game
              </Link>
            </div>
          </div>
        </header>

        <main id="main">
          <section className="cr-hero" aria-labelledby="hero-title">
            <div className="cr-margins cr-hero-grid">
              <div className="cr-hero-copy">
                <p className="cr-eyebrow">
                  <span aria-hidden />
                  Turn-based board game · 2–8 players
                </p>
                <h1 id="hero-title" className="cr-title">
                  One orb.
                  <br />
                  Whole board.
                </h1>
                <p className="cr-lede">
                  Chain Reaction is a game about pressure. Claim cells, stack orbs past their limit
                  and let the cascade do the rest. Every orb can flip the table — or hand it to
                  somebody else.
                </p>
                <div className="cr-actions">
                  <Link href="/create" className="cr-button cr-button--lg">
                    <PlayIcon size={15} />
                    Start a game
                  </Link>
                  <Link href="/join" className="cr-button cr-button--ghost cr-button--lg">
                    Join with a code
                    <ArrowRightIcon size={15} />
                  </Link>
                </div>
                <ul className="cr-specs">
                  {SPECS.map((spec) => (
                    <li key={spec.label}>
                      <i style={{ background: spec.color }} aria-hidden />
                      {spec.label}
                    </li>
                  ))}
                </ul>
              </div>

              <ChainHeroBoard />
            </div>
          </section>

          <div className="cr-ticker" aria-hidden="true">
            <div className="cr-ticker-track">
              {[0, 1].map((copy) => (
                <span key={copy}>
                  {TICKER.map((item) => (
                    <span key={`${copy}-${item}`}>{item}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          <section id="how-it-works" className="cr-section cr-section--paper">
            <div className="cr-margins cr-split">
              <Reveal className="cr-section-copy">
                <p className="cr-kicker">How it works</p>
                <h2 className="cr-h2">
                  Four moves.
                  <br />
                  One fuse.
                </h2>
                <p className="cr-lede">
                  No tutorial, no download, no lobby wait. A turn is one orb, one pop and a room
                  full of people leaning in to see where the wave lands.
                </p>
                <Link href="/how-to-play" className="cr-textlink">
                  Read the full rules
                  <ArrowRightIcon size={14} />
                </Link>
              </Reveal>

              <ol className="cr-steps">
                {STEPS.map((step, stepIndex) => (
                  <Reveal as="li" className="cr-step" key={step.title} delay={stepIndex * 70}>
                    <span className="cr-step-no">0{stepIndex + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          </section>

          <section id="rules" className="cr-section cr-section--ice">
            <div className="cr-margins cr-mass">
              <Reveal className="cr-section-copy">
                <p className="cr-kicker">Critical mass</p>
                <h2 className="cr-h2">
                  Corners 2.
                  <br />
                  Edges 3.
                  <br />
                  Middle 4.
                </h2>
                <p className="cr-lede">
                  Every cell has a breaking point. One more orb and it bursts, sending a wave into
                  its orthogonal neighbours. That is the whole game — and the whole problem.
                </p>
                <ul className="cr-bullets">
                  <li>Pops send one orb up, down, left and right.</li>
                  <li>Captured cells flip to the colour of the wave.</li>
                  <li>Cascades resolve until the board settles.</li>
                </ul>
              </Reveal>

              <Reveal className="cr-mass-card" delay={80}>
                <div className="cr-mass-head">
                  <span>Breaking point</span>
                  <span className="cr-mass-pill">one more pops it</span>
                </div>
                <div className="cr-mass-board">
                  {MASS.map((cell, cellIndex) => (
                    <div
                      className={`cr-mass-cell ${cell.value === 4 ? "is-center" : ""}`}
                      key={`${cellIndex}-${cell.value}`}
                    >
                      <span className="cr-mass-label">{cell.label}</span>
                      <strong>{cell.value}</strong>
                      <span className="cr-mass-orbs" aria-hidden>
                        {Array.from({ length: cell.value }).map((_, orb) => (
                          <i
                            key={orb}
                            style={{ background: PLAYER_COLORS[cell.value - 2] }}
                          />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="cr-mass-foot">
                  Each pop fires one orb into every orthogonal neighbour. Chain enough of them and
                  the board can change hands in a single turn.
                </p>
              </Reveal>
            </div>
          </section>

          <section id="boards" className="cr-section cr-section--ink">
            <div className="cr-margins">
              <Reveal className="cr-section-head">
                <div>
                  <p className="cr-kicker">The table</p>
                  <h2 className="cr-h2">
                    Four tables.
                    <br />
                    Same pressure.
                  </h2>
                </div>
                <p className="cr-lede">
                  Start on 5×7 for a quick knife fight, or open up 10×14 and let the chains run.
                  Every board uses the same critical-mass rule; bigger boards simply give a cascade
                  more room.
                </p>
              </Reveal>

              <div className="cr-boards">
                {BOARD_SIZES.map((board, boardIndex) => (
                  <Reveal
                    className={`cr-board-card ${board.featured ? "is-featured" : ""}`}
                    key={board.label}
                    delay={boardIndex * 60}
                  >
                    <div className="cr-board-top">
                      <span className="cr-board-label">{board.name}</span>
                      <span className="cr-board-dims">
                        {board.rows} × {board.cols}
                      </span>
                    </div>
                    <div className="cr-board-canvas">
                      <MiniBoard rows={board.rows} cols={board.cols} />
                    </div>
                    <div className="cr-board-bottom">
                      <span className="cr-board-tag">{board.tag}</span>
                      <p>{board.blurb}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal className="cr-board-note" delay={80}>
                <span className="cr-mini-pill">2D / 3D</span>
                <p>
                  The same board, two ways to see it. Flat and fast, or a perspective table with
                  spherical orbs. The rules do not change.
                </p>
              </Reveal>
            </div>
          </section>

          <section id="modes" className="cr-section cr-section--blue">
            <div className="cr-margins">
              <Reveal className="cr-section-head">
                <div>
                  <p className="cr-kicker">Pick a table</p>
                  <h2 className="cr-h2">
                    Three ways
                    <br />
                    to start a fire.
                  </h2>
                </div>
                <p className="cr-lede">
                  Same rules, same pressure. Play with friends online, pass one device around, or
                  put the CPU in the other chairs.
                </p>
              </Reveal>

              <div className="cr-modes">
                {MODES.map((mode, modeIndex) => (
                  <Reveal className="cr-mode" key={mode.title} delay={modeIndex * 70}>
                    <span className="cr-mode-no">{mode.number}</span>
                    <h3>{mode.title}</h3>
                    <p>{mode.body}</p>
                    <ul>
                      {mode.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <Link href="/create" className="cr-button cr-button--dark">
                      {mode.cta}
                      <ArrowRightIcon size={14} />
                    </Link>
                  </Reveal>
                ))}
              </div>

              <Reveal className="cr-modes-note" delay={120}>
                <span>All three start from the same setup card.</span>
                <span>Online rooms share a six-character code.</span>
              </Reveal>
            </div>
          </section>

          <section className="cr-section cr-section--paper">
            <div className="cr-margins">
              <Reveal className="cr-section-head">
                <div>
                  <p className="cr-kicker">Host controls</p>
                  <h2 className="cr-h2">
                    Your table.
                    <br />
                    Your rules.
                  </h2>
                </div>
                <p className="cr-lede">
                  Every room is private. Share the code or send the link; the host sets the board,
                  palette and pace before the first orb, and can change it again before a rematch.
                </p>
              </Reveal>

              <div className="cr-host-grid">
                <Reveal className="cr-room-card">
                  <div className="cr-room-top">
                    <span>Room code</span>
                    <span className="cr-room-live">
                      <i aria-hidden />
                      Live
                    </span>
                  </div>
                  <p className="cr-room-code">FUSE42</p>
                  <p className="cr-room-note">
                    Six characters. No link, no account, no lobby wait. Send it and start.
                  </p>
                  <div className="cr-room-players">
                    <span className="cr-room-chip">
                      <i style={{ background: PLAYER_COLORS[0] }} aria-hidden />
                      Mara
                    </span>
                    <span className="cr-room-chip">
                      <i style={{ background: PLAYER_COLORS[1] }} aria-hidden />
                      Jules
                    </span>
                    <span className="cr-room-chip">
                      <i style={{ background: PLAYER_COLORS[2] }} aria-hidden />
                      Niko
                    </span>
                    <span className="cr-room-chip cr-room-chip--empty">+5 seats</span>
                  </div>
                  <div className="cr-room-actions">
                    <Link href="/create" className="cr-button">
                      Create a room
                    </Link>
                    <Link href="/join" className="cr-button cr-button--ghost">
                      Join with a code
                    </Link>
                  </div>
                </Reveal>

                <Reveal className="cr-settings-wrap" delay={80}>
                  <dl className="cr-settings">
                    {SETTINGS.map((setting) => (
                      <div className="cr-setting" key={setting.label}>
                        <dt>{setting.label}</dt>
                        <dd>
                          {setting.value}
                          {setting.swatches && (
                            <span className="cr-swatches" aria-hidden>
                              {setting.swatches.map((color) => (
                                <i className="cr-swatch" key={color} style={{ background: color }} />
                              ))}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="cr-settings-note">
                    Settings lock while a game is running and reopen before a rematch.
                  </p>
                </Reveal>
              </div>
            </div>
          </section>

          <section className="cr-section cr-section--coal">
            <div className="cr-margins cr-faq-grid">
              <Reveal className="cr-section-copy">
                <p className="cr-kicker">Before you ask</p>
                <h2 className="cr-h2">
                  Before
                  <br />
                  you fire.
                </h2>
                <p className="cr-lede">
                  Short answers to the things every new table asks before the first orb lands.
                </p>
              </Reveal>

              <Reveal className="cr-faq" delay={70}>
                {FAQS.map((faq) => (
                  <details key={faq.question}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </Reveal>
            </div>
          </section>

          <section className="cr-cta" aria-labelledby="cta-title">
            <div className="cr-margins">
              <Reveal>
                <p className="cr-kicker">Your move</p>
                <h2 id="cta-title" className="cr-cta-title">
                  Start a room.
                  <br />
                  Bring the pressure.
                </h2>
              </Reveal>
              <Reveal className="cr-cta-row" delay={70}>
                <p>
                  Two to eight players. Four boards. One rule: the board always answers back.
                </p>
                <div className="cr-actions">
                  <Link href="/create" className="cr-button cr-button--dark cr-button--lg">
                    <PlayIcon size={15} />
                    Start a game
                  </Link>
                  <Link href="/join" className="cr-button cr-button--outline-dark cr-button--lg">
                    Join with a code
                    <ArrowRightIcon size={15} />
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        <footer className="cr-footer">
          <div className="cr-margins">
            <p className="cr-footer-word" aria-hidden="true">
              Chain
            </p>
            <div className="cr-footer-row">
              <span>An original browser board game from Yaply. © 2026 Yaply.</span>
              <div className="cr-footer-links">
                <a href="#how-it-works">How it works</a>
                <a href="#rules">Critical mass</a>
                <a href="#boards">The board</a>
                <Link href="/how-to-play">How to play</Link>
                <Link href="/create">Set up a game</Link>
                <a href={MAIN_URL}>All games</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

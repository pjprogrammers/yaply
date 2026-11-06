import Link from "next/link";
import { MAIN_URL } from "@/lib/config";
import { CatDoodle } from "@/components/doodle";
import { HomePreview } from "@/components/home-preview";
import { Reveal } from "@/components/reveal";
import { ArrowRightIcon, CheckIcon, ClockIcon, PlayIcon, SkribblMark } from "@/components/icons";
import { WordMask } from "@/components/word-mask";

const SPECS = ["2–12 players", "60–120s rounds", "4 word languages", "No signup"];

const TICKER = ["Draw", "Guess", "Score", "Repeat", "Every player draws", "Same cat, four languages"];

const STEPS = [
  {
    title: "Pick a word",
    body: "The drawer gets three private words and twenty seconds to choose. If the clock runs out, the first word is picked automatically.",
  },
  {
    title: "Draw it badly",
    body: "Ink, size, undo and clear. Letters and numbers are off-limits. Confidence is not.",
  },
  {
    title: "Guess in chat",
    body: "Everyone types guesses into the room. A correct guess is announced and locks in points; wrong guesses stay in the chat.",
  },
  {
    title: "Pass the pen",
    body: "The word is revealed, scores move, and the next player takes over. Every player gets the pen once per round.",
  },
];

const LANGUAGES = [
  { label: "English", word: "cat" },
  { label: "Filipino", word: "pusa" },
  { label: "日本語", word: "ねこ" },
  { label: "한국어", word: "고양이" },
];

const SCORES = [
  { name: "Ari", score: 192, color: "#c6f24e" },
  { name: "Mara", score: 148, color: "#4cb3f0" },
  { name: "Jules", score: 96, color: "#f2b33d" },
  { name: "Niko", score: 64, color: "#e5484d" },
];

const SETTINGS = [
  { label: "Word pack", value: "English, Filipino, 日本語, 한국어" },
  { label: "Rounds", value: "2, 3 or 5" },
  { label: "Draw time", value: "60, 80 or 120 seconds" },
  { label: "Word choices", value: "2 to 5 per turn" },
  { label: "Max players", value: "4, 8 or 12" },
];

const FAQS = [
  {
    question: "Do I need an account?",
    answer:
      "No. Pick a nickname, create a room or enter a six-letter code. Your nickname is saved in this browser for next time.",
  },
  {
    question: "How many people can play?",
    answer:
      "Two to twelve players in a room. Every player draws once per round, so a full room keeps the pen moving.",
  },
  {
    question: "What happens if someone disconnects?",
    answer:
      "Their seat is held for 30 seconds. Refresh in that window and the same seat, score and resume token come back.",
  },
  {
    question: "Does it work on a phone?",
    answer:
      "Yes. The canvas accepts touch input and the room stacks into one column. A bigger screen makes drawing easier, but it is not required.",
  },
  {
    question: "Who controls the room settings?",
    answer:
      "The host sets the word pack, rounds, draw time, word choices and player cap in the lobby. Settings lock when the game starts and can change again before a rematch.",
  },
  {
    question: "When does a round end?",
    answer:
      "When everyone has guessed or the clock hits zero. The word is revealed, the drawer scores for the guesses they earned, and the next player takes the pen.",
  },
];

export default function Home() {
  return (
    <>
      <a href="#main" className="landing-skip">
        Skip to content
      </a>
      <div className="landing">
        <header className="landing-nav">
          <div className="landing-margins landing-nav-inner">
            <Link href="/" className="landing-brand" aria-label="Yaply Skribbl home">
              <SkribblMark />
              <span>Skribbl</span>
            </Link>

            <nav className="landing-links" aria-label="Primary">
              <a href="#how-it-works">How it works</a>
              <a href="#words">Words</a>
              <a href="#scoring">Scoring</a>
              <Link href="/how-to-play">How to play</Link>
              <Link href="/install">Install app</Link>
            </nav>

            <div className="landing-nav-actions">
              <Link href="/join" className="landing-nav-join">
                Join a room
              </Link>
              <Link href="/create" className="landing-button">
                Create a room
              </Link>
            </div>
          </div>
        </header>

        <main id="main">
          <section className="landing-hero" aria-labelledby="hero-title">
            <div className="landing-margins landing-hero-grid">
              <div className="landing-hero-copy">
                <h1 id="hero-title" className="landing-title">
                  Draw badly.
                  <br />
                  Guess fast.
                </h1>
                <p className="landing-lede">
                  A private room, a blank sheet and a word nobody can draw. One player sketches,
                  everyone else guesses in chat — the earlier the guess, the more it scores.
                </p>
                <div className="landing-actions">
                  <Link href="/create" className="landing-button landing-button--lg">
                    <PlayIcon size={15} />
                    Create a room
                  </Link>
                  <Link href="/join" className="landing-button landing-button--ghost landing-button--lg">
                    Join with a code
                    <ArrowRightIcon size={15} />
                  </Link>
                </div>
                <ul className="landing-specs">
                  {SPECS.map((spec) => (
                    <li key={spec}>{spec}</li>
                  ))}
                </ul>
              </div>
              <HomePreview />
            </div>
          </section>

          <div className="landing-ticker" aria-hidden="true">
            <div className="landing-ticker-track">
              {[0, 1].map((copy) => (
                <span key={copy}>
                  {TICKER.map((item) => (
                    <span key={`${copy}-${item}`}>{item}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          <section id="how-it-works" className="landing-section landing-section--paper">
            <div className="landing-margins landing-split">
              <Reveal className="landing-section-copy">
                <h2 className="landing-h2">
                  Four moves.
                  <br />
                  One pen.
                </h2>
                <p className="landing-lede">
                  No tutorial, no download, no lobby wait. A round is a word, a drawing and a room
                  full of guesses.
                </p>
                <Link href="/how-to-play" className="landing-textlink">
                  Read the full rules
                  <ArrowRightIcon size={14} />
                </Link>
              </Reveal>

              <ol className="landing-steps">
                {STEPS.map((step, index) => (
                  <Reveal as="li" className="landing-step" key={step.title} delay={index * 70}>
                    <h3 className="landing-step-title">
                      <span>{step.title}</span>
                    </h3>
                    <p>{step.body}</p>
                  </Reveal>
                ))}
              </ol>
            </div>
          </section>

          <section id="words" className="landing-section landing-section--yellow landing-words">
            <div className="landing-margins landing-split">
              <Reveal className="landing-section-copy">
                <h2 className="landing-h2">
                  One word.
                  <br />
                  Four languages.
                </h2>
                <p className="landing-lede">
                  Pick the word pack when you create the room. The game is the same in English,
                  Filipino, Japanese and Korean — and the cat is still a cat.
                </p>
                <p className="landing-side-note">
                  Every pack has its own word list. The drawings remain universally bad.
                </p>
              </Reveal>

              <Reveal className="landing-board" delay={80}>
                <div className="landing-board-figure">
                  <CatDoodle />
                </div>
                <div className="landing-language-tags">
                  {LANGUAGES.map((language) => (
                    <div className="landing-language-tag" key={language.label}>
                      <span>{language.label}</span>
                      <strong>{language.word}</strong>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>

          <section id="scoring" className="landing-section landing-section--ink">
            <div className="landing-margins landing-split">
              <Reveal className="landing-section-copy">
                <h2 className="landing-h2">
                  The clock
                  <br />
                  is the villain.
                </h2>
                <p className="landing-lede">
                  Correct guesses start at 100 and fall as the seconds go. The drawer earns up to
                  100 for the share of the room that gets it. Early answers pay; silence does not.
                </p>
                <dl className="landing-score-facts">
                  <div>
                    <dt>Correct guess</dt>
                    <dd>Up to 100</dd>
                  </div>
                  <div>
                    <dt>Drawer</dt>
                    <dd>Up to 100</dd>
                  </div>
                  <div>
                    <dt>Round</dt>
                    <dd>60–120s</dd>
                  </div>
                </dl>
              </Reveal>

              <Reveal className="landing-game-card" delay={80}>
                <div className="landing-game-head">
                  <span className="landing-game-round">Round 2 of 3</span>
                  <span className="landing-game-timer">
                    <ClockIcon size={13} />
                    0:38
                  </span>
                </div>

                <div className="landing-game-word">
                  <span>Mara is drawing</span>
                  <WordMask maskedWord="_a_" className="landing-wordmask landing-wordmask--game" />
                </div>

                <div className="landing-chat">
                  <p>
                    <b>Jules</b> is it a cat?
                  </p>
                  <p>
                    <b>Niko</b> a loaf with ears?
                  </p>
                  <p className="landing-chat-correct">
                    <CheckIcon size={12} />
                    Ari guessed it <b>+92</b>
                  </p>
                </div>

                <div className="landing-scoreboard">
                  {SCORES.map((player) => (
                    <div className="landing-score-row" key={player.name}>
                      <span className="landing-score-name">
                        <i style={{ background: player.color }} aria-hidden="true" />
                        {player.name}
                      </span>
                      <span className="landing-score-points">{player.score}</span>
                    </div>
                  ))}
                </div>
                <p className="landing-game-note">The word stays hidden until the round ends.</p>
              </Reveal>
            </div>
          </section>

          <section className="landing-section landing-section--paper">
            <div className="landing-margins">
              <Reveal className="landing-section-head">
                <h2 className="landing-h2">
                  Your room.
                  <br />
                  Your rules.
                </h2>
                <p className="landing-lede">
                  Every room is private. Share a six-letter code or send the link; friends join in a
                  click. The host sets the pace before the first word and again before a rematch.
                </p>
              </Reveal>

              <div className="landing-host-grid">
                <Reveal className="landing-ticket">
                  <p className="landing-ticket-label">Room code</p>
                  <p className="landing-ticket-code">PEN123</p>
                  <p className="landing-ticket-note">
                    Share six characters. No link, no account, no lobby wait.
                  </p>
                  <div className="landing-ticket-players">
                    <span className="landing-ticket-chip">
                      <i style={{ background: "#4cb3f0" }} aria-hidden="true" />
                      Mara
                    </span>
                    <span className="landing-ticket-chip">
                      <i style={{ background: "#f2b33d" }} aria-hidden="true" />
                      Jules
                    </span>
                    <span className="landing-ticket-chip">
                      <i style={{ background: "#e5484d" }} aria-hidden="true" />
                      Niko
                    </span>
                    <span className="landing-ticket-chip landing-ticket-chip--empty">+5 seats</span>
                  </div>
                  <Link href="/create" className="landing-button">
                    Create a room
                  </Link>
                </Reveal>

                <Reveal className="landing-settings-wrap" delay={80}>
                  <dl className="landing-settings">
                    {SETTINGS.map((setting) => (
                      <div className="landing-setting" key={setting.label}>
                        <dt>{setting.label}</dt>
                        <dd>{setting.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              </div>
            </div>
          </section>

          <section className="landing-section landing-section--coal">
            <div className="landing-margins landing-faq-grid">
              <Reveal className="landing-section-copy">
                <h2 className="landing-h2">
                  Before
                  <br />
                  you ask.
                </h2>
                <p className="landing-lede">
                  Short answers to the things every new room asks before the first doodle lands.
                </p>
              </Reveal>

              <Reveal className="landing-faq" delay={70}>
                {FAQS.map((faq) => (
                  <details key={faq.question}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </Reveal>
            </div>
          </section>

          <section className="landing-cta" aria-labelledby="cta-title">
            <div className="landing-margins">
              <Reveal>
                <h2 id="cta-title" className="landing-cta-title">
                  Start a room.
                  <br />
                  Bring a pen.
                </h2>
              </Reveal>
              <Reveal className="landing-cta-row" delay={70}>
                <p>
                  Two to twelve players. Four word packs. One blank sheet. The first bad drawing is
                  one click away.
                </p>
                <div className="landing-actions">
                  <Link href="/create" className="landing-button landing-button--lg">
                    <PlayIcon size={15} />
                    Create a room
                  </Link>
                  <Link href="/join" className="landing-button landing-button--ghost landing-button--lg">
                    Join with a code
                    <ArrowRightIcon size={15} />
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <div className="landing-margins">
            <p className="landing-footer-word" aria-hidden="true">
              Skribbl
            </p>
            <div className="landing-footer-row">
              <span>An original browser party game from Yaply. © 2026 Yaply.</span>
              <div className="landing-footer-links">
                <a href="#how-it-works">How it works</a>
                <a href="#words">Words</a>
                <a href="#scoring">Scoring</a>
                <Link href="/how-to-play">How to play</Link>
                <Link href="/create">Create a room</Link>
                <Link href="/install">Install app</Link>
                <a href={MAIN_URL}>All games</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

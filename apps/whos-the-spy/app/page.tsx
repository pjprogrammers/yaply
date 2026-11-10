import Link from "next/link";
import { DossierDemo } from "@/components/dossier-demo";
import {
  ArrowRightIcon,
  ClockIcon,
  LockIcon,
  PlayIcon,
  ShieldIcon,
  UsersIcon,
  WifiIcon,
} from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { Topbar } from "@/components/topbar";

const ROUND_BEATS = [
  {
    title: "Word",
    body: "Every player opens a private card. Civilians all share one word; the spies share a different one. The category is the only thing everyone agrees on.",
    detail: "One card per player · sealed from the room",
  },
  {
    title: "Clue",
    body: "Players take turns giving one clue about their word. It has to be true enough to prove you belong — and vague enough that the spy cannot steal it.",
    detail: "One clue each · timed turn order",
  },
  {
    title: "Vote",
    body: "The clue round closes and private voting opens. Nobody can see a ballot until the count. The table picks the player whose word does not quite fit.",
    detail: "Private ballots · no self-votes · one revote",
  },
  {
    title: "Guess",
    body: "If the final spy is caught, they get one last shot at the civilian word. Guess it correctly and the spies steal the win. Miss and the civilians take it.",
    detail: "Optional · the last spy only",
  },
];

const SETTINGS_ROWS = [
  ["Players", "3–12", "The host can start as soon as three players are connected."],
  ["Spies", "Automatic, 1–3", "Civilians always keep a strict majority. The server clamps impossible counts."],
  ["Categories", "20, multi-select", "Pick food, places, animals or let the room draw from every category."],
  ["Difficulty", "Easy, Normal, Hard", "The bank tags every pair. Hard pairs are uncomfortably similar."],
  ["Clues", "Text, voice, both", "The host sets the format. Timed text clues are always available."],
  ["Voting", "15, 20, 30, 45 sec", "Private, locked once cast. A tie gets a single revote, then nobody leaves."],
  ["Final guess", "On or off", "When on, the last eliminated spy can steal the game with one word."],
  ["Spectators", "Own channel", "Eliminated players keep talking without leaking information to the living."],
];

export default function HomePage() {
  return (
    <div className="site">
      <Topbar />

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1 id="hero-title">
                One of you has
                <br />
                the wrong word.
              </h1>
              <p className="hero-lede">
                Who&apos;s the Spy is a social deduction game for 3–12 players.
                Everyone gets a secret word. The spies get a different one. Give
                clues, read the room and vote out the player who doesn&apos;t
                quite belong.
              </p>
              <div className="hero-actions">
                <Link href="/create" className="button button--large">
                  <PlayIcon size={16} />
                  Start a room
                </Link>
                <Link href="/join" className="button button--ghost button--large">
                  Join with a code
                  <ArrowRightIcon size={16} />
                </Link>
              </div>
              <p className="hero-meta">
                <ClockIcon size={15} />
                10–20 minutes
                <span aria-hidden>·</span>
                <UsersIcon size={15} />
                3–12 players
                <span aria-hidden>·</span>
                No account
              </p>
            </div>
            <DossierDemo />
          </div>
        </section>

        <section className="fact-band" aria-label="Game facts">
          <div className="fact-band-inner">
            <div>
              <p className="fact-number">3–12</p>
              <p className="fact-copy">
                players around one room link. One phone each, or one shared
                table.
              </p>
            </div>
            <div>
              <p className="fact-number">Private</p>
              <p className="fact-copy">
                ballots, private role cards and a separate channel for players
                who are already out.
              </p>
            </div>
            <div>
              <p className="fact-number">Same seat</p>
              <p className="fact-copy">
                after a refresh. Reconnecting restores your role and word; it
                never redistributes them.
              </p>
            </div>
          </div>
        </section>

        <section className="beat-section" id="how" aria-labelledby="how-title">
          <div className="section-head">
            <h2 id="how-title">How a round actually runs.</h2>
            <p>
              Four beats. No narrator, no downtime, no waiting for someone to
              remember the rules.
            </p>
          </div>

          <ol className="beat-list">
            {ROUND_BEATS.map((beat) => (
              <li key={beat.title} className="beat-row">
                <h3>{beat.title}</h3>
                <p>{beat.body}</p>
                <span>{beat.detail}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="word-section" aria-labelledby="words-title">
          <div className="word-head">
            <h2 id="words-title">The whole game is one missing word.</h2>
            <p>
              The civilian word and the spy word are always related. Close enough
              to bluff, different enough to catch. Every pair is curated by
              category and difficulty — never generated on the fly.
            </p>
          </div>

          <div className="word-split">
            <article className="word-panel word-panel--civilian">
              <p>Civilian word</p>
              <h3>Cappuccino</h3>
              <p className="word-explain">
                Five players share it. Their clues should line up without ever
                naming it.
              </p>
              <span className="word-tag">Majority</span>
            </article>
            <article className="word-panel word-panel--spy">
              <p>Spy word</p>
              <h3>Latte</h3>
              <p className="word-explain">
                One player is holding it. Related enough to sound plausible.
                Different enough to slip.
              </p>
              <span className="word-tag">Minority</span>
            </article>
          </div>
          <p className="word-footnote">
            The spy knows their word is different. They do not know the civilian
            word — only the category.
          </p>
        </section>

        <section className="read-section" aria-labelledby="read-title">
          <div className="read-head">
            <h2 id="read-title">Read the room, not the script.</h2>
            <p>
              Clues, private ballots and the table talk that gives people away.
              This is the actual shape of the room: one live stage, one chat, one
              vote that nobody can peek at.
            </p>
          </div>

          <div className="stage-demo" data-ui aria-label="Preview of a live clue round">
            <div className="stage-demo-bar">
              <span className="stage-demo-live">
                <i />
                LIVE
              </span>
              <span>Room 4K2P · Clue round 1</span>
              <span className="stage-demo-timer">00:41</span>
            </div>

            <div className="stage-demo-players">
              {["Alex", "Sam", "Jordan", "Chris", "Taylor", "Jamie"].map((name) => (
                <span
                  key={name}
                  className={`demo-player${name === "Jordan" ? " is-speaking" : ""}`}
                >
                  <span className="demo-avatar">{name[0]}</span>
                  {name}
                </span>
              ))}
            </div>

            <div className="stage-demo-body">
              <div className="demo-clue-column">
                <p className="demo-kicker">Clues so far</p>
                <div className="demo-clues">
                  <p>
                    <span>Alex</span>
                    <strong>Morning.</strong>
                  </p>
                  <p>
                    <span>Sam</span>
                    <strong>Coffee.</strong>
                  </p>
                  <p>
                    <span>Jordan</span>
                    <strong>Milk.</strong>
                  </p>
                  <p className="is-faded">
                    <span>Chris</span>
                    <strong>Strong.</strong>
                  </p>
                </div>
                <div className="demo-next">
                  <i />
                  Cara gives the next clue…
                </div>
              </div>

              <div className="demo-side-column">
                <div className="demo-chat-card">
                  <p className="demo-kicker">Table chat</p>
                  <div className="demo-chat-lines">
                    <p>
                      <span>Taylor</span> Jordan, that was a very confident
                      &ldquo;milk&rdquo;.
                    </p>
                    <p>
                      <span>Jordan</span> I stand by it.
                    </p>
                    <p className="demo-spectator">
                      <span>Jamie</span>
                      <em>Spectator</em> This is painful to watch.
                    </p>
                  </div>
                  <div className="demo-chat-input">
                    <span>Message the table…</span>
                    <span className="demo-send">Send</span>
                  </div>
                </div>

                <div className="demo-vote-card">
                  <p className="demo-kicker">Vote opens next</p>
                  <div className="demo-vote-row">
                    <span>Ballots in</span>
                    <strong>0 / 6</strong>
                  </div>
                  <div className="demo-vote-pips" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <p className="demo-vote-note">
                    No one sees a name until every ballot is sealed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="result-demo" data-ui aria-label="Preview of a result screen">
            <div className="result-demo-copy">
              <p className="result-demo-kicker">Civilians win</p>
              <h3>All spies were identified.</h3>
              <p>
                The final spy guessed wrong. Both words, every role and every
                ballot are on the table before the rematch.
              </p>
            </div>
            <div className="result-demo-words">
              <p>
                <span>Civilian word</span>
                Beach
              </p>
              <p>
                <span>Spy word</span>
                Swimming pool
              </p>
            </div>
            <div className="result-demo-roles">
              <span>
                Alex <em>Civilian</em>
              </span>
              <span>
                Sam <em>Civilian</em>
              </span>
              <span>
                Jordan <em>Spy</em>
              </span>
              <span>
                Chris <em>Civilian</em>
              </span>
            </div>
          </div>
        </section>

        <section className="table-section" aria-labelledby="table-title">
          <div className="section-head section-head--split">
            <h2 id="table-title">Set the table before the words start.</h2>
            <p>
              The host has the dials. The server checks them. Once the first card
              is dealt, the round is frozen.
            </p>
          </div>

          <div className="settings-table-wrap">
            <table className="settings-table">
              <thead>
                <tr>
                  <th scope="col">Setting</th>
                  <th scope="col">Options</th>
                  <th scope="col">What it changes</th>
                </tr>
              </thead>
              <tbody>
                {SETTINGS_ROWS.map(([setting, options, detail]) => (
                  <tr key={setting}>
                    <th scope="row">{setting}</th>
                    <td>{options}</td>
                    <td>{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-cta">
            <Link href="/how-to-play" className="text-link">
              Read the full rules
              <ArrowRightIcon size={15} />
            </Link>
            <Link href="/create" className="button">
              Set up a room
            </Link>
          </div>
        </section>

        <section className="trust-section" aria-labelledby="trust-title">
          <div className="trust-head">
            <h2 id="trust-title">Secrets stay on the server.</h2>
            <p>
              The browser never receives words or roles it should not have. Not
              in the URL, not in the public room state, not in somebody else&apos;s
              WebSocket message.
            </p>
          </div>
          <div className="trust-points">
            <div>
              <LockIcon size={22} />
              <h3>Private role cards</h3>
              <p>
                Each secret is addressed to one socket. A reconnect asks for the
                same card and gets the same role and word back.
              </p>
            </div>
            <div>
              <ShieldIcon size={22} />
              <h3>Sealed ballots</h3>
              <p>
                Votes are server-side until the count. The public state only ever
                shows how many ballots are in, never how they were cast.
              </p>
            </div>
            <div>
              <WifiIcon size={22} />
              <h3>Reconnect, don&apos;t reshuffle</h3>
              <p>
                A dropped phone does not hand you a new role. The room restores
                the same seat, word and timer when you return.
              </p>
            </div>
          </div>
        </section>

        <section className="final-cta" aria-labelledby="cta-title">
          <div>
            <h2 id="cta-title">Bring a word. Lose the spy.</h2>
            <p>
              Start a room, send one link, and find out who has been bluffing
              since the first clue.
            </p>
          </div>
          <div className="final-actions">
            <Link href="/create" className="button button--inverse button--large">
              <PlayIcon size={16} />
              Start a room
            </Link>
            <Link href="/join" className="button button--outline-inverse button--large">
              Join with a code
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

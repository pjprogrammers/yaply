import type { Metadata } from "next";
import Link from "next/link";
import { PlayIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { Topbar } from "@/components/topbar";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { howToPlaySchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "How to play Who's the Spy | Yaply" },
  description:
    "Learn how to play Who's the Spy, the free online spy game: secret words, clue turns, private voting, revotes, eliminations and the final spy guess.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/how-to-play` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/how-to-play`,
    siteName: "Yaply Who's the Spy",
    title: "How to play Who's the Spy | Rules and voting",
    description: GAME_SHORT_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 900,
        height: 1200,
        alt: "Who's the Spy — a social deduction party game by Yaply",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to play Who's the Spy | Rules and voting",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/og.png"],
  },
};

const CONTENTS = [
  ["setup", "Setup"],
  ["roles", "The two roles"],
  ["round", "A full round"],
  ["voting", "Voting and revotes"],
  ["winning", "Winning"],
  ["final-guess", "The final guess"],
  ["chat", "Chat and spectators"],
  ["reconnect", "Reconnects"],
];

export default function HowToPlayPage() {
  return (
    <div className="app-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToPlaySchema()) }}
      />
      <Topbar />
      <main className="page-shell">
        <div className="page-head">
          <div>
            <h1>How to play Who&apos;s the Spy.</h1>
            <p>
              Everything the room enforces, in the order it happens. If you have
              played a word-deduction game before, the short version is: everyone
              has a word, one team does not have yours.
            </p>
          </div>
          <Link href="/create" className="button">
            <PlayIcon size={15} />
            Start a room
          </Link>
        </div>

        <div className="rules-layout">
          <nav className="rules-nav" aria-label="Rules sections">
            <p>On this page</p>
            {CONTENTS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>

          <article className="rules-body">
            <section className="rule-block" id="setup">
              <h2>Setup: a room, a table, two words.</h2>
              <p>
                Who&apos;s the Spy is played by <strong>3 to 12 players</strong> on
                separate devices. The host creates a room, chooses the word
                categories and sends the room link. Everyone needs a nickname;
                nobody needs an account.
              </p>
              <p>
                The host can choose one spy or let the server pick automatically.
                The server never allows a spy team that equals or outnumbers the
                civilians, so the civilians always start with a strict majority.
              </p>
              <ul>
                <li>3–5 players: one spy by default.</li>
                <li>6–8 players: one spy by default.</li>
                <li>9–12 players: two spies by default.</li>
                <li>The host can request up to three spies when the table allows it.</li>
              </ul>
              <p>
                The game uses <strong>20 curated categories</strong>, each with 30
                word pairs tagged easy, normal or hard. The room avoids recent
                pairs, so a rematch does not serve the same joke twice.
              </p>
              <p>
                The host can remove a disruptive player from the table. That
                seat&apos;s resume token is blocked for the life of the room, so an
                automatic reconnect cannot reclaim it.
              </p>
            </section>

            <section className="rule-block" id="roles">
              <h2>The two roles.</h2>
              <p>
                Every player receives a private role card. It shows the category,
                one word and the role. Nobody else sees it — not in the player
                list, not in the chat and not in the room link.
              </p>
              <div className="role-grid">
                <div className="role-card">
                  <h3>Civilian</h3>
                  <p>
                    You share the civilian word with every other civilian. Your
                    job is to give a clue that proves you know it without saying
                    it, then find the players whose clues do not fit.
                  </p>
                </div>
                <div className="role-card role-card--spy">
                  <h3>Spy</h3>
                  <p>
                    You have a different word from the same category. You know
                    your word is the odd one out, but not what the civilian word
                    is. Blend in, infer the real word and survive the vote.
                  </p>
                </div>
              </div>
              <div className="rule-callout">
                <strong>The one rule that matters:</strong> your clue has to be
                true for the word in your envelope. A clever clue for a word you
                do not have is exactly what gets you voted out.
              </div>
            </section>

            <section className="rule-block" id="round">
              <h2>A full round, beat by beat.</h2>
              <ol>
                <li>
                  <strong>Role reveal.</strong> Everyone opens their private card
                  and marks it ready. The server starts the first clue round once
                  every connected player is ready, or when the role timer ends.
                </li>
                <li>
                  <strong>Clue turns.</strong> The server shuffles the speaking
                  order. The active player gives one short clue — a word or phrase
                  — before their clock runs out. Play passes to the next living
                  player. A skipped turn never repeats and never reveals a role.
                </li>
                <li>
                  <strong>Discussion.</strong> When every living player has spoken,
                  discussion opens. Talk, accuse, defend. The default is 45
                  seconds; the host can set 30–120.
                </li>
                <li>
                  <strong>Voting.</strong> Every living player gets one private
                  ballot. You cannot vote for yourself, and a ballot cannot be
                  changed once it is cast. The count happens when every living
                  player has voted or the timer expires.
                </li>
                <li>
                  <strong>Elimination.</strong> The player with the most votes
                  leaves the clue order and joins the spectator channel. Depending
                  on the room setting, their role is revealed immediately or kept
                  hidden until the result screen.
                </li>
                <li>
                  <strong>Next round.</strong> If neither team has won, the room
                  starts a fresh clue round with the remaining players and a new
                  speaking order.
                </li>
              </ol>
            </section>

            <section className="rule-block" id="voting">
              <h2>Voting and revotes.</h2>
              <p>
                Ballots are private to the server. The room sees how many are in
                and who has been eliminated, never who voted for whom. The vote
                history is published on the result screen only.
              </p>
              <p>
                If two or more players tie for the most votes, the room holds
                <strong> one revote</strong> between those players. The revote uses
                a short 15-second clock. If the revote also ties, nobody is
                eliminated and the next clue round begins — the room does not keep
                holding votes forever.
              </p>
              <ul>
                <li>No self-votes, in either ballot.</li>
                <li>No vote changes once the ballot is sealed.</li>
                <li>Only living players vote; eliminated players watch.</li>
                <li>A tied revote results in no elimination.</li>
              </ul>
            </section>

            <section className="rule-block" id="winning">
              <h2>Winning.</h2>
              <p>
                The match ends the moment one of these is true:
              </p>
              <ul>
                <li>
                  <strong>Civilians win</strong> when every spy has been
                  eliminated.
                </li>
                <li>
                  <strong>Spies win</strong> when the number of living spies is
                  greater than or equal to the number of living civilians.
                </li>
              </ul>
              <p>
                With multiple spies, the match does not end when the first spy
                leaves. The room continues until the last spy is gone or the spies
                reach parity.
              </p>
            </section>

            <section className="rule-block" id="final-guess">
              <h2>The final guess.</h2>
              <p>
                When the room has the final-guess setting on, eliminating the last
                spy does not end the match immediately. That spy gets
                <strong> 30 seconds</strong> and one typed guess at the civilian
                word.
              </p>
              <p>
                A correct guess — ignoring case, spacing and punctuation — steals
                the win for the spies. A wrong guess or a timeout gives the
                civilians the win. Only the last eliminated spy guesses; if that
                player disconnects or leaves, the guess is forfeited and the
                civilians win.
              </p>
              <div className="rule-callout">
                The final guess is optional. The host can turn it off before the
                match, in which case the last spy&apos;s elimination ends the game
                on the spot.
              </div>
            </section>

            <section className="rule-block" id="chat">
              <h2>Chat, voice and spectators.</h2>
              <p>
                The table chat is shared by living players. System messages tell
                you what changed — a clue, a vote count, an elimination. If the
                host turns text chat off, the chat input is disabled for the round.
              </p>
              <p>
                Voice is live audio between browsers, not a recording. Join from
                the voice panel and allow microphone access when the browser asks.
                You can mute your microphone or the speakers at any time, and the
                player list shows who is talking or muted. Voice is optional; the
                typed chat always works.
              </p>
              <p>
                Microphones close while a vote is open and reopen for the reveal.
                The host can mute every microphone or disable voice for the room.
                Eliminated players can still hear the table, but they cannot
                transmit until the results screen.
              </p>
              <p>
                Eliminated players become spectators. They keep their seat and
                their view of the room, but their messages go to a separate
                spectator channel that only other eliminated players can read.
                The host can disable spectator chat entirely.
              </p>
              <p>
                The server blocks either secret word from public chat and from
                clues, including compact and spelled-out attempts. A blocked
                message is not delivered to the table; the sender gets a private
                warning.
              </p>
            </section>

            <section className="rule-block" id="reconnect">
              <h2>Reconnects and departures.</h2>
              <p>
                A refresh or a dropped connection does not reshuffle the match.
                The room stores a resume token in the browser; when that player
                returns, the server restores the same seat, role and word and
                sends the private card again.
              </p>
              <p>
                A disconnected player keeps their seat during the reconnect grace
                period. If they do not return in time, their seat is removed. A
                spy who leaves does not get the final guess; a civilian departure
                can change the parity count immediately, so the next round may end
                the match.
              </p>
            </section>

            <div className="rules-cta">
              <Link href="/create" className="button button--large">
                <PlayIcon size={16} />
                Start a room
              </Link>
              <Link href="/join" className="button button--ghost button--large">
                Join with a code
              </Link>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

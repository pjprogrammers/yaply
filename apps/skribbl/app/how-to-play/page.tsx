import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ClockIcon, PencilIcon, UsersIcon } from "@/components/icons";
import { Topbar } from "@/components/topbar";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION, STEPS } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "How to play Skribbl",
  description:
    "Learn the rules, scoring and controls for Skribbl, the free online drawing and guessing game for 2–12 players. No account or download.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/how-to-play` },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/how-to-play`,
    siteName: "Yaply",
    title: "How to play Skribbl | Rules and scoring",
    description: GAME_SHORT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Skribbl — a doodled cat on a paper game card with a hidden word and a correct guess",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to play Skribbl | Rules and scoring",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@graph": [
    breadcrumbSchema([
      { name: "Skribbl", path: "/" },
      { name: "How to play", path: "/how-to-play" },
    ]),
    {
      "@type": "HowTo",
      "@id": `${SITE_URL}/how-to-play#howto`,
      name: "How to play Skribbl",
      description:
        "Create or join a private room, take the pen, draw the secret word without letters or numbers, and guess other players' drawings in chat.",
      totalTime: "PT2M",
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: "0",
      },
      step: STEPS.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.title,
        text: step.body,
        url: `${SITE_URL}/how-to-play`,
      })),
    },
  ],
};

const HOW_TO_STEPS = [
  {
    number: "01",
    title: "One player takes the pen",
    body: "Turns rotate through the room. The drawer gets a private list of words and 20 seconds to choose one. If the clock runs out, the first word is picked automatically.",
  },
  {
    number: "02",
    title: "Draw the word, no letters",
    body: "Use the ink and size controls. Undo removes the last stroke, clear wipes the sheet. The word itself stays hidden behind a mask while the round runs.",
  },
  {
    number: "03",
    title: "Everyone else types guesses",
    body: "Guesses go into the room chat. A wrong guess stays in the chat; a correct one is announced and locks in points for that player.",
  },
  {
    number: "04",
    title: "The round ends and scores move",
    body: "The round ends when everyone guesses or the clock hits zero. The word is revealed, the drawer scores for the guesses they earned and the next player takes over.",
  },
];

export default function HowToPlay() {
  return (
    <div className="app-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Topbar />
      <main className="page page--narrow">
        <div className="page-head">
          <div className="page-head-copy">
            <p className="eyebrow">Skribbl</p>
            <h1 className="home-title">How to play</h1>
            <p className="subline">
              A round is one drawing, one word and a room full of guesses. Here is the whole loop in
              four steps.
            </p>
          </div>
          <Link href="/" className="btn btn--ghost btn--sm">
            <ArrowLeftIcon size={13} />
            Home
          </Link>
        </div>

        <div className="fact-strip" style={{ marginTop: 0, marginBottom: 16 }}>
          <div className="fact">
            <p className="fact-label">Room size</p>
            <p className="fact-value">2–12</p>
          </div>
          <div className="fact">
            <p className="fact-label">Word choices</p>
            <p className="fact-value">2–4</p>
          </div>
          <div className="fact">
            <p className="fact-label">Guess window</p>
            <p className="fact-value">60–120s</p>
          </div>
        </div>

        <div className="stack">
          <section className="card">
            <div className="help-list">
              {HOW_TO_STEPS.map((step) => (
                <div className="help-section" key={step.number}>
                  <p className="eyebrow">{step.number}</p>
                  <h2>{step.title}</h2>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Scoring, in plain numbers</h2>
              <span className="pill">Max 100</span>
            </div>
            <div className="help-list">
              <div className="help-section">
                <p>
                  A correct guess starts at <strong>100 points</strong> and falls as the clock runs
                  down. Each player who has already guessed takes a small amount off the next
                  guess, so early answers are worth more.
                </p>
                <p>
                  The drawer earns <strong>up to 100 points</strong> for the share of the room that
                  guessed correctly. A round where nobody guesses scores nothing for the drawer.
                </p>
              </div>
              <div className="help-section">
                <h2>Good to know</h2>
                <ul>
                  <li>The word is masked by dashes and spaces. One third of the letters appear at the one-third mark, another third at the two-thirds mark.</li>
                  <li>If the drawer disconnects, the round ends and the room moves on.</li>
                  <li>A disconnected player keeps their seat for 30 seconds. Refresh the page in that window and the same seat, score and resume token come back.</li>
                  <li>The host can start a rematch from the final score screen.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Room controls</h2>
              <span className="pill">Host</span>
            </div>
            <div className="legend-row">
              <span className="pill"><UsersIcon size={11} /> Max players</span>
              <span className="pill"><ClockIcon size={11} /> Draw time</span>
              <span className="pill"><PencilIcon size={11} /> Word choices</span>
            </div>
            <p className="subline" style={{ marginTop: 10 }}>
              The host sets these in the lobby. They lock when the game starts and can be changed
              again before a rematch.
            </p>
            <div className="form-actions">
              <Link href="/create" className="btn btn--primary">
                Create a room
              </Link>
              <Link href="/join" className="btn btn--ghost">
                Join with a code
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

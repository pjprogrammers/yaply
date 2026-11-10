import type { Metadata } from "next";
import Link from "next/link";
import { InstallCard, InstallGuides } from "@/components/install-card";
import { ArrowRightIcon, PlayIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { Topbar } from "@/components/topbar";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { installSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Install Who's the Spy | Yaply" },
  description:
    "Install Who's the Spy on your phone, tablet or desktop. The free spy game opens in its own window with no store and no account.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/install` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/install`,
    siteName: "Yaply Who's the Spy",
    title: "Install Who's the Spy | Free online spy game",
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
    title: "Install Who's the Spy | Free online spy game",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/og.png"],
  },
};

const BENEFITS = [
  {
    title: "One tap to the table",
    body: "The installed app opens straight to the lobby, without the browser toolbar taking a slice of the room.",
  },
  {
    title: "Your name stays put",
    body: "Who's the Spy remembers the nickname you use in rooms, so joining the next case is one less thing to type.",
  },
  {
    title: "No store in the middle",
    body: "Your browser installs the app and handles updates quietly. No download queue, no account, no payment.",
  },
];

export default function InstallPage() {
  return (
    <div className="app-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(installSchema()) }}
      />
      <Topbar />
      <main className="page-shell install-page">
        <section className="install-hero">
          <div>
            <h1>Install Who&apos;s the Spy.</h1>
            <p>
              Who&apos;s the Spy is a browser game that installs like an app.
              Same room link, same private cards, its own window when you want
              one.
            </p>
            <div className="install-hero-actions">
              <Link href="/create" className="button button--large">
                <PlayIcon size={16} />
                Start a room
              </Link>
              <Link href="/how-to-play" className="button button--ghost button--large">
                Read the rules
                <ArrowRightIcon size={15} />
              </Link>
            </div>
          </div>
          <InstallCard />
        </section>

        <section className="install-benefits" aria-label="Why install">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title}>
              <h2>{benefit.title}</h2>
              <p>{benefit.body}</p>
            </div>
          ))}
        </section>

        <InstallGuides />
      </main>
      <SiteFooter />
    </div>
  );
}

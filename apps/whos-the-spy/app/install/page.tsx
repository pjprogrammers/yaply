import type { Metadata } from "next";
import Link from "next/link";
import { InstallCard, InstallGuides } from "@/components/install-card";
import { ArrowRightIcon, PlayIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { Topbar } from "@/components/topbar";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Install Who's the Spy",
  description:
    "Install Who's the Spy on your phone, tablet or desktop. The party game opens in its own window with no store and no account.",
  alternates: { canonical: `${SITE_URL}/install` },
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
      <Topbar />
      <main className="page-shell install-page">
        <section className="install-hero">
          <div>
            <h1>Put the case file in your pocket.</h1>
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

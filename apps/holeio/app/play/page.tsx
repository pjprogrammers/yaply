import type { Metadata } from "next";
import { GameClient } from "@/components/game-client";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Play Hole.io",
  description:
    "Drop into a two-minute Hole.io match. Swallow the city, dodge bigger holes, and finish top of the table.",
  alternates: { canonical: `${SITE_URL}/play` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/play`,
    title: "Play Hole.io",
    description: "Two minutes. Eight holes. One city. Start swallowing.",
  },
};

export default function PlayPage() {
  return (
    <main id="main" className="play-page">
      <GameClient />
    </main>
  );
}

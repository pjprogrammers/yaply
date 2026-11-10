import type { Metadata } from "next";
import { GameClient } from "@/components/game-client";
import { GAME_KEYWORDS } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Play Hole.io — free hole io game online" },
  description:
    "Play Hole.io free in your browser. Drop into a two-minute match, swallow the city, dodge bigger holes, and finish top of the eight-hole leaderboard. No download or account.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/play` },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/play`,
    siteName: "Yaply",
    title: "Play Hole.io — free hole io game online",
    description:
      "Two minutes. Eight holes. One city. Start swallowing in this free browser arcade game.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Hole.io — a black hole swallowing a city block on a lime field",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Play Hole.io — free hole io game online",
    description: "Two minutes. Eight holes. One city. Start swallowing.",
    images: ["/og.png"],
  },
};

const breadcrumbs = breadcrumbSchema([
  { name: "Hole.io", path: "/" },
  { name: "Play Hole.io", path: "/play" },
]);

export default function PlayPage() {
  return (
    <main id="main" className="play-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <GameClient />
    </main>
  );
}

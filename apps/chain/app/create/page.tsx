import type { Metadata } from "next";
import { CreateRoom } from "@/components/create-room";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { createRoomSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Create a Chain Reaction game | Yaply" },
  description:
    "Create a private Chain Reaction game: choose a board, player count, turn clock, palette, table theme and CPU difficulty. Free, no account.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/create` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/create`,
    siteName: "Yaply Chain Reaction",
    title: "Create a Chain Reaction game | Free online board game",
    description: GAME_SHORT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Chain Reaction — a glowing blue jellyfish above a dark electric game table with stacked orbs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create a Chain Reaction game | Free online board game",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

export default function CreatePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(createRoomSchema()) }}
      />
      <CreateRoom />
    </>
  );
}

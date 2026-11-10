import type { Metadata } from "next";
import { CreateRoom } from "@/components/create-room";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { createRoomSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Create a Who's the Spy room | Yaply" },
  description:
    "Create a private Who's the Spy game: choose word categories, spy count, clue format, voting timer and final-guess rules. Free, no account.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/create` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/create`,
    siteName: "Yaply Who's the Spy",
    title: "Create a Who's the Spy room | Free online spy game",
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
    title: "Create a Who's the Spy room | Free online spy game",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/og.png"],
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

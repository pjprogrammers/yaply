import type { Metadata } from "next";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Create a private drawing room",
  description:
    "Create a free Skribbl room and invite friends with a six-letter code. Choose the word pack, rounds, draw time and player cap for your online drawing and guessing game.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/create` },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/create`,
    siteName: "Yaply",
    title: "Create a Skribbl room | Free online drawing game",
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
    title: "Create a Skribbl room | Free online drawing game",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}

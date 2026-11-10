import type { Metadata } from "next";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Join a Skribbl room with a code",
  description:
    "Enter a six-character room code and a nickname to join a private Skribbl drawing and guessing game. No account, no download and no app store.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/join` },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/join`,
    siteName: "Yaply",
    title: "Join a Skribbl room | Free online drawing game",
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
    title: "Join a Skribbl room | Free online drawing game",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}

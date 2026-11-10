import type { Metadata } from "next";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { joinRoomSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Join a Chain Reaction room | Yaply" },
  description:
    "Enter a six-character room code and a nickname to join a private Chain Reaction game. No account, no download and no app store.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/join` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/join`,
    siteName: "Yaply Chain Reaction",
    title: "Join a Chain Reaction room | Free online board game",
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
    title: "Join a Chain Reaction room | Free online board game",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(joinRoomSchema()) }}
      />
      {children}
    </>
  );
}

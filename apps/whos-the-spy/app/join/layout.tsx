import type { Metadata } from "next";
import { GAME_KEYWORDS, GAME_SHORT_DESCRIPTION } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { joinRoomSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "Join a Who's the Spy room | Yaply" },
  description:
    "Enter a six-character room code and a nickname to join a private Who's the Spy game. No account, no download and no app store.",
  keywords: GAME_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/join` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/join`,
    siteName: "Yaply Who's the Spy",
    title: "Join a Who's the Spy room | Free online spy game",
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
    title: "Join a Who's the Spy room | Free online spy game",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/og.png"],
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

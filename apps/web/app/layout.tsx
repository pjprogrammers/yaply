import type { Metadata, Viewport } from "next";
import { PwaBridge } from "@yaply/shared/install";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Search Console verification for the yaplygames.vercel.app property. The env
// var can override it for other deployments.
const DEFAULT_GOOGLE_SITE_VERIFICATION =
  "lrihOhmRTJmkRzSy5Pv3_Fe36k_dGKd23rPrL7ftpv8";

const googleVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  DEFAULT_GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.BING_SITE_VERIFICATION;
const yandexVerification = process.env.YANDEX_SITE_VERIFICATION;

const verification: Metadata["verification"] =
  googleVerification || bingVerification || yandexVerification
    ? {
        ...(googleVerification ? { google: googleVerification } : {}),
        ...(bingVerification || yandexVerification
          ? {
              other: {
                ...(bingVerification
                  ? { "msvalidate.01": bingVerification }
                  : {}),
                ...(yandexVerification
                  ? { "yandex-verification": yandexVerification }
                  : {}),
              },
            }
          : {}),
      }
    : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Yaply Games — free browser games to play with friends",
    template: "%s | Yaply Games",
  },
  description:
    "Yaply (YaplyGames) is a free browser games platform for game night. Play Chain Reaction, Skribbl, Smash Karts, Hole.io and Who's the Spy with friends using one link or room code. No installs, no accounts — just fast multiplayer browser games.",
  applicationName: "Yaply",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yaply",
  },
  keywords: [
    "yaply",
    "yaply games",
    "yaplygames",
    "yaply game",
    "yaply browser games",
    "yaply holeio",
    "yaply skribbl",
    "yaply chain reaction",
    "yaply smash karts",
    "yaply who's the spy",
    "skribbl",
    "skribbl game",
    "scribbl",
    "scribbl game",
    "skribble",
    "drawing game",
    "drawing and guessing game",
    "online drawing game",
    "free drawing game",
    "chain reaction",
    "chain reaction game",
    "chain reaction online",
    "chain reaction board game",
    "hole io",
    "holeio",
    "hole.io",
    "hole io game",
    "hole game",
    "smash karts",
    "smashkarts",
    "smash karts game",
    "smash karts online",
    "kart arena game",
    "who's the spy",
    "who is the spy",
    "whos the spy",
    "who is the spy game",
    "social deduction game",
    "spy game",
    "ludo",
    "ludo game",
    "browser games",
    "free browser games",
    "multiplayer browser games",
    "browser party games",
    "play games with friends",
    "games to play with friends",
    "games to play with friends online",
    "play games with friends online",
    "online party games",
    "io games",
    "no download games",
  ],
  authors: [{ name: "Yaply", url: SITE_URL }],
  creator: "Yaply",
  publisher: "Yaply",
  category: "games",
  classification: "Browser games, party games, multiplayer games",
  manifest: "/manifest.webmanifest",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  ...(verification ? { verification } : {}),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/`,
    siteName: "Yaply Games",
    title: "Yaply Games — free browser games to play with friends",
    description:
      "Play Hole.io, Chain Reaction, Skribbl, Smash Karts and Who's the Spy with friends. One link, no installs, no accounts.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Yaply browser games — a fanned deck of game posters on a blue and yellow field",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yaply Games — free browser games to play with friends",
    description:
      "Play Hole.io, Chain Reaction, Skribbl, Smash Karts and Who's the Spy with friends. One link, no installs.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1423b8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="Yaply LLM summary"
        />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms-full.txt"
          title="Yaply full LLM reference"
        />
        <link
          rel="alternate"
          type="text/plain"
          href="/ai.txt"
          title="Yaply AI usage policy"
        />
        <link
          rel="sitemap"
          type="application/xml"
          href="/sitemap.xml"
          title="Yaply sitemap"
        />
      </head>
      <body>
        {children}
        <PwaBridge />
      </body>
    </html>
  );
}

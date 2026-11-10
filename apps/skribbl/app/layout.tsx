import type { Metadata, Viewport } from "next";
import { Inter, Shantell_Sans } from "next/font/google";
import { PwaBridge } from "@yaply/shared/install";
import {
  GAME_ALIASES,
  GAME_DESCRIPTION,
  GAME_KEYWORDS,
  GAME_SHORT_DESCRIPTION,
} from "@/lib/content";
import { SITE_URL, MAIN_URL } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const sketch = Shantell_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-sketch",
  display: "swap",
});

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
    default: "Skribbl — free online drawing game to play with friends",
    template: "%s | Skribbl by Yaply",
  },
  description: GAME_DESCRIPTION,
  applicationName: "Skribbl",
  keywords: GAME_KEYWORDS,
  authors: [{ name: "Yaply", url: MAIN_URL }],
  creator: "Yaply",
  publisher: "Yaply",
  category: "games",
  classification: "Browser game, drawing game, party game, guessing game",
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
  ...(verification ? { verification } : {}),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Skribbl",
  },
  openGraph: {
    title: "Skribbl — free online drawing game to play with friends",
    description: GAME_SHORT_DESCRIPTION,
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Yaply",
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
    title: "Skribbl — free online drawing game to play with friends",
    description: GAME_SHORT_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
  other: {
    "game:name": "Skribbl",
    "game:aliases": GAME_ALIASES.join(", "),
    "game:genre": "Drawing, guessing, party game",
    "game:players": "2–12",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a09",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sketch.variable}`}>
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="Skribbl LLM summary"
        />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms-full.txt"
          title="Skribbl full LLM reference"
        />
        <link
          rel="sitemap"
          type="application/xml"
          href="/sitemap.xml"
          title="Skribbl sitemap"
        />
      </head>
      <body className={inter.className}>
        {children}
        <PwaBridge />
      </body>
    </html>
  );
}

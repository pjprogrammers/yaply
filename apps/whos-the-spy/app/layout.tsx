import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { PwaBridge } from "@yaply/shared/install";
import {
  GAME_DESCRIPTION,
  GAME_KEYWORDS,
  GAME_NAME,
  GAME_SHORT_DESCRIPTION,
} from "@/lib/content";
import { MAIN_URL, SITE_URL } from "@/lib/config";
import "./globals.css";
import "./game.css";
import "./install.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Search Console verification for the yaplygames.vercel.app property. The env
// var can override it for other deployments.
const googleVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  "QAhEX042VQs3NTq6wQ37xejkP5ySnigtDpIA0IY4EgY";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: googleVerification,
  },
  title: {
    default: "Who's the Spy — free online spy game by Yaply",
    template: `%s | ${GAME_NAME} by Yaply`,
  },
  description: GAME_DESCRIPTION,
  applicationName: GAME_NAME,
  keywords: GAME_KEYWORDS,
  authors: [{ name: "Yaply", url: MAIN_URL }],
  creator: "Yaply",
  publisher: "Yaply",
  category: "games",
  classification: "Social deduction game, party game, word game, spy game",
  manifest: "/manifest.webmanifest",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: `${SITE_URL}/`,
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: GAME_NAME,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/`,
    siteName: `Yaply ${GAME_NAME}`,
    title: "Who's the Spy — free online spy game by Yaply",
    description: `${GAME_SHORT_DESCRIPTION} Give clues, read the room and vote them out. Free in your browser.`,
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
    title: "Who's the Spy — free online spy game by Yaply",
    description:
      "Everyone has a secret word. The spies have a different one. Give clues, read the room and vote them out.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0910",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="Who's the Spy LLM summary"
        />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms-full.txt"
          title="Who's the Spy full LLM reference"
        />
        <link
          rel="alternate"
          type="text/plain"
          href="/ai.txt"
          title="Who's the Spy AI usage policy"
        />
        <link
          rel="sitemap"
          type="application/xml"
          href="/sitemap.xml"
          title="Who's the Spy sitemap"
        />
      </head>
      <body className={body.className}>
        {children}
        <PwaBridge />
      </body>
    </html>
  );
}

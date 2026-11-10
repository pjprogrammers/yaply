import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { PwaBridge } from "@yaply/shared/install";
import {
  GAME_DESCRIPTION,
  GAME_KEYWORDS,
  GAME_NAME,
  GAME_SHORT_DESCRIPTION,
} from "@/lib/content";
import { MAIN_URL, SITE_URL } from "@/lib/config";
import "./globals.css";
import "./landing.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-display",
  display: "swap",
});

// Search Console verification for the yaplygames.vercel.app property. The env
// var can override it for other deployments.
const googleVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  "lrihOhmRTJmkRzSy5Pv3_Fe36k_dGKd23rPrL7ftpv8";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: googleVerification,
  },
  title: {
    default: "Chain Reaction — free online chain reaction game by Yaply",
    template: `%s | ${GAME_NAME} by Yaply`,
  },
  description: GAME_DESCRIPTION,
  applicationName: GAME_NAME,
  keywords: GAME_KEYWORDS,
  authors: [{ name: "Yaply", url: MAIN_URL }],
  creator: "Yaply",
  publisher: "Yaply",
  category: "games",
  classification: "Chain reaction game, board game, turn-based strategy game, orb strategy game",
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
    title: "Chain Reaction — free online chain reaction game by Yaply",
    description: `${GAME_SHORT_DESCRIPTION} Play online, pass-and-play or against CPUs.`,
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
    title: "Chain Reaction — free online chain reaction game by Yaply",
    description:
      "Claim cells, stack orbs past their critical mass and let the cascade take the board. Two to eight players, online or on one device.",
    images: ["/twitter-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#06090e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="Chain Reaction LLM summary"
        />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms-full.txt"
          title="Chain Reaction full LLM reference"
        />
        <link
          rel="alternate"
          type="text/plain"
          href="/ai.txt"
          title="Chain Reaction AI usage policy"
        />
        <link
          rel="sitemap"
          type="application/xml"
          href="/sitemap.xml"
          title="Chain Reaction sitemap"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
        <PwaBridge />
      </body>
    </html>
  );
}

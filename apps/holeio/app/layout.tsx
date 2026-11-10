import type { Metadata, Viewport } from "next";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import { PwaBridge } from "@yaply/shared/install";
import {
  GAME_ALIASES,
  GAME_DESCRIPTION,
  GAME_KEYWORDS,
  GAME_SHORT_DESCRIPTION,
} from "@/lib/content";
import { MAIN_URL, SITE_URL } from "@/lib/config";
import "./globals.css";

const display = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
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
    default: "Hole.io — play the free hole io game online",
    template: "%s | Hole.io",
  },
  description: GAME_DESCRIPTION,
  applicationName: "Hole.io",
  keywords: GAME_KEYWORDS,
  authors: [{ name: "Yaply", url: MAIN_URL }],
  creator: "Yaply",
  publisher: "Yaply",
  category: "games",
  classification: "Browser game, arcade game, io game",
  alternates: {
    canonical: "/",
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
  ...(verification ? { verification } : {}),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hole.io",
  },
  openGraph: {
    title: "Hole.io — play the free hole io game online",
    description: `${GAME_SHORT_DESCRIPTION} ${GAME_DESCRIPTION}`,
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Yaply",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Hole.io — a black hole swallowing a city block on a lime field",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hole.io — play the free hole io game online",
    description: `${GAME_SHORT_DESCRIPTION} Play free in your browser.`,
    images: ["/og.png"],
  },
  other: {
    "game:name": "Hole.io",
    "game:aliases": GAME_ALIASES.join(", "),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f0f0f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable}`}>
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="Hole.io LLM summary"
        />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms-full.txt"
          title="Hole.io full LLM reference"
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <PwaBridge />
      </body>
    </html>
  );
}

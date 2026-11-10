import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { PwaBridge } from "@yaply/shared/install";
import { SITE_URL } from "@/lib/config";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Who's the Spy — one of you has the wrong word",
  description:
    "A social deduction party game for 3–12 players. Everyone gets a secret word, but the spies get a different one. Give clues, read the room and vote them out.",
  applicationName: "Who's the Spy",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Who's the Spy",
  },
  openGraph: {
    title: "Who's the Spy — one of you has the wrong word",
    description:
      "Everyone has a secret word. The spies have a different one. Give clues, read the room and vote them out. Free in your browser.",
    type: "website",
    images: [{ url: "/og.png", width: 900, height: 1200, alt: "Who's the Spy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Who's the Spy — one of you has the wrong word",
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
      <body className={body.className}>
        {children}
        <PwaBridge />
      </body>
    </html>
  );
}

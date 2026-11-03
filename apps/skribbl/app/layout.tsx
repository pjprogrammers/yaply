import type { Metadata, Viewport } from "next";
import { Inter, Shantell_Sans } from "next/font/google";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const sketch = Shantell_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-sketch",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Skribbl — draw badly, guess fast",
  description:
    "A private drawing and guessing game for 2–12 players. Create a room, share the code, and try to draw a word nobody can guess.",
  applicationName: "Skribbl",
  openGraph: {
    title: "Skribbl — draw badly, guess fast",
    description:
      "A private drawing and guessing game for 2–12 players. One player sketches, everyone else guesses. Earlier guesses score more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skribbl — draw badly, guess fast",
    description:
      "A private drawing and guessing game for 2–12 players. One player sketches, everyone else guesses. Earlier guesses score more.",
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
      <body className={inter.className}>{children}</body>
    </html>
  );
}

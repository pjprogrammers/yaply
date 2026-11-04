import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SITE_URL } from "@/lib/config";
import "./globals.css";
import "./landing.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Chain Reaction — one orb, whole board",
  description:
    "A turn-based board game for 2–8 players. Claim cells, stack orbs past their critical mass and watch the chain flip the table. Play online, pass-and-play or against CPUs.",
  applicationName: "Chain Reaction",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chain Reaction",
  },
  openGraph: {
    title: "Chain Reaction — one orb, whole board",
    description:
      "Claim cells, stack orbs past their critical mass and let the cascade take the board. Two to eight players, online or on one device.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chain Reaction — one orb, whole board",
    description:
      "Claim cells, stack orbs past their critical mass and let the cascade take the board. Two to eight players, online or on one device.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}

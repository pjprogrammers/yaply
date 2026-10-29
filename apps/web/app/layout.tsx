import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://yaply.eu.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Yaply — Browser games for game night",
    template: "%s | Yaply",
  },
  description:
    "Yaply is a free browser gaming platform for game night. Play Chain Reaction and Skribbl with friends using one link or room code. No installs, no accounts.",
  applicationName: "Yaply",
  keywords: [
    "yaply",
    "yaply games",
    "browser games",
    "free browser games",
    "multiplayer browser games",
    "play games with friends",
    "online party games",
    "chain reaction game",
    "skribbl",
    "no download games",
  ],
  authors: [{ name: "Yaply", url: siteUrl }],
  creator: "Yaply",
  publisher: "Yaply",
  category: "games",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${siteUrl}/`,
    siteName: "Yaply",
    title: "Yaply — Browser games for game night",
    description:
      "Fast multiplayer browser games for game night. Pick a game, open a room and send one link. No installs, no accounts.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Yaply browser games: Chain Reaction, Skribbl, Ludo, Who's the Spy and Smash Karts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yaply — Browser games for game night",
    description:
      "Fast multiplayer browser games for game night. Pick a game, open a room and send one link.",
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
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
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
      <body>{children}</body>
    </html>
  );
}

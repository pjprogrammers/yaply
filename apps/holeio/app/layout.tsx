import type { Metadata, Viewport } from "next";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import { PwaBridge } from "@yaply/shared/install";
import { SITE_URL } from "@/lib/config";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Hole.io — swallow the city",
  description:
    "Hole.io is a free browser arcade game. Steer a growing hole through a live city, swallow cars, trees and buildings, and out-eat seven rival holes in two minutes.",
  applicationName: "Hole.io",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hole.io",
  },
  openGraph: {
    title: "Hole.io — swallow the city",
    description:
      "Two minutes. Eight holes. One city that disappears block by block. Play free in your browser.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hole.io — swallow the city",
    description:
      "Two minutes. Eight holes. One city that disappears block by block. Play free in your browser.",
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

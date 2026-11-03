import type { Metadata, Viewport } from "next";
import { Archivo_Black, Inter } from "next/font/google";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Smash Karts — a browser kart arena",
  description:
    "Smash Karts is a free-for-all kart arena in your browser. Three scrap-built maps, six weapons, and up to seven bots. Drift, fire, repeat.",
  applicationName: "Smash Karts",
  openGraph: {
    title: "Smash Karts",
    description:
      "Free-for-all kart combat in your browser. Three arenas, six weapons, one rule: keep moving.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smash Karts",
    description:
      "Free-for-all kart combat in your browser. Three arenas, six weapons, one rule: keep moving.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

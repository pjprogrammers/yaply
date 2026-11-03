import type { Metadata, Viewport } from "next";
import { Archivo_Black, Inter } from "next/font/google";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003"),
  title: "Kart Riot — a browser kart arena",
  description:
    "Kart Riot is a free-for-all kart arena in your browser. Three scrap-built maps, six weapons, and up to seven bots. Drift, fire, repeat.",
  applicationName: "Kart Riot",
  openGraph: {
    title: "Kart Riot",
    description:
      "Free-for-all kart combat in your browser. Three arenas, six weapons, one rule: keep moving.",
    type: "website",
    images: [
      {
        url: "/media/firefight.jpg",
        width: 1280,
        height: 720,
        alt: "Two karts trading fire on a neon rooftop arena.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kart Riot",
    description:
      "Free-for-all kart combat in your browser. Three arenas, six weapons, one rule: keep moving.",
    images: ["/media/firefight.jpg"],
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

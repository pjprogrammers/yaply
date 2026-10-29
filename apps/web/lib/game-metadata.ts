import type { Metadata } from "next";
import type { GameEntry } from "@/data/games";

const siteUrl = "https://yaply.eu.org";

export function gameMetadata(game: GameEntry): Metadata {
  const title =
    game.status === "available"
      ? `Play ${game.name} online`
      : `${game.name} — coming soon`;
  const description = `${game.statement} ${
    game.status === "available"
      ? "Play free in your browser on Yaply."
      : "Coming soon to Yaply."
  }`;

  return {
    title,
    description,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: `${siteUrl}/games/${game.slug}`,
      siteName: "Yaply",
      title: `${title} | Yaply`,
      description,
      images: [
        {
          url: game.poster,
          width: 900,
          height: 1200,
          alt: game.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Yaply`,
      description,
      images: [game.poster],
    },
  };
}

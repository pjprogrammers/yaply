import type { Metadata } from "next";
import type { GameEntry } from "@/data/games";
import { SITE_URL } from "@/lib/site";

export function gameMetadata(game: GameEntry): Metadata {
  const defaultTitle =
    game.status === "available"
      ? `Play ${game.name} online`
      : `${game.name} — coming soon`;
  const title = game.seoTitle ?? defaultTitle;
  const description =
    game.seoDescription ??
    `${game.statement} ${
      game.status === "available"
        ? "Play free in your browser on Yaply."
        : "Coming soon to Yaply."
    }`;
  const keywords = game.keywords ?? [
    game.name,
    `play ${game.name}`,
    `${game.name} online`,
    `${game.name} game`,
    "browser game",
    "free browser game",
    "play games with friends",
    "Yaply",
  ];
  const image = game.ogImage ?? {
    src: game.poster,
    width: 900,
    height: 1200,
    alt: game.alt,
  };
  const socialTitle = game.seoTitle ? title : `${title} | Yaply`;

  return {
    title: game.seoTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: `/games/${game.slug}` },
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
    openGraph: {
      type: "website",
      locale: "en_US",
      url: `${SITE_URL}/games/${game.slug}`,
      siteName: "Yaply",
      title: socialTitle,
      description,
      images: [
        {
          url: image.src,
          width: image.width,
          height: image.height,
          alt: image.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image.src],
    },
  };
}

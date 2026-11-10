import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: [
        `${SITE_URL}/og.png`,
        `${SITE_URL}/media/game-hero.png`,
        `${SITE_URL}/media/game-city.png`,
      ],
    },
    {
      url: `${SITE_URL}/play`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      images: [`${SITE_URL}/media/game-street.png`],
    },
    {
      url: `${SITE_URL}/install`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [`${SITE_URL}/og.png`],
    },
  ];
}

import type { MetadataRoute } from "next";
import { games } from "@/data/games";
import { SITE_URL } from "@/lib/site";

const baseUrl = SITE_URL;
const lastModified = new Date();

function absolute(path: string) {
  return new URL(path, baseUrl).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const mainImage = absolute("/og.png");

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: [mainImage],
    },
    {
      url: `${baseUrl}/games`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      images: [mainImage, ...games.map((game) => absolute(game.poster))],
    },
    ...games.map((game) => ({
      url: `${baseUrl}/games/${game.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: game.status === "available" ? 0.9 : 0.5,
      images: [
        absolute(game.ogImage?.src ?? game.poster),
        absolute(game.poster),
      ],
    })),
    {
      url: `${baseUrl}/install`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [mainImage],
    },
    {
      url: `${baseUrl}/apps`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [mainImage],
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
      images: [mainImage],
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/llms-full.txt`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/ai.txt`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}

import type { MetadataRoute } from "next";

const baseUrl = "https://yaply.eu.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const gamePages = ["chain-reaction", "smash-karts", "ludo", "whos-the-spy"];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/games`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...gamePages.map((slug) => ({
      url: `${baseUrl}/games/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const image = `${SITE_URL}/og.png`;

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: [image, `${SITE_URL}/icon-512.png`],
    },
    {
      url: `${SITE_URL}/create`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      images: [image],
    },
    {
      url: `${SITE_URL}/how-to-play`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [image],
    },
    {
      url: `${SITE_URL}/join`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [image],
    },
    {
      url: `${SITE_URL}/install`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
      images: [image],
    },
  ];
}

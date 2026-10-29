import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://yaply.eu.org/sitemap.xml",
    host: "https://yaply.eu.org",
  };
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/**
 * Search engines and AI answer engines are explicitly allowed. Rooms are
 * private invite links and /api only serves app config, so neither belongs in
 * an index.
 */
const SEARCH_AND_AI_CRAWLERS = [
  "Googlebot",
  "Googlebot-Image",
  "Googlebot-Video",
  "Google-Extended",
  "Bingbot",
  "BingPreview",
  "msnbot",
  "Bravebot",
  "DuckDuckBot",
  "DuckAssistBot",
  "Applebot",
  "Applebot-Extended",
  "YandexBot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "CCBot",
  "meta-externalagent",
  "Amazonbot",
  "MistralAI-User",
  "YouBot",
  "cohere-ai",
  "Diffbot",
];

export default function robots(): MetadataRoute.Robots {
  const allow = ["/", "/llms.txt", "/llms-full.txt", "/ai.txt"];
  const disallow = ["/api/", "/room/"];

  return {
    rules: [
      { userAgent: "*", allow, disallow },
      { userAgent: SEARCH_AND_AI_CRAWLERS, allow, disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: new URL(SITE_URL).host,
  };
}

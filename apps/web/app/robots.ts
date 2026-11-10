import type { MetadataRoute } from "next";
import { SITE_HOST, SITE_URL } from "@/lib/site";

/**
 * Yaply wants search engines and AI answer engines to index the public game
 * pages. The app config endpoint is not content, so keep it out of the index.
 */
const SEARCH_AND_AI_CRAWLERS = [
  "Googlebot",
  "Googlebot-Image",
  "Google-Extended",
  "Bingbot",
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
];

export default function robots(): MetadataRoute.Robots {
  const allow = ["/", "/llms.txt", "/llms-full.txt"];
  const disallow = ["/api/"];

  return {
    rules: [
      { userAgent: "*", allow, disallow },
      { userAgent: SEARCH_AND_AI_CRAWLERS, allow, disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_HOST,
  };
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/**
 * Search engines and AI answer engines are both explicitly allowed. The room
 * pages are private invite links and the API only serves app config, so neither
 * belongs in an index.
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

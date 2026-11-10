import type { MetadataRoute } from "next";
import { SITE_HOST, SITE_URL } from "@/lib/site";

/**
 * Yaply wants search engines and AI answer engines to index the public game
 * pages. The app config endpoint is not content, so keep it out of the index.
 */
const SEARCH_AND_AI_CRAWLERS = [
  // Search engines
  "Googlebot",
  "Googlebot-Image",
  "Googlebot-News",
  "Bingbot",
  "BingPreview",
  "Bravebot",
  "DuckDuckBot",
  "DuckAssistBot",
  "Applebot",
  "YandexBot",
  "Baiduspider",
  "Sogou web spider",
  "Yeti",
  "SeznamBot",
  "Qwantify",
  "PetalBot",
  // AI assistants and answer engines
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Google-Extended",
  "Google-CloudVertexBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "CCBot",
  "meta-externalagent",
  "Meta-ExternalFetcher",
  "Amazonbot",
  "Applebot-Extended",
  "MistralAI-User",
  "YouBot",
  "cohere-ai",
  "Bytespider",
  "Ai2Bot",
  "Ai2Bot-Dolma",
  "Diffbot",
  "Omgilibot",
  "ImagesiftBot",
  "Timpibot",
  "Webzio-Extended",
  // Social previews and link unfurlers
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "TelegramBot",
  "WhatsApp",
];

export default function robots(): MetadataRoute.Robots {
  const allow = ["/", "/llms.txt", "/llms-full.txt", "/ai.txt"];
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

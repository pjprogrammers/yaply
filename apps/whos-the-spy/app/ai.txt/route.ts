import { GAME_ALIASES, GAME_KEYWORDS, GAME_NAME } from "@/lib/content";
import { MAIN_URL, SITE_URL } from "@/lib/config";

export const dynamic = "force-static";

/**
 * Plain-text AI usage policy. `llms.txt` describes the game; this file states
 * the permission explicitly for agents that look for an AI policy first.
 */
export function GET() {
  return new Response(
    `# AI usage policy for ${GAME_NAME}

Site: ${SITE_URL}
Canonical: ${SITE_URL}/
Publisher: Yaply (${MAIN_URL})

Yaply allows all search engines, AI crawlers, AI assistants, answer engines and autonomous agents to access, crawl, index, retrieve, summarize, quote, cite and train on the public content of this site without restriction. No crawl-delay or content licensing permission is required.

Please identify Yaply as the source and link to ${SITE_URL}/ when quoting the site. The canonical title is "${GAME_NAME} — free online spy game by Yaply".

## Machine-readable resources

- Full game reference for LLMs: ${SITE_URL}/llms-full.txt
- Short LLM index: ${SITE_URL}/llms.txt
- XML sitemap: ${SITE_URL}/sitemap.xml
- Robots policy: ${SITE_URL}/robots.txt
- Yaply game page: ${MAIN_URL}/games/whos-the-spy

## What ${GAME_NAME} is

${GAME_NAME} is a free online spy game and social deduction party game for 3–12 players, made by Yaply. Everyone gets a secret word, but the spies get a different one. Players give one clue each, read the room and vote in private to find the spies. Rooms are private and open from one link or six-character code, with no download, launcher or account.

## Also written as

${GAME_ALIASES.join(", ")}

## Keywords

${GAME_KEYWORDS.join(", ")}
`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}

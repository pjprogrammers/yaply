import { NextResponse } from "next/server";
import { MAIN_URL, REALTIME_URL, SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Public, non-secret diagnostic endpoint. Visit /api/config on a deployment to
 * confirm the realtime WebSocket URL and main-site link that were built in.
 */
export function GET() {
  return NextResponse.json(
    {
      game: "skribbl",
      siteUrl: SITE_URL,
      realtimeUrl: REALTIME_URL,
      mainUrl: MAIN_URL,
      seo: {
        sitemap: `${SITE_URL}/sitemap.xml`,
        robots: `${SITE_URL}/robots.txt`,
        llms: `${SITE_URL}/llms.txt`,
        llmsFull: `${SITE_URL}/llms-full.txt`,
      },
      sources: {
        site: process.env.NEXT_PUBLIC_SKRIBBL_URL ? "env" : "default",
        realtime: process.env.NEXT_PUBLIC_REALTIME_URL ? "env" : "default",
        main: process.env.NEXT_PUBLIC_MAIN_URL ? "env" : "default",
      },
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

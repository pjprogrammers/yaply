import { NextResponse } from "next/server";
import { MAIN_URL, REALTIME_URL, SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Public, non-secret diagnostic endpoint. Visit /api/config on a deployment to
 * confirm the main site, realtime WebSocket URL and canonical game origin that
 * were built into the bundle.
 */
export function GET() {
  return NextResponse.json(
    {
      game: "kart-riot",
      siteUrl: SITE_URL,
      mainUrl: MAIN_URL,
      realtimeUrl: REALTIME_URL,
      sources: {
        site: process.env.NEXT_PUBLIC_SMASHKARTS_URL ? "env" : "default",
        main: process.env.NEXT_PUBLIC_MAIN_URL ? "env" : "default",
        realtime: process.env.NEXT_PUBLIC_REALTIME_URL ? "env" : "default",
      },
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

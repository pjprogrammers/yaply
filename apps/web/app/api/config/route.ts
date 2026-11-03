import { NextResponse } from "next/server";
import {
  CHAIN_REACTION_URL,
  GAME_URL_SOURCES,
  SKRIBBL_URL,
} from "@/lib/game-urls";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Public, non-secret diagnostic endpoint. Visit /api/config on a deployment to
 * confirm which URLs the build actually resolved and whether each value came
 * from an environment variable or a fallback.
 */
export function GET() {
  return NextResponse.json(
    {
      mainUrl: SITE_URL,
      chainUrl: CHAIN_REACTION_URL,
      skribblUrl: SKRIBBL_URL,
      sources: {
        ...GAME_URL_SOURCES,
        main: process.env.NEXT_PUBLIC_MAIN_URL ? "env" : "vercel",
      },
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

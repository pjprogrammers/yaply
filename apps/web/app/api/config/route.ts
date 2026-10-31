import { NextResponse } from "next/server";
import {
  CHAIN_REACTION_URL,
  GAME_URL_SOURCES,
  SKRIBBL_URL,
} from "@/lib/game-urls";

export const dynamic = "force-dynamic";

/**
 * Public, non-secret diagnostic endpoint. Visit /api/config on a deployment to
 * confirm which game URLs the build actually resolved and whether each value
 * came from an environment variable or the fallback default.
 */
export function GET() {
  return NextResponse.json(
    {
      chainUrl: CHAIN_REACTION_URL,
      skribblUrl: SKRIBBL_URL,
      sources: GAME_URL_SOURCES,
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

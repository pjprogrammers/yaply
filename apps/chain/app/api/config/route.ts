import { NextResponse } from "next/server";
import { MAIN_URL, REALTIME_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Public, non-secret diagnostic endpoint. Visit /api/config on a deployment to
 * confirm the realtime WebSocket URL and main-site link that were built in.
 */
export function GET() {
  return NextResponse.json(
    {
      realtimeUrl: REALTIME_URL,
      mainUrl: MAIN_URL,
      sources: {
        realtime: process.env.NEXT_PUBLIC_REALTIME_URL ? "env" : "default",
        main: process.env.NEXT_PUBLIC_MAIN_URL ? "env" : "default",
      },
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

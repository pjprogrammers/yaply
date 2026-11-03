import {
  normalizeHttpUrl,
  resolveRealtimeBaseUrl,
} from "@yaply/shared/config";

/**
 * Canonical origin of this Kart Riot deployment. `NEXT_PUBLIC_SITE_URL` wins;
 * Vercel's system variables provide a host when the project has not set it, so
 * Open Graph images do not fall back to localhost on a deployment.
 */
export const SITE_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
  "http://localhost:3003",
);

/** Main Yaply site used by the "Back to Yaply" link. */
export const MAIN_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_MAIN_URL,
  "http://localhost:3000",
);

/**
 * Shared realtime WebSocket base. Kart Riot currently runs its arena locally;
 * this value keeps the app pointed at the same backend as Skribbl and Chain
 * Reaction so an online mode can use it without another config change.
 */
export const REALTIME_URL = resolveRealtimeBaseUrl(
  process.env.NEXT_PUBLIC_REALTIME_URL,
  typeof window !== "undefined" ? window.location : undefined,
);

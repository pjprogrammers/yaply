import { normalizeHttpUrl } from "@yaply/shared/config";

/**
 * Canonical origin of the main Yaply site.
 *
 * Set NEXT_PUBLIC_MAIN_URL in .env.local and in the Vercel project so metadata,
 * sitemap and robots all use the same domain. Vercel's project URL keeps
 * preview builds usable when the variable is not configured.
 */
const configuredUrl = process.env.NEXT_PUBLIC_MAIN_URL;
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = normalizeHttpUrl(
  configuredUrl,
  vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000",
);

export const SITE_HOST = new URL(SITE_URL).host;

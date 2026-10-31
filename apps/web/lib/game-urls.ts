import { normalizeHttpUrl } from "@yaply/shared/config";

// Game deployments. These are read at build time from Vercel's project
// environment. NEXT_PUBLIC_* values are inlined into the client bundle, so a
// changed value only takes effect after a new deployment.
const DEFAULT_CHAIN_URL = "https://yaply-chain.vercel.app";
const DEFAULT_SKRIBBL_URL = "https://yaply-skribbl.vercel.app";

export const CHAIN_REACTION_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_CHAIN_URL,
  DEFAULT_CHAIN_URL,
);

export const SKRIBBL_URL = normalizeHttpUrl(
  process.env.NEXT_PUBLIC_SKRIBBL_URL,
  DEFAULT_SKRIBBL_URL,
);

/** True when the deployment supplied an explicit value for each game URL. */
export const GAME_URL_SOURCES = {
  chain: process.env.NEXT_PUBLIC_CHAIN_URL ? "env" : "default",
  skribbl: process.env.NEXT_PUBLIC_SKRIBBL_URL ? "env" : "default",
} as const;

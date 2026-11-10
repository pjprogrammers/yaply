import { normalizeHttpUrl } from "@yaply/shared/config";

function requireHttpUrl(value: string | undefined, name: string): string {
  const url = normalizeHttpUrl(value, "");
  if (!url) {
    throw new Error(`${name} must be set to an absolute http(s) URL.`);
  }
  return url;
}

// Game deployments. These are read at build time from the project environment.
// NEXT_PUBLIC_* values are inlined into the client bundle, so a changed value
// only takes effect after a new deployment.
export const CHAIN_REACTION_URL = requireHttpUrl(
  process.env.NEXT_PUBLIC_CHAIN_URL,
  "NEXT_PUBLIC_CHAIN_URL",
);

export const SKRIBBL_URL = requireHttpUrl(
  process.env.NEXT_PUBLIC_SKRIBBL_URL,
  "NEXT_PUBLIC_SKRIBBL_URL",
);

// The app directory and package keep the `smashkarts` name; the public game is
// Smash Karts, so the env var and export stay recognisable.
export const SMASHKARTS_URL = requireHttpUrl(
  process.env.NEXT_PUBLIC_SMASHKARTS_URL,
  "NEXT_PUBLIC_SMASHKARTS_URL",
);

export const HOLEIO_URL = requireHttpUrl(
  process.env.NEXT_PUBLIC_HOLEIO_URL,
  "NEXT_PUBLIC_HOLEIO_URL",
);

export const WHOS_THE_SPY_URL = requireHttpUrl(
  process.env.NEXT_PUBLIC_WHOS_THE_SPY_URL,
  "NEXT_PUBLIC_WHOS_THE_SPY_URL",
);

/** Where each game URL came from. */
export const GAME_URL_SOURCES = {
  chain: process.env.NEXT_PUBLIC_CHAIN_URL ? "env" : "missing",
  skribbl: process.env.NEXT_PUBLIC_SKRIBBL_URL ? "env" : "missing",
  smashkarts: process.env.NEXT_PUBLIC_SMASHKARTS_URL ? "env" : "missing",
  holeio: process.env.NEXT_PUBLIC_HOLEIO_URL ? "env" : "missing",
  whosTheSpy: process.env.NEXT_PUBLIC_WHOS_THE_SPY_URL ? "env" : "missing",
} as const;

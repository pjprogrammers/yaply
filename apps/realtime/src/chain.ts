/**
 * The chain engine lives in `@yaply/shared/chain` so the local game and the
 * authoritative Worker run the exact same rules. Keep this module as the
 * server-facing entry point used by Room.ts and the tests.
 */
export * from "@yaply/shared/chain";

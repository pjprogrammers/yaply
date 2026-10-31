# Skribbl Separation Report

## Status

Skribbl is a standalone Next.js app in `apps/skribbl`. The main site no longer
serves Skribbl routes; it links to the standalone deployment through
`NEXT_PUBLIC_SKRIBBL_URL`. Chain Reaction follows the same pattern in
`apps/chain`, and both games share one realtime Worker.

## Current structure

```
apps/
  web/        Main site: hub, game directory, about
  skribbl/    Standalone Skribbl: /, /create, /how-to-play, /room/[code]
  chain/      Standalone Chain Reaction: /, /how-to-play, /room/[roomCode]
  realtime/   Shared Cloudflare Worker + GameRoom Durable Object
packages/
  shared/     Protocol types, schemas, client, React hooks, config
  game-core/  Pure game logic helpers
  ui/         Shared UI primitives
```

`apps/web/app/games` contains only the coming-soon game pages (Chain Reaction,
Ludo, Smash Karts, Who's the Spy). The old Skribbl route was removed during the
separation.

## Separation changes

- Created `apps/skribbl` with its own `package.json`, Next.js config, Tailwind
  setup, app routes, components, and env example.
- Moved Skribbl UI and room flow out of `apps/web` into `apps/skribbl`.
- Added `apps/skribbl/lib/config.ts` for room codes, invite URLs, nickname
  storage, and numeric query-param clamping.
- Added `apps/chain` as an independent app using the same shared realtime client.
- Updated the main site to resolve game URLs from `NEXT_PUBLIC_CHAIN_URL` and
  `NEXT_PUBLIC_SKRIBBL_URL`, with Vercel defaults in
  `apps/web/lib/game-urls.ts`.
- Kept `@yaply/shared` as the single source of protocol truth so the two game
  apps cannot drift apart.

## Realtime integration

Both apps connect through `@yaply/shared`:

- `useGameRoom` owns the socket, reconnect token, snapshot, status, and errors.
- `GameSocket` reconnects with capped exponential backoff and validates every
  server message with Zod.
- Room URLs are `/room/:code?game=skribbl` or `/room/:code?game=chain`.
- The Worker routes to a Durable Object id of `${game}:${code}`, so Skribbl and
  Chain rooms are isolated even when codes match.
- `POST /rooms` can allocate a server-checked code. The apps currently generate
  codes client-side with `crypto.getRandomValues`; `ROOM_EXISTS` on the server is
  the final collision guard.

The realtime backend also enforces protocol versioning, origin allowlists,
membership gating, host-only actions, per-socket rate limits, frame-size limits,
reconnect grace, and room expiry. See `ARCHITECTURE_CHAIN_SKRIBBL.md`.

## Environment variables

### `apps/web`

```env
NEXT_PUBLIC_CHAIN_URL=https://yaply-chain.vercel.app
NEXT_PUBLIC_SKRIBBL_URL=https://yaply-skribbl.vercel.app
```

### `apps/skribbl` and `apps/chain`

```env
NEXT_PUBLIC_REALTIME_URL=wss://yaply-realtime.<account>.workers.dev/room
NEXT_PUBLIC_MAIN_URL=https://yaply-web.vercel.app
```

Local development can omit `NEXT_PUBLIC_REALTIME_URL`; the client falls back to
`ws://localhost:8787/room`.

### `apps/realtime`

Configured in `apps/realtime/wrangler.toml`:

```toml
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://yaply-web.vercel.app,https://yaply-skribbl.vercel.app,https://yaply-chain.vercel.app"
```

`ALLOWED_ORIGINS` is fail-closed in production. `APP_ORIGIN` is still read for
backward compatibility but is no longer the recommended setting. No secrets
belong in any `NEXT_PUBLIC_*` variable.

## Tests and builds

Verified from the repository root:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Pass (all workspaces) |
| `npm test` | Pass: web 7, skribbl 8, chain 9, realtime 67 |
| `npm run build` | Pass: web, skribbl, chain |
| `npm run check:worker --workspace=@yaply/realtime` | Pass (Wrangler dry run) |
| `wrangler deploy --dry-run --env production` | Pass |
| Local Worker smoke test | Pass: health, `/version`, `POST /rooms`, WebSocket create/snapshot |
| Two-client authoritative smoke test | Pass: non-host start rejected, host start reaches `playing` |

The Skribbl and Chain config tests cover room-code generation/normalisation,
invite paths, and numeric settings clamping. That suite caught a real bug where
missing query parameters were clamped to the minimum instead of using defaults;
the helper was fixed in both apps.

## Deployment notes

See `DEPLOYMENT.md` for exact Vercel project settings, Worker deploy commands,
origin configuration, and the pre-launch checklist.

## Remaining follow-ups

- Add a small spectator mode if product requirements call for it.
- Add end-to-end browser tests for drawing/guessing and Chain cascades.
- Consider using `POST /rooms` from both create pages to avoid the client-side
  fallback path entirely.
- `apps/skribbl/lib/game-transport.ts` is an older standalone transport that is
  no longer imported by the room UI. It can be removed once confirmed unused.

# Deployment Guide

## What gets deployed

| Piece | Platform | Project / script | URL source |
| --- | --- | --- | --- |
| Main site | Vercel Hobby | `apps/web` | `NEXT_PUBLIC_MAIN_URL` in `yaply-web` |
| Skribbl | Vercel Hobby | `apps/skribbl` | `NEXT_PUBLIC_SKRIBBL_URL` |
| Chain Reaction | Vercel Hobby | `apps/chain` | `NEXT_PUBLIC_CHAIN_URL` |
| Smash Karts | Vercel Hobby | `apps/smashkarts` | `NEXT_PUBLIC_SMASHKARTS_URL` |
| Hole.io | Vercel Hobby | `apps/holeio` | `NEXT_PUBLIC_HOLEIO_URL` |
| Realtime | Cloudflare Workers + Durable Objects | `apps/realtime` | `NEXT_PUBLIC_REALTIME_URL` in each game |

Frontend deployment URLs come from the environment. The only committed
deployment origins are the Worker's CORS allowlist in
`apps/realtime/wrangler.toml`; update that list when the frontend domains change.
The current deployments use their `*.vercel.app` project domains; custom domains
only need to be added to the same variables later.

Everything below fits the free tiers: Vercel Hobby, Cloudflare Workers Free, and
SQLite-backed Durable Objects. No paid database, Redis, VPS, or broker is needed.

## Prerequisites

- Node.js 22+ and npm 10+
- A Cloudflare account with Workers enabled
- Five Vercel projects (Hobby plan is sufficient)
- `npx wrangler login` completed locally before deploying the Worker

## Install and verify

Run every command from the repository root unless noted.

```bash
npm install
npm run typecheck
npm test
npm run build
```

`npm run build` builds every Next.js app in the workspace. The Worker has no bundling step;
use the dry-run check instead:

```bash
npm run check:worker --workspace=@yaply/realtime
cd apps/realtime && npx wrangler deploy --dry-run --env production
```

## Local development

Terminal 1 — realtime Worker (port 8787):

```bash
npm run dev --workspace=@yaply/realtime
```

Terminal 2 — one or more frontends:

```bash
npm run dev --workspace=@yaply/skribbl     # http://localhost:3001
npm run dev --workspace=@yaply/chain       # http://localhost:3002
npm run dev --workspace=@yaply/smashkarts  # http://localhost:3003
npm run dev --workspace=@yaply/holeio      # http://localhost:3004
npm run dev --workspace=@yaply/web         # http://localhost:3000
```

Local defaults in `apps/realtime/wrangler.toml` allow origins on ports 3000,
3001, 3002, 3003 and 3004. The online game apps fall back to
`ws://localhost:8787/room` when `NEXT_PUBLIC_REALTIME_URL` is unset.

If a game's `.env.local` points at the production Worker, override it for a
local run (process environment wins over `.env.local`):

```bash
NEXT_PUBLIC_REALTIME_URL=ws://localhost:8787/room \
  npm run dev --workspace=@yaply/skribbl
```

Useful Worker endpoints while developing:

```bash
curl http://localhost:8787/
curl http://localhost:8787/health
curl http://localhost:8787/version
curl -X POST http://localhost:8787/rooms \
  -H 'content-type: application/json' \
  -d '{"game":"chain"}'
```

### Browser end-to-end tests

With the Worker on 8787 and the Skribbl and Chain Reaction dev servers running against it:

```bash
npm run test:e2e
```

The Playwright suite creates real rooms through the Worker, completes full
Skribbl and Chain Reaction matches, refreshes a player mid-match, disconnects a
drawer, and checks multi-player state convergence. Override the targets with
`E2E_SKRIBBL_URL` and `E2E_CHAIN_URL` if needed.

### Local load test

```bash
npm run test:load -- --rooms 5
npm run test:load -- --rooms 20 --players 2 --games skribbl,chain
```

The script refuses non-local Worker URLs unless `--allow-remote` is passed. It
creates rooms through `POST /rooms`, joins real WebSockets, starts a game in
each room, measures an authoritative round-trip, and reconnects a sample of
players. Keep levels under the local Worker limits (30 room creations and 60
socket upgrades per client per minute) or leave a minute between runs.

## Environment variables

### `apps/web` (Vercel project settings in production)

```env
NEXT_PUBLIC_MAIN_URL=https://<main-project>.vercel.app
NEXT_PUBLIC_CHAIN_URL=https://<chain-project>.vercel.app
NEXT_PUBLIC_SKRIBBL_URL=https://<skribbl-project>.vercel.app
NEXT_PUBLIC_SMASHKARTS_URL=https://<smash-karts-project>.vercel.app
NEXT_PUBLIC_HOLEIO_URL=https://<holeio-project>.vercel.app
```

`NEXT_PUBLIC_MAIN_URL` is the canonical origin used by the page metadata,
sitemap and `robots.txt`. No production domain is hardcoded in the app; the
variables above are required at build time. Use each project's `*.vercel.app`
domain until a custom domain is attached, then change the variable to that
domain.

### `apps/skribbl`, `apps/chain`, `apps/smashkarts` and `apps/holeio` (Vercel project settings in production)

```env
NEXT_PUBLIC_REALTIME_URL=wss://<realtime-worker-host>/room
NEXT_PUBLIC_MAIN_URL=https://<main-project>.vercel.app
```

For local development use `ws://localhost:8787/room` and
`http://localhost:3000`; see each app's `.env.example`.

Each game also needs the canonical origin of its own deployment so metadata and
relative Open Graph image paths resolve correctly. Set the variable in **both**
the game project and `yaply-web` (there it is the link to the game):

```env
# yaply-skribbl + yaply-web
NEXT_PUBLIC_SKRIBBL_URL=https://<skribbl-project>.vercel.app
# yaply-chain + yaply-web
NEXT_PUBLIC_CHAIN_URL=https://<chain-project>.vercel.app
# yaply-smashkarts + yaply-web
NEXT_PUBLIC_SMASHKARTS_URL=https://<smash-karts-project>.vercel.app
# yaply-holeio + yaply-web
NEXT_PUBLIC_HOLEIO_URL=https://<holeio-project>.vercel.app
```

For local development the URL can be omitted; the apps fall back to their Vercel
system hostname, then to `http://localhost:3001` (Skribbl), `3002` (Chain
Reaction), `3003` (Smash Karts) or `3004` (Hole.io).

All four game apps support online rooms through the Worker: Skribbl, Chain
Reaction, Smash Karts and Hole.io. Hole.io still offers a local “Play with bots”
mode from its menu; online rooms are created with `POST /rooms` and use the same
lobby, chat, rematch and reconnect protocol as the other games.

The browser converts `https://` to `wss://` and appends `/room` if needed, so
both `wss://host/room` and `https://host` are accepted. Prefer the explicit
`wss://.../room` form.

**Important: `NEXT_PUBLIC_*` values are build-time values.** They are inlined
into the client bundle. After changing any of them in Vercel, you must create a
new deployment; editing the variable does not update an existing deployment.

Set each variable in the correct Vercel project:

| Variable | Project |
| --- | --- |
| `NEXT_PUBLIC_CHAIN_URL` | `yaply-web` **and** `yaply-chain` |
| `NEXT_PUBLIC_SKRIBBL_URL` | `yaply-web` **and** `yaply-skribbl` |
| `NEXT_PUBLIC_SMASHKARTS_URL` | `yaply-web` **and** `yaply-smashkarts` |
| `NEXT_PUBLIC_HOLEIO_URL` | `yaply-web` **and** `yaply-holeio` |
| `NEXT_PUBLIC_REALTIME_URL` | `yaply-chain`, `yaply-skribbl`, `yaply-smashkarts` **and** `yaply-holeio` |
| `NEXT_PUBLIC_MAIN_URL` | `yaply-web`, `yaply-chain`, `yaply-skribbl`, `yaply-smashkarts` **and** `yaply-holeio` |

Adding `NEXT_PUBLIC_REALTIME_URL` to the `yaply-web` project does nothing for
the games. Adding `NEXT_PUBLIC_SKRIBBL_URL` or `NEXT_PUBLIC_SMASHKARTS_URL` to
a game project does nothing for the main site.

### Verify which values a deployment actually built

Each app exposes a public, non-secret diagnostic endpoint:

```bash
curl https://<main-project>.vercel.app/api/config
curl https://<chain-project>.vercel.app/api/config
curl https://<skribbl-project>.vercel.app/api/config
curl https://<smash-karts-project>.vercel.app/api/config
curl https://<holeio-project>.vercel.app/api/config
```

`/api/config` returns the effective main-site and game URLs, the source of each
value, and `vercelEnv`. If a value is missing or falls back when you expected
an env value, the variable is missing in that Vercel project or was not present
for the environment (Production/Preview) used by that deployment. If it shows
the new value but the page still uses the old one, redeploy the project.

### If a game link points at the wrong host

1. Check `https://<main-site>/api/config`. If `skribblUrl` (or another game URL)
   is not the origin you expect, that is the value of the corresponding
   `NEXT_PUBLIC_*_URL` variable in the `yaply-web` project. Change it there, then
   redeploy `yaply-web`.
2. If the game URL already points somewhere else but the browser still lands on
   a different host, the redirect is coming from Vercel's domain settings on
   that game project (for example, a `*.vercel.app` domain redirecting to a
   custom domain). Either update the env var or change the primary/redirect
   domain in that Vercel project.
3. Make sure the variable is scoped to **Production** (and Preview if you test
   preview deployments), not only Development.
4. Trigger a fresh deployment with build cache disabled once, to rule out a
   stale cached build.

### `apps/realtime` (`wrangler.toml` vars)

Frontend origins are intentionally kept in `apps/realtime/wrangler.toml` so the
Worker can enforce CORS without depending on the Vercel env vars. Update the
production list whenever a frontend domain changes.

Development (top-level `[vars]`):

```toml
ENVIRONMENT = "development"
ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004"
```

Production (`[env.production.vars]`):

```toml
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://yaplygames.vercel.app,https://yaply-skribbl.vercel.app,https://yaply-chain.vercel.app,https://yaply-smashkarts.vercel.app,https://yaply-holeio.vercel.app"
```

Rules:

- `ALLOWED_ORIGINS` is a comma-separated allowlist with no trailing slashes.
- In production the check is **fail-closed**: requests without an `Origin`
  header, or with an origin not on the list, are rejected. Add every deployed
  frontend origin before deploying; update the list whenever a domain changes.
- `APP_ORIGIN` is still read for backward compatibility, but new deployments
  should use `ALLOWED_ORIGINS` only.
- Never put secrets in these public client variables.

## Deploy the realtime Worker

1. Update the production `ALLOWED_ORIGINS` list in
   `apps/realtime/wrangler.toml` if any frontend domain changed.
2. Log in and deploy:

```bash
cd apps/realtime
npx wrangler login
npm run check:worker          # top-level / development dry run
npm run deploy:prod           # wrangler deploy --env production
```

`npm run deploy` deploys the development environment and is only for testing.

The first deployment creates the SQLite-backed `GameRoom` Durable Object class
through migration `v1`. The migration is already declared for both the default
and production environments; do not edit or renumber it after deployment.
Future schema changes require a new migration tag.

After deployment, verify:

```bash
curl https://<realtime-worker-host>/
curl https://<realtime-worker-host>/health
curl https://<realtime-worker-host>/version
```

`/version` reports `protocolVersion: 1` and `environment: "production"`.
If you attach a custom domain in the Cloudflare dashboard, update
`NEXT_PUBLIC_REALTIME_URL` in the four online game apps.

## Deploy the five Vercel projects

Create five separate Vercel projects from the same repository so each app can
ship independently.

**Project 1 — `yaply-web`**

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yaply/web`
- Environment: `NEXT_PUBLIC_MAIN_URL`, `NEXT_PUBLIC_CHAIN_URL`, `NEXT_PUBLIC_SKRIBBL_URL`, `NEXT_PUBLIC_SMASHKARTS_URL`, `NEXT_PUBLIC_HOLEIO_URL`

**Project 2 — `yaply-skribbl`**

- Root Directory: `apps/skribbl`
- Framework Preset: Next.js
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yaply/skribbl`
- Environment: `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_MAIN_URL`, `NEXT_PUBLIC_SKRIBBL_URL`

**Project 3 — `yaply-chain`**

- Root Directory: `apps/chain`
- Framework Preset: Next.js
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yaply/chain`
- Environment: `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_MAIN_URL`, `NEXT_PUBLIC_CHAIN_URL`

**Project 4 — `yaply-smashkarts`**

- Root Directory: `apps/smashkarts`
- Framework Preset: Next.js
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yaply/smashkarts`
- Environment: `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_MAIN_URL`, `NEXT_PUBLIC_SMASHKARTS_URL`

`NEXT_PUBLIC_SMASHKARTS_URL` must be the public origin of this project
(its `*.vercel.app` domain, or a custom domain once attached). The app uses it
as `metadataBase` for the Open Graph images. The same variable is set on
`yaply-web`, where it is the Smash Karts link.

**Project 5 — `yaply-holeio`**

- Root Directory: `apps/holeio`
- Framework Preset: Next.js
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yaply/holeio`
- Environment: `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_MAIN_URL`, `NEXT_PUBLIC_HOLEIO_URL`

`NEXT_PUBLIC_HOLEIO_URL` is the public origin of this project. Hole.io supports
both a local match against AI holes and online rooms through the shared Worker.
The same variable is set on `yaply-web`, where it is the Hole.io link.

Installing from the repository root is required so npm workspaces can resolve
`@yaply/shared`. If Vercel cannot read files outside the selected Root
Directory, enable the monorepo "include source files outside the Root
Directory" option or set Root Directory to the repository root and adjust the
build command to `npm run build --workspace=@yaply/<app>`.

## DNS and HTTPS

- The current deployments run on their Vercel `*.vercel.app` domains.
- Attach custom domains in each Vercel project whenever you are ready, then set
  the matching `NEXT_PUBLIC_*_URL` values and redeploy.
- Point the realtime hostname at the Worker (workers.dev or a custom route).

All production traffic must use HTTPS/WSS. Update `ALLOWED_ORIGINS` in
`apps/realtime/wrangler.toml` and the Vercel env vars whenever a domain changes,
then redeploy both the Worker and the affected frontend.

## Pre-launch checklist

1. `npm run check` passes (typecheck + all workspace tests).
2. `npm run build` passes for `apps/web`, `apps/skribbl`, `apps/chain`,
   `apps/smashkarts`, and `apps/holeio`.
3. `npm run check:worker --workspace=@yaply/realtime` passes.
4. `npx wrangler deploy --dry-run --env production` passes from `apps/realtime`.
5. Production `ALLOWED_ORIGINS` in `wrangler.toml` contains every deployed frontend origin.
6. `/health` and `/version` respond on the deployed Worker.
7. Two browsers can create/join the same room in every online game (Skribbl,
   Chain Reaction, Smash Karts and Hole.io).
8. A refresh reconnects to the same seat and score.
9. A non-host cannot start the game or change settings.
10. Skribbl guesses, drawing, round transitions, and scores match on both clients.
11. Chain placements, cascades, eliminations, and the winner match on both clients.
12. Hole.io guest movement, swallowed-object state, match end and rematch agree
    with the host; an eaten hole respawns in online rooms.
13. A third client cannot join a full room; an invalid room code shows a clean error.
14. Links from the main site reach all four game deployments, including
    `/games/smash-karts` → the value of `NEXT_PUBLIC_SMASHKARTS_URL`,
    `/games/holeio` → the value of `NEXT_PUBLIC_HOLEIO_URL`, and the old
    `/games/kart-riot` URL redirects to it.
15. `npm run test:e2e` passes against a locally running Worker and both
    frontends (six Playwright tests, including full matches, refresh/reconnect,
    drawer disconnects, and Chain eliminations/surrenders).
16. `npm run test:load -- --rooms 5`, then `--rooms 10`, then `--rooms 20`
    (pausing at least a minute between levels for the per-minute limits) reports
    zero failures locally. Do not run the load test against production without
    an approved maintenance window and `--allow-remote`.
17. Repeat the browser smoke tests against the deployed fronts and Worker after
    deploying the updated code.

## Operational notes

- `POST /rooms` is the only production room-allocation path. The Worker
  generates the code, reserves it in the `${game}:${code}` Durable Object
  before responding, and retries collisions internally. Every online frontend
  calls it before navigating to `/room/[code]`, including Smash Karts and
  Hole.io. Hole.io also keeps a local “Play with bots” mode that never touches
  the Worker.
- A collision during `room.create` (for example, a copied `?host=1` URL opened
  in a second tab) automatically falls back to `room.join`. When a Player
  opens their own invite link in a new tab, they join as a new player instead
  of seeing `ROOM_EXISTS`.
- Rooms are isolated by Durable Object id `${game}:${code}`, so a Chain room and
  a Skribbl room can never share state even with the same code. The same applies
  to Smash Karts and Hole.io rooms.
- Empty rooms expire after 60 seconds; inactive rooms expire after 10 minutes.
  Expiry deletes room storage and pending alarms.
- Per-socket limits: 16 KiB frames, token-bucket message rate, 20 invalid frames
  before disconnect, 32 sockets per room, 8 sockets from one client IP per
  room, and a 30-second join deadline for sockets that never join.
- Worker-level limits: 30 room creations and 60 WebSocket upgrades per client
  per minute. These are per Worker isolate and are a best-effort abuse control;
  Cloudflare account limits remain the final backstop.
- Reconnect tokens are stored in `sessionStorage` per game and room, with a
  `localStorage` recovery copy written when a tab closes or a player leaves.
  The server holds a disconnected or explicitly left seat for 30 seconds, then
  keeps any mid-match Skribbl seat as a reserved departure so the same player
  can rejoin with their score. A brand-new browser or tab does not inherit
  another player's identity while the original tab is still connected.
- Players can join a Skribbl match in any phase. Late joiners start on zero,
  enter the turn order from the next turn, and can guess the current drawing
  round; returning players reclaim their existing seat and score instead.
- Observability: structured JSON logs cover room allocation failures, origin
  rejections, upgrade rate limits, protocol mismatches, reconnect/disconnect
  outcomes, per-client socket caps, room expiry, and Durable Object errors.
  Reconnect tokens are never logged.
- Check Cloudflare Workers/DO/SQLite quotas and Vercel Hobby usage before a large
  public launch. Free-tier limits are sufficient for small friend groups.
- Never commit `.env.local`, `.dev.vars`, Wrangler credentials, or API tokens.

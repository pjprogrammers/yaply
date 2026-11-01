# Deployment Guide

## What gets deployed

| Piece | Platform | Project / script | Default URL |
| --- | --- | --- | --- |
| Main site | Vercel Hobby | `apps/web` | https://yaply-web.vercel.app |
| Skribbl | Vercel Hobby | `apps/skribbl` | https://yaply-skribbl.vercel.app |
| Chain Reaction | Vercel Hobby | `apps/chain` | https://yaply-chain.vercel.app |
| Realtime | Cloudflare Workers + Durable Objects | `apps/realtime` | `https://yaply-realtime-production.yaplygames.workers.dev` |

Final production domains, once DNS is approved:

- Main site: https://yaply.eu.org
- Skribbl: https://skribbl.yaply.eu.org
- Chain Reaction: https://chain.yaply.eu.org

Everything below fits the free tiers: Vercel Hobby, Cloudflare Workers Free, and
SQLite-backed Durable Objects. No paid database, Redis, VPS, or broker is needed.

## Prerequisites

- Node.js 22+ and npm 10+
- A Cloudflare account with Workers enabled
- Three Vercel projects (Hobby plan is sufficient)
- `npx wrangler login` completed locally before deploying the Worker

## Install and verify

Run every command from the repository root unless noted.

```bash
npm install
npm run typecheck
npm test
npm run build
```

`npm run build` builds the three Next.js apps. The Worker has no bundling step;
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
npm run dev --workspace=@yaply/skribbl   # http://localhost:3001
npm run dev --workspace=@yaply/chain     # http://localhost:3002
npm run dev --workspace=@yaply/web       # http://localhost:3000
```

Local defaults in `apps/realtime/wrangler.toml` allow origins on ports 3000,
3001, and 3002. Both game apps fall back to `ws://localhost:8787/room` when
`NEXT_PUBLIC_REALTIME_URL` is unset.

If a game's `.env.local` points at the production Worker, override it for a
local run (process environment wins over `.env.local`):

```bash
NEXT_PUBLIC_REALTIME_URL=ws://localhost:8787/room \
  npm run dev --workspace=@yaply/skribbl
```

Useful Worker endpoints while developing:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/version
curl -X POST http://localhost:8787/rooms \
  -H 'content-type: application/json' \
  -d '{"game":"chain"}'
```

### Browser end-to-end tests

With the Worker on 8787 and both game dev servers running against it:

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
NEXT_PUBLIC_CHAIN_URL=https://yaply-chain.vercel.app
NEXT_PUBLIC_SKRIBBL_URL=https://yaply-skribbl.vercel.app
```

These are also the defaults in `apps/web/lib/game-urls.ts`, so the main site
works without an env file. When the custom domains are live, set:

```env
NEXT_PUBLIC_CHAIN_URL=https://chain.yaply.eu.org
NEXT_PUBLIC_SKRIBBL_URL=https://skribbl.yaply.eu.org
```

### `apps/skribbl` and `apps/chain` (Vercel project settings in production)

```env
NEXT_PUBLIC_REALTIME_URL=wss://yaply-realtime-production.yaplygames.workers.dev/room
NEXT_PUBLIC_MAIN_URL=https://yaply-web.vercel.app
```

For local development the realtime URL can be omitted (it falls back to
`ws://localhost:8787/room`). When the custom domain is live, use
`NEXT_PUBLIC_MAIN_URL=https://yaply.eu.org`.

The browser converts `https://` to `wss://` and appends `/room` if needed, so
both `wss://host/room` and `https://host` are accepted. Prefer the explicit
`wss://.../room` form.

**Important: `NEXT_PUBLIC_*` values are build-time values.** They are inlined
into the client bundle. After changing any of them in Vercel, you must create a
new deployment; editing the variable does not update an existing deployment.

Set each variable in the correct Vercel project:

| Variable | Project |
| --- | --- |
| `NEXT_PUBLIC_CHAIN_URL` | `yaply-web` only |
| `NEXT_PUBLIC_SKRIBBL_URL` | `yaply-web` only |
| `NEXT_PUBLIC_REALTIME_URL` | `yaply-chain` **and** `yaply-skribbl` |
| `NEXT_PUBLIC_MAIN_URL` | `yaply-chain` **and** `yaply-skribbl` |

Adding `NEXT_PUBLIC_REALTIME_URL` to the `yaply-web` project does nothing for
the games. Adding `NEXT_PUBLIC_SKRIBBL_URL` to the Skribbl project does nothing
for the main site.

### Verify which values a deployment actually built

Each app exposes a public, non-secret diagnostic endpoint:

```bash
curl https://yaply-web.vercel.app/api/config
curl https://yaply-chain.vercel.app/api/config
curl https://yaply-skribbl.vercel.app/api/config
```

`/api/config` returns the effective URLs, whether each came from an env var or
the fallback default, and `vercelEnv`. If it shows `"source": "default"` when
you expected an env value, the variable is missing in that Vercel project or was
not present for the environment (Production/Preview) used by that deployment.
If it shows the new value but the page still uses the old one, redeploy the
project.

### If the game link still goes to `skribbl.yaply.eu.org`

1. Check `https://<main-site>/api/config`. If `skribblUrl` is
   `https://skribbl.yaply.eu.org`, that is the value of
   `NEXT_PUBLIC_SKRIBBL_URL` in the `yaply-web` project. Change it there, then
   redeploy `yaply-web`.
2. If `skribblUrl` already points somewhere else but the browser still lands on
   `skribbl.yaply.eu.org`, the redirect is coming from Vercel's domain settings
   on the Skribbl project (for example, `yaply-skribbl.vercel.app` redirecting to
   the custom domain). Either point `NEXT_PUBLIC_SKRIBBL_URL` at the final custom
   domain or change the primary/redirect domain in the Skribbl Vercel project.
3. Make sure the variable is scoped to **Production** (and Preview if you test
   preview deployments), not only Development.
4. Trigger a fresh deployment with build cache disabled once, to rule out a
   stale cached build.

### `apps/realtime` (`wrangler.toml` vars)

Development (top-level `[vars]`):

```toml
ENVIRONMENT = "development"
ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:3001,http://localhost:3002"
```

Production (`[env.production.vars]`):

```toml
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://yaply.eu.org,https://skribbl.yaply.eu.org,https://chain.yaply.eu.org,https://yaply-web.vercel.app,https://yaply-skribbl.vercel.app,https://yaply-chain.vercel.app"
```

Rules:

- `ALLOWED_ORIGINS` is a comma-separated allowlist with no trailing slashes.
- In production the check is **fail-closed**: requests without an `Origin`
  header, or with an origin not on the list, are rejected. Add every deployed
  frontend origin, including custom domains, before deploying. The values above
  cover both the canonical `yaply.eu.org` domains and the Vercel project
  domains; remove any that you do not actually deploy.
- `APP_ORIGIN` is still read for backward compatibility, but new deployments
  should use `ALLOWED_ORIGINS` only.
- Never put secrets in these public client variables.

## Deploy the realtime Worker

1. Edit `apps/realtime/wrangler.toml` and replace the production
   `ALLOWED_ORIGINS` value with the exact origins you are deploying.
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
curl https://yaply-realtime-production.yaplygames.workers.dev/health
curl https://yaply-realtime-production.yaplygames.workers.dev/version
```

`/version` reports `protocolVersion: 1` and `environment: "production"`.
Optionally attach a custom domain (for example `realtime.yaply.eu.org`) in the
Cloudflare dashboard, then update `NEXT_PUBLIC_REALTIME_URL` in both game apps.

## Deploy the three Vercel projects

Create three separate Vercel projects from the same repository so each app can
ship independently.

**Project 1 — `yaply-web`**

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yaply/web`
- Environment: `NEXT_PUBLIC_CHAIN_URL`, `NEXT_PUBLIC_SKRIBBL_URL`

**Project 2 — `yaply-skribbl`**

- Root Directory: `apps/skribbl`
- Framework Preset: Next.js
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yaply/skribbl`
- Environment: `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_MAIN_URL`

**Project 3 — `yaply-chain`**

- Root Directory: `apps/chain`
- Framework Preset: Next.js
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build --workspace=@yaply/chain`
- Environment: `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_MAIN_URL`

Installing from the repository root is required so npm workspaces can resolve
`@yaply/shared`. If Vercel cannot read files outside the selected Root
Directory, enable the monorepo "include source files outside the Root
Directory" option or set Root Directory to the repository root and adjust the
build command to `npm run build --workspace=@yaply/<app>`.

## DNS and HTTPS

- Point `yaply.eu.org` at the main Vercel project.
- Point `skribbl.yaply.eu.org` at the Skribbl project.
- Point `chain.yaply.eu.org` at the Chain Reaction project.
- Point the realtime hostname at the Worker (workers.dev or a custom route).

All production traffic must use HTTPS/WSS. Update `ALLOWED_ORIGINS` and the
Vercel env vars whenever a domain changes, then redeploy both the Worker and the
affected frontend.

## Pre-launch checklist

1. `npm run check` passes (typecheck + all workspace tests).
2. `npm run build` passes for `apps/web`, `apps/skribbl`, and `apps/chain`.
3. `npm run check:worker --workspace=@yaply/realtime` passes.
4. `npx wrangler deploy --dry-run --env production` passes from `apps/realtime`.
5. Production `ALLOWED_ORIGINS` contains every deployed frontend origin.
6. `/health` and `/version` respond on the deployed Worker.
7. Two browsers can create/join the same room in both games.
8. A refresh reconnects to the same seat and score.
9. A non-host cannot start the game or change settings.
10. Skribbl guesses, drawing, round transitions, and scores match on both clients.
11. Chain placements, cascades, eliminations, and the winner match on both clients.
12. A third client cannot join a full room; an invalid room code shows a clean error.
13. Links from the main site reach both game deployments.
14. Repeat steps 7–13 after switching to the custom domains.
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
  before responding, and retries collisions internally. Both game frontends
  call it before navigating to `/room/[code]`.
- A collision during `room.create` (for example, a copied `?host=1` URL opened
  in a second tab) automatically falls back to `room.join`. When a Player
  opens their own invite link in a new tab, they join as a new player instead
  of seeing `ROOM_EXISTS`.
- Rooms are isolated by Durable Object id `${game}:${code}`, so a Chain room and
  a Skribbl room can never share state even with the same code.
- Empty rooms expire after 60 seconds; inactive rooms expire after 10 minutes.
  Expiry deletes room storage and pending alarms.
- Per-socket limits: 16 KiB frames, token-bucket message rate, 20 invalid frames
  before disconnect, 32 sockets per room, 8 sockets from one client IP per
  room, and a 30-second join deadline for sockets that never join.
- Worker-level limits: 30 room creations and 60 WebSocket upgrades per client
  per minute. These are per Worker isolate and are a best-effort abuse control;
  Cloudflare account limits remain the final backstop.
- Reconnect tokens are stored in `sessionStorage` per game and room. The server
  holds a disconnected seat for 30 seconds. A brand-new browser or tab does not
  inherit another player's identity.
- Observability: structured JSON logs cover room allocation failures, origin
  rejections, upgrade rate limits, protocol mismatches, reconnect/disconnect
  outcomes, per-client socket caps, room expiry, and Durable Object errors.
  Reconnect tokens are never logged.
- Check Cloudflare Workers/DO/SQLite quotas and Vercel Hobby usage before a large
  public launch. Free-tier limits are sufficient for small friend groups.
- Never commit `.env.local`, `.dev.vars`, Wrangler credentials, or API tokens.

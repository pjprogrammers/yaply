# Yaply: chain.yaply.eu.org + skribbl.yaply.eu.org

## Monorepo structure
- apps/chain (Next.js) - Chain Reaction frontend, deploy to chain.yaply.eu.org
- apps/skribbl (Next.js) - Skribbl frontend, deploy to skribbl.yaply.eu.org  
- apps/web (Next.js) - Main hub
- apps/realtime (Cloudflare Worker + Durable Objects) - Shared multiplayer backend
- packages/shared, packages/game-core, packages/ui - Shared code

## Shared backend
Single Worker serves both games via room isolation. Each room instance managed by Durable Objects with game-specific engines (games/chain/*, games/skribbl/*). WebSocket auth/validation server-side.

## Deployment (Vercel - free Hobby)
Create two separate Vercel projects from same GitHub repo:
1. Project "yaply-chain": Root Directory = apps/chain, Domain = chain.yaply.eu.org
2. Project "yaply-skribbl": Root Directory = apps/skribbl, Domain = skribbl.yaply.eu.org
Install from repo root to resolve workspace packages. Use NEXT_PUBLIC_REALTIME_URL pointing to Worker/WSS endpoint.

## Free tier notes
- Vercel Hobby: personal/non-commercial use; usage limits apply; no card required for hobby if eligible
- Cloudflare Workers Free: request/DO/SQLite quotas apply
- Supabase Free optional
Design for quota limits; validate payment terms on account before enabling paid features.

## Environment variables
- apps/chain/.env.example, apps/skribbl/.env.example (NEXT_PUBLIC_REALTIME_URL)
- apps/realtime uses wrangler vars (APP_ORIGIN)

## Tests/builds
All apps typecheck and build successfully. Tests pass.

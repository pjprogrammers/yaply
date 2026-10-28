# Deployment Guide

## Domains
- Main website: https://yaply.eu.org (apps/web)
- Skribbl app: https://skribbl.yaply.eu.org (apps/skribbl)
- Realtime backend: Cloudflare Worker (apps/realtime)

## Repository
- Monorepo root: repository root
- Workspaces: apps/*, packages/*

## Build & Install
```bash
npm install
```

## Environment Variables

### apps/web (.env.production)
```env
NEXT_PUBLIC_SKRIBBL_URL=https://skribbl.yaply.eu.org
```

### apps/skribbl (.env.production)
```env
NEXT_PUBLIC_REALTIME_URL=wss://<your-realtime-worker-domain>/room
# For local dev: ws://localhost:8787/room
```

### apps/realtime (wrangler vars/secrets)
```toml
[vars]
APP_ORIGIN = "https://yaply.eu.org"
# Add https://skribbl.yaply.eu.org as allowed origin if enforcing CORS/origin checks
```

## Hosting Recommendations

### Vercel / Netlify / similar
Deploy two separate projects from the same repo:

**Project 1: yaply.eu.org (main site)**
- Root Directory: `apps/web`
- Build Command: `npm run build` (or `cd ../.. && npm run build --workspace=@yaply/web`)
- Install Command: `npm install` from repo root (recommended so workspaces resolve)
- Output: Next.js (default)

**Project 2: skribbl.yaply.eu.org**
- Root Directory: `apps/skribbl`
- Build Command: `npm run build`
- Install Command: `npm install` from repo root
- Output: Next.js (default)

**Important:** Do not set root to only `apps/skribbl` in a way that breaks workspace resolution of `@yaply/shared`. Install from repo root.

### Cloudflare Pages
Use separate Pages projects with the same root directory approach.

### Realtime (Cloudflare Workers)
```bash
cd apps/realtime
npx wrangler deploy
```
Configure routes/origins. Update APP_ORIGIN and add allowed origins for both domains.

## DNS
- Point yaply.eu.org to the main web app
- Point skribbl.yaply.eu.org to the Skribbl app
- Point/reach realtime worker via its workers.dev domain or custom route

## HTTPS
Use HTTPS/WSS in production. Both apps must use secure WebSocket URLs.

## Testing Before Going Live
1. Build both apps: `npm run build` from root or per app
2. Test locally with different ports
3. Verify main site links to Skribbl URL
4. Verify Skribbl connects to realtime backend
5. Test multi-client room flow

## CORS/Auth Notes
- WebSocket auth/authorization remains server-side in Durable Objects
- Validate origins on the Worker if needed; do not weaken checks for production
- No secrets in client code

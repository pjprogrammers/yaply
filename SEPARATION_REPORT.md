# Skribbl Separation Report

## Phase 1: Audit (completed)
- Repo inspected (monorepo with npm workspaces: apps/*, packages/*)
- Skribbl routes in apps/web/app/games/skribbl (create, room/[code]) identified
- Shared: packages/shared used by both apps/realtime and apps/web
- Transport: apps/web/lib/game-transport.ts (WebSocketGameTransport)
- Realtime: apps/realtime uses Durable Objects (GameRoom), shared protocol via @yaply/shared
- Pre-separation: typecheck/builds for existing apps verified

## Phase 2-6: Changes
Created apps/skribbl as independent Next.js app (routes: /, /create, /room/[code]), copied Skribbl UI/transport/shared imports. Removed apps/web/app/games/skribbl. Updated main site to link Skribbl to configurable NEXT_PUBLIC_SKRIBBL_URL (default https://skribbl.yaply.eu.org). Added .env.example files and DEPLOYMENT.md.

## Files created
- apps/skribbl/* (package.json, tsconfig, next.config, postcss/tailwind, app/*, lib/game-transport.ts, .env.example, __tests__/sanity.test.ts)

## Files moved/modified
- Moved: apps/web/app/games/skribbl/* -> apps/skribbl/app/*
- Copied: apps/web/lib/game-transport.ts -> apps/skribbl/lib/game-transport.ts
- Modified: apps/web/app/page.tsx, apps/web/components/home/HomePage.tsx, apps/web/components/home/GameCard.tsx
- Deleted: apps/web/app/games/skribbl/

## Directory structure (key)
```
apps/
  web/        (main site)
  skribbl/    (separate Skribbl app)
  realtime/   (shared backend)
packages/shared/
supabase/migrations/
```

## Commands executed
- npm install (root), npm install in apps/skribbl
- npm run typecheck (all workspaces)
- npm run build (root/workspaces)
- npx next build in apps/web and apps/skribbl
- vitest run in apps/web, apps/skribbl, apps/realtime

## Tests/Builds
- Typecheck: all pass
- apps/web build: success
- apps/skribbl build: success  
- apps/realtime typecheck: success
- Tests: apps/web (3 passed), apps/skribbl (1 passed), apps/realtime (1 passed)

## Environment variables required
- apps/web: NEXT_PUBLIC_SKRIBBL_URL
- apps/skribbl: NEXT_PUBLIC_REALTIME_URL
- apps/realtime: APP_ORIGIN (and allowed origins)

## Deployment notes
See DEPLOYMENT.md for exact settings per platform.

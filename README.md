# Yaply

A mobile-first multiplayer drawing and guessing game (Skribbl.io style).

## Architecture
- **Monorepo**: apps/web (Next.js), apps/realtime (Cloudflare Workers + Durable Objects), packages/shared
- **Real-time**: Authoritative game state in Durable Objects with WebSocket
- **Persistence**: Supabase (auth, profiles, match history)
- **Drawing**: HTML Canvas with normalized coordinates

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
npm install
```

### Run locally
```bash
# Start realtime worker (requires wrangler login)
cd apps/realtime && npx wrangler dev

# Start web app
cd apps/web && npm run dev
```

### Build
```bash
npm run build
```

## Documentation
- See `implementation.md` for detailed implementation plan
- See `theme.md` for design system
- See the blueprint in the problem description for full specifications





## Copyright & License

**Copyright © 2026 Jashan Singla. All Rights Reserved.**

Yaply is proprietary software developed independently.

The original source code, project-specific implementations,
designs, branding and documentation are protected by
applicable intellectual property laws.

Public availability of this repository does not grant
a general license to copy, modify, redistribute,
republish or commercially exploit its proprietary
materials.

Third-party dependencies and externally licensed assets
remain subject to their respective licenses.

See the [LICENSE](./LICENSE) file for complete terms.

For licensing or commercial inquiries, contact
the copyright owner through GitHub.

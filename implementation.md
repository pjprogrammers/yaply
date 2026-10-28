# YAPLY IMPLEMENTATION PLAN

> This document follows the exact blueprint provided. Implementation will be done incrementally phase by phase.

## Overview
Yaply is a mobile-first Skribbl.io-style multiplayer drawing and guessing game. We're building it as a production-minded system with authoritative server logic, real-time multiplayer, and designed for free-tier hosting.

## Current State
The repo currently has a simple Express + Socket.IO setup (Cipher Draw clone) in `/client` and `/server`. We need to migrate/rebuild to the architecture specified in the blueprint.

## Target Architecture
- **Monorepo**: `apps/web` (Next.js), `apps/realtime` (Cloudflare Workers + Durable Objects), `packages/shared` (types/protocol)
- **Real-time**: WebSocket with authoritative room state in Durable Objects
- **Persistence**: Supabase for auth/profiles/match history
- **Drawing**: HTML Canvas with normalized coordinates, batched strokes
- **Transport**: Abstract GameTransport interface to support online + future WebRTC

## Implementation Phases

### Phase 1: Repository Structure & Foundation
- [ ] Setup monorepo with pnpm workspaces
- [ ] Create `packages/shared` with types, events, constants, schemas
- [ ] Create `apps/web` (Next.js 15 App Router, TypeScript, Tailwind)
- [ ] Create `apps/realtime` (Cloudflare Workers + Durable Objects)
- [ ] Configure wrangler.toml
- [ ] Setup shared protocol types
- [ ] Basic health checks
- [ ] TypeScript configs

### Phase 2: Room Lifecycle & Sessions
- [ ] Room creation with cryptographically secure codes
- [ ] Room joining/leaving
- [ ] Player sessions with resume tokens
- [ ] Host assignment/transfer
- [ ] Player capacity limits
- [ ] Room snapshots
- [ ] Disconnection/reconnection logic
- [ ] Room expiry

### Phase 3: Authoritative Game Engine
- [ ] State machine (lobby → choosing → drawing → round-result → game-over)
- [ ] Word list (server-side only)
- [ ] Drawer rotation
- [ ] Word selection (only drawer sees choices/answer)
- [ ] Timer with absolute deadlines
- [ ] Guess validation & normalization
- [ ] Server-side scoring
- [ ] Duplicate guess prevention
- [ ] Round progression
- [ ] Rematch

### Phase 4: Drawing Synchronization
- [ ] Pointer Events (mouse/touch/stylus)
- [ ] Normalized coordinates (0-1)
- [ ] Canvas with DPR handling
- [ ] Stroke batching (30-50ms intervals)
- [ ] Stroke validation (color/width/points/count)
- [ ] Bounded drawing history
- [ ] Undo/clear
- [ ] Late join replay
- [ ] Rate limiting

### Phase 5: Chat, Hints & Results
- [ ] Guess chat with server validation
- [ ] Correct guess announcements
- [ ] Progressive hints
- [ ] Word masking
- [ ] Round results
- [ ] Final scoreboard
- [ ] Rematch flow

### Phase 6: Mobile-First UI
- [ ] Home/game discovery
- [ ] Create/join room
- [ ] Waiting lobby
- [ ] Drawing interface with toolbar
- [ ] Chat panel
- [ ] Game timer
- [ ] Round/game results
- [ ] Connection status/reconnect UI
- [ ] Responsive design, touch targets, safe areas

### Phase 7: Persistence (Supabase)
- [ ] Supabase Auth integration
- [ ] Database schema & migrations
- [ ] RLS policies
- [ ] Profile management
- [ ] Match history persistence (idempotent)
- [ ] Leaderboard
- [ ] Guest vs authenticated users

### Phase 8: Security, Testing & Reliability
- [ ] Runtime schema validation (Zod)
- [ ] Rate limiting
- [ ] Origin validation
- [ ] Input sanitization
- [ ] Stale timer protection
- [ ] Duplicate scoring prevention
- [ ] Vitest unit tests for game engine
- [ ] Playwright multiplayer tests
- [ ] Error handling & quota management

### Phase 9: Experimental (Later)
- [ ] WebRTC transport adapter
- [ ] Local WiFi play
- [ ] Connection diagnostics

## Key Constraints
- **Server authoritative**: All game logic, scoring, validation on server
- **Answer secrecy**: Word answer never sent to guessers
- **No DB writes per draw**: Batch in memory, persist only match summaries
- **Free tier aware**: Bounded history, hibernation, rate limits
- **Mobile first**: Touch optimized, portrait-first
- **TypeScript throughout**: Shared types prevent drift

## File Structure (Target)
```
yaply/
├── apps/
│   ├── web/          # Next.js app
│   └── realtime/     # Cloudflare Worker
├── packages/
│   └── shared/       # Shared types/events/constants/schemas
├── supabase/
│   └── migrations/
└── AGENTS.md         # Already have implementation prompt
```

## Current vs Target
Current is a simple working prototype. Target is the full production architecture from blueprint. We'll build incrementally starting fresh structure while preserving learnings from current implementation.

## Next Steps
Start with Phase 1 - setting up monorepo structure.

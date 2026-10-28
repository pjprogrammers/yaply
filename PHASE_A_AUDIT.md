# Phase A: Repository Audit

## Repository structure
- Root: yaply (monorepo via npm workspaces)
- apps/web: Next.js 15 (app router), React 19 RC, Tailwind, TypeScript
- apps/realtime: Cloudflare Workers + Durable Objects, TypeScript, Vitest
- packages/shared: Shared types/events/constants/schemas (Zod)
- supabase/: migrations directory exists
- client/, server/: Legacy Express+Socket.IO prototype (present but separate)
- node_modules installed after npm install

## Current state
### Shared protocol (packages/shared)
- types.ts: GamePhase, Player, Stroke, RoomSnapshot, etc. (implemented)
- events.ts: ClientEvent/ServerEvent unions (implemented)
- schemas.ts: Zod validation for ClientEvent (implemented) 
- constants.ts: exists
- Good separation, runtime validation with Zod on server

### Realtime (apps/realtime)
- Durable Object GameRoom implementation in Room.ts (authoritative state machine)
- Supports room.create/join/start, word choose, drawing.stroke/clear, chat.guess, room.sync
- Timer logic with setTimeout (simple, needs race condition hardening)
- Scoring functions referenced (scoring.ts exists)
- WebSocket transport via Durable Objects
- Routing in index.ts maps /room/:code to Durable Object
- answer secrecy: drawer gets choices via private message; snapshot masks word only when phase is drawing and word selected (maskWord used). Correct guesses broadcast separately. Need to audit carefully.
- Issues: when player leaves (close), marks disconnected and broadcasts left + snapshot; reconnection logic not fully implemented (resumeToken mentioned in events/schema but not handled in Room code). Room expiry not implemented. Timer uses setTimeout that may fire across rounds - needs guards.
- Word list in words.ts/words-util.ts

### Web (apps/web)
- Current homepage is minimal (create/join quick UI for skribbl only) - very different from blueprint
- Has /games/skribbl/create and /games/skribbl/room/[code] routes
- Has game-transport.ts (WebSocketGameTransport) - basic
- Uses theme.md guidance but current UI doesn't follow full design system
- Layout minimal, globals.css has basic vars
- No game registry, no other game routes

### Legacy (client/server)
- Old Cipher Draw clone present - not part of new arch, separate

## Build/typecheck status
- Ran `npm install` (fixed missing node_modules deps like typescript)
- `npm run typecheck` currently fails in all workspaces? Let us look up the actual failure again. Earlier it showed tsc help output which suggests tsc ran but maybe with issues or config issues. Or perhaps the command failed because of how workspaces run. Need to check properly.

## Issues found
- Missing tsconfig.json in packages/shared? Checked earlier - apps have tsconfig.json, packages/shared has no tsconfig.json visible? Wait look: in packages/shared we saw package.json, src/ files. Let us check again. Also shared exports point to src/*.ts files directly.
- apps/web uses React 19 RC with Next 15 - can be finicky
- Room.ts has some issues: handleCreate sets hostId but doesn't check if room already exists? Durable Object instance is per room code - but same code reused? Also generateRoomCode in initState but when creating new room, maybe code should be settable? Or flow is create via DO fetch then clients connect and send room.create. Also in handleCreate it sets hostId and adds player - but room might need to be initialized differently.
- Scoring/timer races need hardening
- No reconnection/resume logic implemented
- No authentication integration visible
- Tests: apps/realtime has vitest in deps but no test files visible
- No game registry for 5 games
- Homepage needs complete redesign per blueprint
- No routes for whos-the-spy, chain-reaction, ludo, smash-karts
- Answer secrecy needs verification

## Pre-existing state
Need to actually run typecheck properly and builds. Let us test.

# Yaply Architecture: Main Site, Chain Reaction, Skribbl, and Realtime

## Monorepo layout

```
apps/
  web/        Next.js main hub and game directory
  skribbl/    Next.js Skribbl client
  chain/      Next.js Chain Reaction client
  realtime/   Cloudflare Worker + SQLite Durable Object backend
packages/
  shared/     Protocol types, Zod schemas, WebSocket client, React hooks, config
  game-core/  Pure game logic helpers
  ui/         Shared UI primitives
```

The two game frontends are independent Vercel projects. They share the protocol
and transport code in `@yaply/shared`, but not runtime state.

## Runtime topology

```
Browser (apps/skribbl or apps/chain)
  │  WebSocket: /room/:code?game=<skribbl|chain>
  ▼
Cloudflare Worker (apps/realtime/src/index.ts)
  │  validates origin, method, game, room-code shape
  │  Durable Object id = `${game}:${code}`
  ▼
GameRoom Durable Object (apps/realtime/src/Room.ts)
  │  authoritative room state, timers, membership, scoring
  │  SQLite storage for snapshots; alarms for deadlines/expiry
  ▼
Server events (room.snapshot, game.finished, ...)
```

A single Worker serves both games. Room identity includes the game kind, so a
Chain room `abc123` and a Skribbl room `abc123` are different Durable Objects
and cannot leak state into each other.

### HTTP endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe |
| `GET` | `/version` | Service name, protocol version, environment |
| `POST` | `/rooms` | Allocate an unused room code for a game |
| `GET` (Upgrade) | `/room/:code?game=...` | WebSocket room connection |

Each Next.js app also exposes `GET /api/config`, a public non-secret diagnostic
that reports the effective `NEXT_PUBLIC_*` URLs and whether they came from an
env var or the fallback. It is useful after a Vercel deployment because
`NEXT_PUBLIC_*` values are baked into the build.

`POST /rooms` is rate-limited per client IP and asks the Durable Object namespace
whether a candidate code already exists before returning it. Clients may also
generate a code locally with `crypto.getRandomValues`; the server's `ROOM_EXISTS`
response is the final collision guard.

## Protocol

The protocol is versioned (`PROTOCOL_VERSION = 1`). `room.create` and
`room.join` must include `protocolVersion`; a mismatch is rejected with
`PROTOCOL_MISMATCH` and the socket is closed.

Client messages are validated with strict Zod schemas that reject unknown keys.
The browser validates every server message against `ServerEventSchema` before
dispatching it, so a malformed or unexpected frame cannot corrupt UI state.

Key client events:

- `room.create`, `room.join`, `room.leave`, `room.sync`
- `room.start`, `room.settings.update`, `game.rematch`
- Skribbl: `game.word.choose`, `drawing.stroke`, `drawing.undo`,
  `drawing.clear`, `chat.guess`
- Chain: `chain.place`, `chain.surrender`

Key server events:

- `room.welcome` (player id + resume token), `room.snapshot`, `room.error`,
  `room.closed`
- `room.player.joined`, `room.player.left`
- Skribbl: `game.word.choices`, `game.word.selected`, `game.word.hint`,
  `drawing.*`, `chat.message`, `game.correct-guess`, `game.round.ended`
- Chain: `chain.move`, `chain.turn.timeout`
- `game.finished` (rankings + winner)

`RoomSnapshot` is the only full-state payload. It exposes `maskedWord`, never
the secret word; only the current drawer receives `game.word.selected` privately.
Scores, winners, turn ownership, boards, and secret words are produced by the
server and are never accepted from clients.

## Authoritative room state

`GameRoom` stores the complete room state in its Durable Object storage:

- room code, game kind, phase, host id, settings, version
- players (id, nickname, avatar, colour, score, connection, guess state)
- round/turn counters and deadlines
- Skribbl secret word, word choices, revealed hint indices, strokes
- Chain board, turn player, eliminated players, winner, move count
- per-player resume tokens and last-seen timestamps

Every state-changing message goes through membership checks first. A socket that
has not completed `room.create` or `room.join` cannot act. Host-only actions
(`room.start`, `room.settings.update`, `game.rematch`) are rejected with
`NOT_HOST` for everyone else. Game actions are rejected outside the correct
phase and for the wrong player.

### Skribbl flow

1. Host starts with at least two players.
2. The server offers word choices to the drawer (`game.word.choices`).
3. The drawer chooses; the server stores the word and sends it only to the
   drawer. Everyone else receives a masked hint.
4. Drawing strokes are validated for colour, width, point count, stroke count,
   and drawer identity before broadcast.
5. Guesses are normalised and compared server-side. Correct guesses award
   points, mark the player, and are not broadcast as chat.
6. The round ends on all-guessed, timeout, or drawer disconnect. The server
   computes rankings and advances to the next drawer/round.
7. After the configured rounds, `game.finished` carries final rankings.

### Chain Reaction flow

1. Host starts with at least two players; the server creates a 6×9 board and
   assigns the first turn.
2. `chain.place` is accepted only from the current player, on an empty or
   owned cell, during the `playing` phase.
3. The engine applies placement, captures, cascades, and eliminations. The
   server broadcasts the resulting move and snapshot.
4. A turn deadline triggers a server-chosen legal move and
   `chain.turn.timeout`; clients cannot extend their own clock.
5. Surrender removes the player's orbs and eliminates them.
6. The last player standing, or the leader when the move cap is reached, wins.
   The server broadcasts `game.finished` with rankings.

## Connection lifecycle and resilience

- A `room.welcome` event returns a per-player resume token. The client stores it
  in `sessionStorage` keyed by game and room.
- On reconnect, the client sends `room.join` with the token. The server restores
  the same seat, score, and connection state.
- A disconnected player keeps their seat for 30 seconds
  (`RECONNECT_GRACE_PERIOD_MS`). In Skribbl, a disconnected drawer ends the round
  after the grace period; in Chain, the turn timer continues.
- Opening the same seat in another tab replaces the old socket with close code
  `4000`; the old client stops reconnecting instead of fighting for the seat.
- The client reconnects with capped exponential backoff and queues up to 100
  outgoing events while offline.

## Expiry and alarms

Durable Object alarms handle every deadline: Skribbl choosing/drawing/round
result, Chain turn timeouts, reconnect grace, and room expiry.

- An empty room (no connected players) expires after 60 seconds.
- A room with no activity at all expires after 10 minutes.
- Expiry deletes stored state and any pending alarm so free-tier storage does
  not accumulate abandoned rooms.

## Security and abuse limits

- Production origin checks are fail-closed through `ALLOWED_ORIGINS`. Localhost
  is accepted only outside production.
- CORS preflight is handled for `POST /rooms`; WebSocket upgrades are checked
  for the `Upgrade` header and a valid game.
- Room codes must match `^[a-z0-9]{6}$`; invalid codes never reach a Durable
  Object.
- Every socket has a token bucket (60 burst, 30 messages/second refill).
- Frames larger than 16 KiB are rejected before parsing.
- 20 invalid frames close the socket; unauthenticated sockets close after 30
  seconds; a room accepts at most 32 sockets.
- Nicknames, chat, strokes, settings, coordinates, and board moves are clamped
  and validated server-side.
- No secret words, resume tokens, or scores are trusted from the client.
- Structured JSON logs record rejected origins, room starts, and protocol
  failures without logging full room codes or secrets.

## Shared package

`packages/shared` contains:

- `types.ts` — protocol and game-state types
- `events.ts` — client/server event unions
- `schemas.ts` — strict Zod validation for both directions
- `client.ts` — reconnecting, validating `GameSocket`
- `react.ts` — `useGameRoom`, `useCountdown`, `useNow`
- `config.ts` — realtime URL resolution, room-code allocation, code generation
- `constants.ts` — protocol version, limits, defaults, board dimensions

Both frontends import only from this package for protocol concerns, which keeps
the two games wire-compatible with one backend.

## Free-tier hosting notes

- **Vercel Hobby** hosts the three Next.js apps. Hobby is for personal,
  non-commercial use and has usage limits.
- **Cloudflare Workers Free** covers Worker requests, Durable Object requests,
  and SQLite-backed DO storage within the free quotas.
- No paid database, Redis, VPS, or message broker is required.
- Realtime traffic is WebSocket-based and state lives in Durable Objects, so
  there is no separate database to operate.
- Review current quota and commercial-use terms before a large public launch.

## Verification

Current checks (run from the repository root):

```bash
npm run typecheck
npm test
npm run build
npm run check:worker --workspace=@yaply/realtime
```

The test suite covers:

- protocol schema strictness and room-code/URL helpers
- Worker routing, origin rejection, CORS, and room-code allocation
- room create/join/reconnect, membership gating, host-only actions, expiry
- Skribbl scoring, guesses, drawing limits, and round transitions
- Chain placement, cascades, elimination, timeout moves, and immutability
- client config helpers for both game apps

## Known limitations

- The Worker uses the ordinary WebSocket lifecycle rather than hibernation;
  alarms handle timers and expiry. This keeps the existing working lifecycle but
  means idle sockets count toward duration while connected.
- Room codes are six characters from a 31-character alphabet. Collisions are
  checked at allocation and again at create time, but the space is finite.
- Spectators are not supported; every socket must join as a player.
- The UI currently supports English only (`language: "en"`).
- Reconnect tokens live in `sessionStorage`, so a new browser session joins as a
  new player.

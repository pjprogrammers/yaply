#!/usr/bin/env node
/**
 * Yaply realtime load test.
 *
 * Creates independent rooms through the Worker, joins real WebSocket clients,
 * starts a game in every room, measures an authoritative round-trip and
 * reconnects a sample of players with their resume token.
 *
 * Local-only by default. Production use requires --allow-remote because room
 * creation and socket upgrades consume real Cloudflare quota.
 *
 * Usage:
 *   node scripts/load-test.mjs --rooms 5
 *   node scripts/load-test.mjs --rooms 20 --players 2 --games skribbl,chain
 */

import WebSocket from "ws";
import { performance } from "node:perf_hooks";
import process from "node:process";

const PROTOCOL_VERSION = 1;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      values[key] = true;
    } else {
      values[key] = next;
      index += 1;
    }
  }
  return values;
}

function numberArg(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function isLocalbase(base) {
  try {
    const hostname = new URL(base).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[Math.max(0, index)];
}

function round(number) {
  return Math.round(number * 10) / 10;
}

function makeCode() {
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function originFor(game, base) {
  if (!isLocalbase(base)) {
    return game === "chain" ? "https://yaply-chain.vercel.app" : "https://yaply-skribbl.vercel.app";
  }
  return game === "chain" ? "http://localhost:3002" : "http://localhost:3001";
}

function socketUrl(base, code, game) {
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/room/${code}`;
  url.search = `?game=${game}`;
  return url.toString();
}

function httpBase(base) {
  const url = new URL(base);
  if (url.protocol === "wss:") url.protocol = "https:";
  if (url.protocol === "ws:") url.protocol = "http:";
  url.pathname = "";
  url.search = "";
  return url.origin;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class LoadClient {
  constructor({ url, origin, nickname, code, game, create, resumeToken }) {
    this.url = url;
    this.origin = origin;
    this.nickname = nickname;
    this.code = code;
    this.game = game;
    this.create = create;
    this.resumeToken = resumeToken ?? null;
    this.playerId = null;
    this.token = null;
    this.snapshot = null;
    this.events = [];
    this.errors = [];
    this.waiters = [];
    this.closed = false;
    this.closeCode = null;
  }

  connect(timeoutMs = 15_000) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      let settled = false;
      this.openedAt = started;

      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve({ ms: performance.now() - started });
      };

      const timer = setTimeout(() => {
        finish(new Error(`${this.nickname} did not join ${this.game}:${this.code} in time`));
        this.close();
      }, timeoutMs);

      const ws = new WebSocket(this.url, {
        origin: this.origin,
        headers: { Origin: this.origin },
      });
      this.ws = ws;

      ws.on("open", () => {
        const base = {
          protocolVersion: PROTOCOL_VERSION,
          game: this.game,
          nickname: this.nickname,
        };
        if (this.resumeToken) {
          this.send({ type: "room.join", ...base, code: this.code, resumeToken: this.resumeToken });
        } else if (this.create) {
          this.send({ type: "room.create", ...base });
        } else {
          this.send({ type: "room.join", ...base, code: this.code });
        }
      });

      ws.on("message", (raw) => {
        let event;
        try {
          event = JSON.parse(raw.toString());
        } catch {
          return;
        }
        event.at = performance.now();
        this.events.push(event);
        if (event.type === "room.welcome") {
          this.playerId = event.playerId;
          this.token = event.resumeToken;
        }
        if (event.type === "room.snapshot") this.snapshot = event.snapshot;
        if (event.type === "room.error") this.errors.push(event);
        this.checkWaiters();
        if (this.playerId && this.snapshot) finish();
      });

      ws.on("error", (error) => {
        if (!settled) finish(error);
      });

      ws.on("close", (code) => {
        this.closed = true;
        this.closeCode = code;
        if (!settled) finish(new Error(`socket closed before joining (${code})`));
      });
    });
  }

  send(event) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  waitFor(predicate, timeoutMs = 15_000, label = "event") {
    const existing = this.events.find(predicate);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((entry) => entry !== waiter);
          reject(new Error(`${this.nickname} timed out waiting for ${label}`));
        }, timeoutMs),
      };
      this.waiters.push(waiter);
    });
  }

  checkWaiters() {
    for (const waiter of [...this.waiters]) {
      const event = this.events.find((entry) => waiter.predicate(entry));
      if (!event) continue;
      clearTimeout(waiter.timer);
      this.waiters = this.waiters.filter((entry) => entry !== waiter);
      waiter.resolve(event);
    }
  }

  close() {
    this.closed = true;
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(`${this.nickname} client closed`));
    }
    this.waiters = [];
    try {
      this.ws?.close();
    } catch {
      // Already closed.
    }
  }
}

async function createRoom(base, game) {
  const started = performance.now();
  const response = await fetch(`${httpBase(base)}/rooms`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Origin: originFor(game, base),
    },
    body: JSON.stringify({ game }),
  });
  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok && typeof payload?.code === "string",
    status: response.status,
    code: payload?.code ?? makeCode(),
    error: response.ok ? null : payload?.error ?? `HTTP ${response.status}`,
    ms: performance.now() - started,
  };
}

function findChainMove(snapshot) {
  if (!snapshot?.chain) return null;
  const turn = snapshot.chain.turnPlayerId;
  if (!turn) return null;
  const index = snapshot.chain.cells.findIndex((cell) => !cell.ownerId);
  if (index < 0) return null;
  return {
    playerId: turn,
    row: Math.floor(index / snapshot.chain.cols),
    col: index % snapshot.chain.cols,
  };
}

async function runRoom({ base, game, index, playersPerRoom, reconnect }) {
  const created = await createRoom(base, game);
  if (!created.ok) {
    return {
      ok: false,
      game,
      code: created.code,
      stage: "create",
      error: created.error,
      createMs: created.ms,
    };
  }

  const clients = [];
  const joinStarted = performance.now();
  try {
    for (let seat = 0; seat < playersPerRoom; seat += 1) {
      const client = new LoadClient({
        url: socketUrl(base, created.code, game),
        origin: originFor(game, base),
        nickname: `load-${index}-${seat}`,
        code: created.code,
        game,
        create: seat === 0,
      });
      await client.connect();
      clients.push(client);
    }
  } catch (error) {
    for (const client of clients) client.close();
    return {
      ok: false,
      game,
      code: created.code,
      stage: "join",
      error: error instanceof Error ? error.message : String(error),
      createMs: created.ms,
    };
  }
  const joinMs = performance.now() - joinStarted;

  let interactionMs = null;
  let interactionError = null;
  try {
    clients[0].send({ type: "room.start" });
    if (game === "chain") {
      await clients[0].waitFor(
        (event) => event.type === "room.snapshot" && event.snapshot.phase === "playing",
        15_000,
        "playing snapshot",
      );
      const move = findChainMove(clients[0].snapshot);
      if (!move) throw new Error("No legal chain move in the initial snapshot");
      const sender = clients.find((client) => client.playerId === move.playerId);
      if (!sender) throw new Error("Turn player is not connected");
      const started = performance.now();
      sender.send({ type: "chain.place", row: move.row, col: move.col });
      const receiver = clients.find((client) => client !== sender);
      await receiver.waitFor((event) => event.type === "chain.move", 15_000, "chain.move");
      interactionMs = performance.now() - started;
    } else {
      const choice = await Promise.any(
        clients.map(async (client) => {
          const event = await client.waitFor(
            (candidate) =>
              candidate.type === "game.word.choices" && candidate.choices.length > 0,
            20_000,
            "word choices",
          );
          return { client, event };
        }),
      );
      const drawerClient = choice.client;
      drawerClient.send({ type: "game.word.choose", wordId: choice.event.choices[0].id });
      await drawerClient.waitFor(
        (event) => event.type === "room.snapshot" && event.snapshot.phase === "drawing",
        15_000,
        "drawing snapshot",
      );
      const guesser = clients.find((client) => client !== drawerClient);
      const started = performance.now();
      guesser.send({ type: "chat.guess", text: "load-test-message" });
      await drawerClient.waitFor(
        (event) => event.type === "chat.message" && event.text === "load-test-message",
        15_000,
        "chat.message",
      );
      interactionMs = performance.now() - started;
    }
  } catch (error) {
    interactionError = error instanceof Error ? error.message : String(error);
  }

  let reconnectMs = null;
  let reconnectError = null;
  if (reconnect && clients.length > 1) {
    const previous = clients[1];
    const token = previous.token;
    const playerId = previous.playerId;
    const nickname = previous.nickname;
    previous.close();
    await delay(250);
    const resumed = new LoadClient({
      url: socketUrl(base, created.code, game),
      origin: originFor(game, base),
      nickname,
      code: created.code,
      game,
      resumeToken: token,
    });
    const started = performance.now();
    try {
      await resumed.connect();
      if (resumed.playerId !== playerId) {
        throw new Error("Reconnect created a different player identity");
      }
      const player = resumed.snapshot?.players.find((entry) => entry.id === playerId);
      if (!player?.connected) throw new Error("Resumed player is not marked connected");
      reconnectMs = performance.now() - started;
    } catch (error) {
      reconnectError = error instanceof Error ? error.message : String(error);
    } finally {
      clients[1] = resumed;
    }
  }

  for (const client of clients) client.close();

  return {
    ok: !interactionError && !reconnectError,
    game,
    code: created.code,
    stage: interactionError ? "interaction" : reconnectError ? "reconnect" : "complete",
    error: interactionError ?? reconnectError,
    createMs: created.ms,
    joinMs,
    interactionMs,
    reconnectMs,
  };
}

async function runLevel({ base, rooms, playersPerRoom, games, reconnectEvery, concurrency }) {
  const results = [];
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= rooms) return;
      const game = games[index % games.length];
      results.push(
        await runRoom({
          base,
          game,
          index,
          playersPerRoom,
          reconnect: reconnectEvery > 0 && index % reconnectEvery === 0,
        }),
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, rooms) }, () => worker()),
  );
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = String(args.base ?? process.env.LOAD_TEST_BASE ?? "http://localhost:8787");
  const rooms = numberArg(args.rooms, 5, 1, 50);
  const players = numberArg(args.players, 2, 2, 8);
  const concurrency = numberArg(args.concurrency, 5, 1, 20);
  const reconnectEvery = numberArg(args["reconnect-every"], 2, 0, 20);
  const games = String(args.games ?? "skribbl,chain")
    .split(",")
    .map((game) => game.trim())
    .filter((game) => game === "skribbl" || game === "chain");
  if (games.length === 0) games.push("skribbl", "chain");

  if (!isLocalbase(base) && args["allow-remote"] !== true) {
    console.error(
      "Refusing to run against a remote Worker. Re-run with --allow-remote only after checking your Cloudflare quota.",
    );
    process.exit(2);
  }

  const estimatedSockets = rooms * players + rooms * (reconnectEvery > 0 ? 1 : 0);
  console.log(
    `Load test: ${rooms} rooms × ${players} players (${games.join(", ")}) against ${base}`,
  );
  console.log(
    `Estimated ${rooms} room creations and ${estimatedSockets} socket upgrades in one run.`,
  );

  const started = performance.now();
  const results = await runLevel({
    base,
    rooms,
    playersPerRoom: players,
    games,
    reconnectEvery,
    concurrency,
  });
  const wallMs = performance.now() - started;

  const successes = results.filter((result) => result.ok);
  const createLatencies = results.map((result) => result.createMs).filter(Number.isFinite);
  const joinLatencies = successes.map((result) => result.joinMs).filter(Number.isFinite);
  const interactionLatencies = successes
    .map((result) => result.interactionMs)
    .filter(Number.isFinite);
  const reconnectLatencies = successes
    .map((result) => result.reconnectMs)
    .filter(Number.isFinite);
  const failures = results.filter((result) => !result.ok);

  const summary = {
    target: base,
    roomsRequested: rooms,
    roomsSucceeded: successes.length,
    playersPerRoom: players,
    games,
    wallMs: round(wallMs),
    roomCreation: {
      successRate: round((successes.length / results.length) * 100),
      p50Ms: round(percentile(createLatencies, 0.5)),
      p95Ms: round(percentile(createLatencies, 0.95)),
      maxMs: round(Math.max(...createLatencies, 0)),
    },
    joins: {
      sessions: successes.length * players,
      p50Ms: round(percentile(joinLatencies, 0.5)),
      p95Ms: round(percentile(joinLatencies, 0.95)),
      maxMs: round(Math.max(...joinLatencies, 0)),
    },
    roundTrips: {
      samples: interactionLatencies.length,
      p50Ms: round(percentile(interactionLatencies, 0.5)),
      p95Ms: round(percentile(interactionLatencies, 0.95)),
      maxMs: round(Math.max(...interactionLatencies, 0)),
    },
    reconnects: {
      samples: reconnectLatencies.length,
      p50Ms: round(percentile(reconnectLatencies, 0.5)),
      p95Ms: round(percentile(reconnectLatencies, 0.95)),
      maxMs: round(Math.max(...reconnectLatencies, 0)),
    },
    failures: failures.map((result) => ({
      game: result.game,
      code: result.code,
      stage: result.stage,
      error: result.error,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

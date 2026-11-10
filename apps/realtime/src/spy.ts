import {
  SPY_CATEGORIES,
  SPY_RECENT_PAIR_LIMIT,
  autoSpyCount,
  maxSpyCount,
} from "@yaply/shared/constants";
import type {
  PlayerId,
  Ranking,
  SpyClue,
  SpyDifficulty,
  SpyElimination,
  SpyResultReason,
  SpyRole,
  SpyTeam,
  SpyVoteRecord,
} from "@yaply/shared/types";
import { SPY_WORD_PAIRS, type SpyWordPair } from "./spy-words";

export type RandomFn = () => number;

export type SpyAssignment = {
  role: SpyRole;
  word: string;
};

export type SpyVote = {
  voterId: PlayerId;
  targetId: PlayerId;
};

/**
 * Server-only Who's the Spy state. The entire object stays in the Durable
 * Object; `createSnapshot` projects the secret-free subset into public state.
 */
export type SpyState = {
  round: number;
  assignments: Record<PlayerId, SpyAssignment>;
  categoryId: string;
  categoryLabel: string;
  pairId: string;
  civilianWord: string;
  spyWord: string;
  spyIds: PlayerId[];
  eliminatedIds: PlayerId[];
  readyIds: PlayerId[];
  turnOrder: PlayerId[];
  speakerIndex: number;
  clues: SpyClue[];
  votes: SpyVote[];
  voteHistory: SpyVoteRecord[];
  tiedIds: PlayerId[];
  revoteUsed: boolean;
  lastElimination: SpyElimination | null;
  finalGuessPlayerId: PlayerId | null;
  finalGuessResult: { playerId: PlayerId; correct: boolean } | null;
  winnerTeam: SpyTeam | null;
  resultReason: SpyResultReason | null;
  scored: boolean;
  recentPairIds: string[];
};

export type SpySelectedPair = {
  pair: SpyWordPair;
  categoryId: string;
  categoryLabel: string;
};

export type SpyVoteTally = {
  eliminatedId: PlayerId | null;
  tiedIds: PlayerId[];
  counts: Record<PlayerId, number>;
};

export type SpyResultPlayer = {
  id: PlayerId;
  nickname: string;
  joinedAt: number;
};

const DEFAULT_CATEGORY_LABEL = "Mixed / Random";

/** Cryptographically secure random float in [0, 1). */
export function secureRandom(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 0x1_0000_0000;
}

export function shuffleWith<T>(items: readonly T[], random: RandomFn = secureRandom): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.floor(random() * (index + 1)));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function categoryLabel(categoryId: string): string {
  return SPY_CATEGORIES.find((category) => category.id === categoryId)?.label ?? DEFAULT_CATEGORY_LABEL;
}

/**
 * Resolves the host's requested spy count. A request of 0 means automatic;
 * any request above the strict-majority ceiling is clamped instead of allowing
 * a game where spies already outnumber civilians at the start.
 */
export function resolveSpyCount(playerCount: number, requested: number): number {
  const automatic = autoSpyCount(playerCount);
  const desired = requested > 0 ? requested : automatic;
  return Math.max(1, Math.min(desired, maxSpyCount(playerCount)));
}

export function spyCountIsValid(playerCount: number, requested: number): boolean {
  return requested <= 0 || requested <= maxSpyCount(playerCount);
}

/**
 * Chooses a pair from the selected categories and difficulty. Recent pair ids
 * are avoided until the eligible pool is exhausted, which keeps a long room
 * from replaying the same joke.
 */
export function selectSpyPair(
  categoryIds: readonly string[],
  difficulty: SpyDifficulty,
  recentPairIds: readonly string[] = [],
  random: RandomFn = secureRandom,
): SpySelectedPair | null {
  const selected = categoryIds.length > 0 ? categoryIds : ["mixed"];
  const useAll = selected.includes("mixed");
  const allowed = new Set(
    useAll
      ? SPY_CATEGORIES.map((category) => category.id)
      : selected.filter((id) => SPY_CATEGORIES.some((category) => category.id === id)),
  );
  if (allowed.size === 0) allowed.add("mixed");

  const eligible = SPY_WORD_PAIRS.filter(
    (pair) => allowed.has(pair.categoryId) && pair.difficulty === difficulty,
  );
  if (eligible.length === 0) return null;

  const recent = new Set(recentPairIds);
  const fresh = eligible.filter((pair) => !recent.has(pair.id));
  const pool = fresh.length > 0 ? fresh : eligible;
  const pair = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  if (!pair) return null;

  return {
    pair,
    categoryId: pair.categoryId,
    categoryLabel: categoryLabel(pair.categoryId),
  };
}

export type CreateSpyStateOptions = {
  playerIds: PlayerId[];
  categoryIds: readonly string[];
  difficulty: SpyDifficulty;
  requestedSpies: number;
  recentPairIds?: readonly string[];
  random?: RandomFn;
};

/** Builds a fresh match. Returns null when no pair matches the settings. */
export function createSpyState({
  playerIds,
  categoryIds,
  difficulty,
  requestedSpies,
  recentPairIds = [],
  random = secureRandom,
}: CreateSpyStateOptions): SpyState | null {
  if (playerIds.length < 3) return null;

  const selected = selectSpyPair(categoryIds, difficulty, recentPairIds, random);
  if (!selected) return null;

  const spyCount = resolveSpyCount(playerIds.length, requestedSpies);
  const spyIds = shuffleWith(playerIds, random).slice(0, spyCount);
  const spySet = new Set(spyIds);
  // Randomly swap the two words so the first word in the bank never signals
  // which team is which.
  const civilianWord = random() < 0.5 ? selected.pair.wordA : selected.pair.wordB;
  const spyWord = civilianWord === selected.pair.wordA ? selected.pair.wordB : selected.pair.wordA;

  const assignments: Record<PlayerId, SpyAssignment> = {};
  for (const playerId of playerIds) {
    assignments[playerId] = {
      role: spySet.has(playerId) ? "spy" : "civilian",
      word: spySet.has(playerId) ? spyWord : civilianWord,
    };
  }

  return {
    round: 1,
    assignments,
    categoryId: selected.categoryId,
    categoryLabel: selected.categoryLabel,
    pairId: selected.pair.id,
    civilianWord,
    spyWord,
    spyIds,
    eliminatedIds: [],
    readyIds: [],
    turnOrder: shuffleWith(playerIds, random),
    speakerIndex: 0,
    clues: [],
    votes: [],
    voteHistory: [],
    tiedIds: [],
    revoteUsed: false,
    lastElimination: null,
    finalGuessPlayerId: null,
    finalGuessResult: null,
    winnerTeam: null,
    resultReason: null,
    scored: false,
    recentPairIds: [selected.pair.id, ...recentPairIds].slice(0, SPY_RECENT_PAIR_LIMIT),
  };
}

export function spyRoleOf(state: SpyState, playerId: PlayerId): SpyRole | null {
  return state.assignments[playerId]?.role ?? null;
}

export function spyWordOf(state: SpyState, playerId: PlayerId): string | null {
  return state.assignments[playerId]?.word ?? null;
}

export function spyAliveIds(state: SpyState, playerIds: readonly PlayerId[]): PlayerId[] {
  const eliminated = new Set(state.eliminatedIds);
  // Only players who received an assignment at match start can act in it. A
  // seat that appears in the room list later (a stale join racing a rematch)
  // must never count as alive or as a voter.
  return playerIds.filter((id) => state.assignments[id] && !eliminated.has(id));
}

export function isSpyAlive(state: SpyState, playerId: PlayerId): boolean {
  return (
    state.assignments[playerId]?.role === "spy" && !state.eliminatedIds.includes(playerId)
  );
}

/** Returns the current clue speaker, skipping any seat that is no longer alive. */
export function activeSpySpeaker(state: SpyState): PlayerId | null {
  return state.turnOrder[state.speakerIndex] ?? null;
}

export function resetSpyClueRound(
  state: SpyState,
  aliveIds: readonly PlayerId[],
  random: RandomFn = secureRandom,
) {
  state.round += 1;
  state.turnOrder = shuffleWith(aliveIds, random);
  state.speakerIndex = 0;
  state.clues = [];
  state.votes = [];
  state.tiedIds = [];
  state.revoteUsed = false;
  state.finalGuessPlayerId = null;
}

export function currentSpyClues(state: SpyState): SpyClue[] {
  return state.clues.filter((clue) => clue.round === state.round);
}

export function hasSpyClue(state: SpyState, playerId: PlayerId): boolean {
  return state.clues.some((clue) => clue.round === state.round && clue.playerId === playerId);
}

export function addSpyClue(
  state: SpyState,
  playerId: PlayerId,
  text: string,
  createdAt: number,
): SpyClue {
  const clue: SpyClue = { playerId, text, round: state.round, createdAt };
  state.clues.push(clue);
  return clue;
}

/**
 * Counts only votes aimed at living players. During a revote `candidates`
 * narrows the ballot to the players who tied the first vote.
 */
export function tallySpyVotes(
  votes: readonly SpyVote[],
  aliveIds: readonly PlayerId[],
  candidates: readonly PlayerId[] = aliveIds,
): SpyVoteTally {
  const alive = new Set(aliveIds);
  const allowed = new Set(candidates);
  const counts: Record<PlayerId, number> = {};
  for (const playerId of alive) {
    if (allowed.has(playerId)) counts[playerId] = 0;
  }
  const seen = new Set<PlayerId>();
  for (const vote of votes) {
    // Duplicate votes are rejected before they reach the tally, but a persisted
    // room from an older build should still count each voter once.
    if (seen.has(vote.voterId)) continue;
    seen.add(vote.voterId);
    if (!alive.has(vote.targetId) || !allowed.has(vote.targetId)) continue;
    counts[vote.targetId] = (counts[vote.targetId] ?? 0) + 1;
  }

  let top = 0;
  for (const value of Object.values(counts)) top = Math.max(top, value);
  if (top === 0) return { eliminatedId: null, tiedIds: [], counts };

  const leaders = Object.entries(counts)
    .filter(([, count]) => count === top)
    .map(([playerId]) => playerId);
  if (leaders.length > 1) return { eliminatedId: null, tiedIds: leaders, counts };
  return { eliminatedId: leaders[0] ?? null, tiedIds: [], counts };
}

/**
 * Applies the two win conditions from the specification. `null` means the
 * match continues.
 */
export function spyWinner(state: SpyState, aliveIds: readonly PlayerId[]): SpyTeam | null {
  const alive = new Set(aliveIds);
  let spies = 0;
  let civilians = 0;
  for (const playerId of alive) {
    const role = state.assignments[playerId]?.role;
    if (role === "spy") spies += 1;
    else if (role === "civilian") civilians += 1;
  }
  if (spies === 0) return "civilians";
  if (spies >= civilians) return "spies";
  return null;
}

/** The most recently eliminated spy, used to address the final-guess prompt. */
export function lastEliminatedSpyId(state: SpyState): PlayerId | null {
  const eliminated = [...state.eliminatedIds].reverse();
  return eliminated.find((id) => state.assignments[id]?.role === "spy") ?? null;
}

export function normalizeWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function compactWord(value: string): string {
  return normalizeWord(value).replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Detects the obvious ways a player might leak a secret word in public chat:
 * writing it normally, stretching it with punctuation/spaces, or spelling it
 * out letter by letter. Short words use token matching only so common
 * substrings ("tea" inside "instead") do not produce false positives.
 */
export function textRevealsWord(text: string, word: string): boolean {
  const normalizedText = normalizeWord(text);
  const normalizedWord = normalizeWord(word);
  if (!normalizedWord) return false;

  const wordTokens = normalizedWord.split(" ").filter(Boolean);
  const textTokens = normalizedText.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  for (let index = 0; index <= textTokens.length - wordTokens.length; index += 1) {
    if (wordTokens.every((token, offset) => textTokens[index + offset] === token)) return true;
  }

  const compact = compactWord(word);
  if (!compact) return false;

  if (compact.length >= 5) {
    if (compactWord(text).includes(compact)) return true;

    const spelled = textTokens.filter((token) => token.length === 1).join("");
    if (spelled.includes(compact)) return true;
  }

  return false;
}

export function textRevealsAnyWord(text: string, words: readonly (string | null)[]): boolean {
  return words.some((word) => (word ? textRevealsWord(text, word) : false));
}

export type SpyScoreInput = {
  state: SpyState;
  players: readonly SpyResultPlayer[];
  winnerTeam: SpyTeam;
};

/**
 * Awards the optional individual score lines from the specification. This is
 * computed once at the result screen so reconnects cannot inflate it.
 */
export function scoreSpyGame({ state, players, winnerTeam }: SpyScoreInput): Ranking[] {
  const scores = new Map<PlayerId, number>();
  for (const player of players) scores.set(player.id, 0);

  const add = (playerId: PlayerId, points: number) => {
    if (!scores.has(playerId)) return;
    scores.set(playerId, (scores.get(playerId) ?? 0) + points);
  };

  for (const vote of state.voteHistory) {
    const voterRole = state.assignments[vote.voterId]?.role;
    const targetRole = state.assignments[vote.targetId]?.role;
    if (voterRole === "civilian" && targetRole === "spy") add(vote.voterId, 100);
  }

  const winningRole: SpyRole = winnerTeam === "civilians" ? "civilian" : "spy";
  for (const player of players) {
    const role = state.assignments[player.id]?.role;
    if (!role) continue;
    if (role === winningRole) add(player.id, 50);
    if (winnerTeam === "spies" && role === "spy" && !state.eliminatedIds.includes(player.id)) {
      add(player.id, 150);
    }
  }

  if (state.finalGuessResult?.correct) add(state.finalGuessResult.playerId, 100);

  return players
    .map((player) => ({
      playerId: player.id,
      nickname: player.nickname,
      score: scores.get(player.id) ?? 0,
      joinedAt: player.joinedAt,
    }))
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .map(({ playerId, nickname, score }) => ({ playerId, nickname, score }));
}

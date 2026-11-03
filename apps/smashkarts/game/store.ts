import type { GameSnapshot, MapId } from "./types";

type Listener = () => void;

export function createInitialSnapshot(mapId: MapId, killTarget: number, muted: boolean): GameSnapshot {
  return {
    phase: "booting",
    mapId,
    playerId: null,
    karts: [],
    pickups: [],
    timeLeft: 0,
    killTarget,
    winner: null,
    feed: [],
    muted,
    aimTargetId: null,
    matchSeconds: 0,
    shots: 0,
    hits: 0,
    fps: 0,
  };
}

export class GameStore {
  private snapshot: GameSnapshot;
  private readonly listeners = new Set<Listener>();

  constructor(initial: GameSnapshot) {
    this.snapshot = initial;
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  set(partial: Partial<GameSnapshot>) {
    this.snapshot = { ...this.snapshot, ...partial };
    for (const listener of this.listeners) {
      listener();
    }
  }
}

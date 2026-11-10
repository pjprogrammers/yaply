/**
 * Gameplay audio lifted from the Hole Arena Unity build.
 *
 * The clips in /public/audio are the original AudioClip assets (AAC), so the
 * swipes, gulps, points chimes, kills, timer ticks and match music are the
 * exact sounds the reference plays. They are decoded through Web Audio so
 * several one-shots can overlap without cutting each other off.
 */
const AUDIO_BASE = "/audio";

const CLIPS = {
  music: "hole_io_music",
  swallow1: "Swallow_Small_1",
  swallow2: "Swallow_Small_2",
  swallow3: "Swallow_Small_3",
  swallow4: "Swallow_Small_4",
  killSwallow: "KillSwallow",
  kill: "Kill",
  killOpponent: "kill_opponent",
  sizeUp: "Size_Up",
  points1: "Points_1",
  points2: "Points_2",
  points3: "Points_3",
  points4: "Points_4",
  pointCollect: "PointCollect",
  timerTick: "Timer_Tick",
  uiClick: "UI_Click",
  tap: "tap",
  victory: "Victory",
  winFanfare: "win_fanfare",
  gameOver: "Game_Over",
  collectCoin: "collect_coin",
  collectGem: "collect_gem",
  spin: "spin",
  moveLoop: "Move_Loop",
  levelComplete: "Level_Complete",
  rewardSmall1: "Reward_small_01",
  rewardSmall2: "reward_small_02",
  rankShaking: "rank_shaking",
  chest: "Chest",
} as const;

type ClipName = keyof typeof CLIPS;
const CLIP_NAMES = Object.keys(CLIPS) as ClipName[];

const MUSIC_VOLUME = 0.17;
const MASTER_VOLUME = 0.85;

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private moveGain: GainNode | null = null;
  private muted = false;
  private musicWanted = false;
  private musicSource: AudioBufferSourceNode | null = null;
  private moving = false;
  private moveSource: AudioBufferSourceNode | null = null;
  private readonly data = new Map<ClipName, Promise<ArrayBuffer | null>>();
  private readonly buffers = new Map<ClipName, AudioBuffer>();
  private readonly decoding = new Map<ClipName, Promise<AudioBuffer | null>>();
  private disposed = false;

  constructor() {
    // Start the network fetch before the first user gesture so decoding only
    // costs a few milliseconds when the player presses "Dig in".
    if (typeof fetch === "function") {
      for (const name of CLIP_NAMES) this.data.set(name, this.fetchClip(name));
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : MASTER_VOLUME,
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  get isMuted() {
    return this.muted;
  }

  unlock() {
    if (this.disposed) return;
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
    const musicGain = ctx.createGain();
    musicGain.gain.value = MUSIC_VOLUME;
    musicGain.connect(master);
    const moveGain = ctx.createGain();
    moveGain.gain.value = 0.2;
    moveGain.connect(master);

    this.ctx = ctx;
    this.master = master;
    this.musicGain = musicGain;
    this.moveGain = moveGain;
    if (ctx.state === "suspended") void ctx.resume();

    for (const name of CLIP_NAMES) void this.ensureBuffer(name);
  }

  /** Starts the looping match theme. */
  playMusic() {
    this.musicWanted = true;
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(MUSIC_VOLUME, now);
    void this.ensureBuffer("music").then((buffer) => {
      if (!buffer || !this.musicWanted || this.musicSource || !this.ctx) return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.musicGain as GainNode);
      source.start();
      this.musicSource = source;
    });
  }

  /** Fades the theme out (used when the results jingle takes over). */
  stopMusic(fade = 0.35) {
    this.musicWanted = false;
    const source = this.musicSource;
    const gain = this.musicGain;
    const ctx = this.ctx;
    this.musicSource = null;
    if (!source || !gain || !ctx) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    try {
      source.stop(now + fade + 0.02);
    } catch {
      // already stopped.
    }
    source.onended = () => {
      if (this.musicSource !== source) gain.gain.value = MUSIC_VOLUME;
    };
  }

  /** Reference movement loop, only audible while the player is rolling. */
  setMoving(moving: boolean) {
    if (this.moving === moving) return;
    this.moving = moving;
    if (!moving) {
      const source = this.moveSource;
      this.moveSource = null;
      if (source && this.ctx) {
        try {
          source.stop(this.ctx.currentTime + 0.08);
        } catch {
          // already stopped.
        }
      }
      return;
    }
    if (!this.ctx || !this.moveGain) return;
    void this.ensureBuffer("moveLoop").then((buffer) => {
      if (!buffer || !this.moving || this.moveSource || !this.ctx) return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.moveGain as GainNode);
      source.start();
      this.moveSource = source;
    });
  }

  click() {
    this.play("uiClick", 0.8);
  }

  tap() {
    this.play("tap", 0.7);
  }

  swallow(value: number) {
    const name: ClipName =
      value >= 180 ? "swallow4" : value >= 90 ? "swallow3" : value >= 30 ? "swallow2" : "swallow1";
    this.play(name, 0.85 + Math.min(0.25, value / 900));
    if (value >= 60) this.play("pointCollect", 0.45);
  }

  points() {
    const name: ClipName = (["points1", "points2", "points3", "points4"] as const)[
      Math.floor(Math.random() * 4)
    ];
    this.play(name, 0.45);
  }

  bigEat() {
    this.play("killSwallow", 1);
  }

  holeEaten() {
    this.play("kill", 0.95);
  }

  killOpponent() {
    this.play("killOpponent", 0.9);
  }

  sizeUp() {
    this.play("sizeUp", 0.9);
  }

  countdown(step: number) {
    if (step === 0) {
      this.play("sizeUp", 0.95);
      return;
    }
    this.play("tap", 0.8);
  }

  tick(urgent: boolean) {
    this.play("timerTick", urgent ? 0.95 : 0.6);
  }

  finish(win: boolean) {
    this.stopMusic(0.3);
    if (win) {
      this.play("victory", 1);
      this.play("winFanfare", 0.65, undefined, 0.55);
    } else {
      this.play("gameOver", 1);
    }
  }

  respawn() {
    this.play("spin", 0.55);
  }

  dispose() {
    this.disposed = true;
    this.stopMusic(0.05);
    this.moving = false;
    try {
      this.moveSource?.stop();
    } catch {
      // already stopped.
    }
    this.moveSource = null;
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.moveGain = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }

  private play(
    name: ClipName,
    volume = 1,
    rate = 1,
    delay = 0,
  ) {
    if (!this.ctx || !this.master || this.muted || this.disposed) return;
    const requested = this.ctx.currentTime;
    if (this.buffers.has(name)) {
      this.playBuffer(name, volume, rate, delay);
      return;
    }
    // A clip that was requested during the first frames after the user gesture
    // can still land as soon as decoding finishes.
    void this.ensureBuffer(name).then((buffer) => {
      if (!buffer || this.muted || !this.ctx) return;
      if (this.ctx.currentTime - requested > 0.6) return;
      this.playBuffer(name, volume, rate, delay);
    });
  }

  private playBuffer(
    name: ClipName,
    volume: number,
    rate: number,
    delay: number,
  ) {
    const ctx = this.ctx;
    const master = this.master;
    const buffer = this.buffers.get(name);
    if (!ctx || !master || !buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(master);
    source.start(ctx.currentTime + Math.max(0, delay));
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  private fetchClip(name: ClipName): Promise<ArrayBuffer | null> {
    return fetch(`${AUDIO_BASE}/${CLIPS[name]}.m4a`, { cache: "force-cache" })
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
  }

  private ensureBuffer(name: ClipName): Promise<AudioBuffer | null> {
    const ready = this.buffers.get(name);
    if (ready) return Promise.resolve(ready);
    const pending = this.decoding.get(name);
    if (pending) return pending;
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);

    const work = (this.data.get(name) ?? this.fetchClip(name))
      .then((raw) => {
        if (!raw || raw.byteLength === 0) return null;
        return new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(raw, resolve, reject);
        });
      })
      .then((buffer) => {
        if (buffer && !this.disposed) this.buffers.set(name, buffer);
        return buffer;
      })
      .catch(() => null)
      .finally(() => {
        this.decoding.delete(name);
      });
    this.decoding.set(name, work);
    return work;
  }
}

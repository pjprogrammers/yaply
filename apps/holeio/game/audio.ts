/**
 * Small synthesised sound kit. No audio files, no loading, no licences to
 * chase: every sound is built from oscillators and filtered noise.
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  get isMuted() {
    return this.muted;
  }

  unlock() {
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
    master.gain.value = this.muted ? 0 : 0.5;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;

    const length = ctx.sampleRate * 1.2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        start + duration,
      );
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(envelope);
    envelope.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noise(duration: number, gain: number, filter: number, delay = 0) {
    if (!this.ctx || !this.master || !this.muted || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(filter, start);
    lowpass.frequency.exponentialRampToValueAtTime(
      Math.max(80, filter * 0.25),
      start + duration,
    );
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(lowpass);
    lowpass.connect(envelope);
    envelope.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.05);
  }

  click() {
    this.tone(420, 0.06, "square", 0.06, 620);
  }

  swallow(value: number) {
    const size = Math.min(1, value / 120);
    this.tone(180 + size * 150 + Math.random() * 40, 0.09 + size * 0.07, "triangle", 0.09, 70);
    if (value >= 20) this.noise(0.14, 0.04 + size * 0.05, 900);
  }

  bigEat() {
    this.tone(110, 0.32, "sine", 0.22, 36);
    this.noise(0.36, 0.16, 1200);
  }

  holeEaten() {
    this.tone(150, 0.4, "sawtooth", 0.1, 38);
    this.noise(0.5, 0.18, 700);
  }

  countdown(step: number) {
    this.tone(step === 0 ? 900 : 520, step === 0 ? 0.26 : 0.12, "square", 0.08);
    if (step === 0) this.tone(1300, 0.3, "triangle", 0.07, 1750, 0.02);
  }

  tick(urgent: boolean) {
    this.tone(urgent ? 980 : 720, 0.08, "square", urgent ? 0.08 : 0.05);
  }

  finish(win: boolean) {
    const notes = win ? [523, 659, 784, 1047] : [392, 330, 262, 196];
    notes.forEach((note, i) => {
      this.tone(note, 0.36, "triangle", 0.09, undefined, i * 0.13);
    });
    if (win) this.noise(0.5, 0.05, 2400, 0.1);
  }

  respawn() {
    this.tone(300, 0.16, "sine", 0.06, 620);
  }
}

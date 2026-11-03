type OscType = OscillatorType;

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineOscA: OscillatorNode | null = null;
  private engineOscB: OscillatorNode | null = null;
  private skidGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  constructor(muted = false) {
    this.muted = muted;
  }

  unlock() {
    if (typeof window === "undefined") {
      return;
    }
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        return;
      }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise(this.ctx, 2);
      this.createEngine();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  private createEngine() {
    if (!this.ctx || !this.master) {
      return;
    }
    const ctx = this.ctx;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 420;
    this.engineFilter.Q.value = 3.5;

    this.engineOscA = ctx.createOscillator();
    this.engineOscA.type = "sawtooth";
    this.engineOscA.frequency.value = 62;
    this.engineOscB = ctx.createOscillator();
    this.engineOscB.type = "square";
    this.engineOscB.frequency.value = 31;

    const mix = ctx.createGain();
    mix.gain.value = 0.42;
    this.engineOscA.connect(mix);
    this.engineOscB.connect(mix);
    mix.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOscA.start();
    this.engineOscB.start();

    if (this.noiseBuffer) {
      const skid = ctx.createBufferSource();
      skid.buffer = this.noiseBuffer;
      skid.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1700;
      filter.Q.value = 1.4;
      this.skidGain = ctx.createGain();
      this.skidGain.gain.value = 0;
      skid.connect(filter);
      filter.connect(this.skidGain);
      this.skidGain.connect(this.master);
      skid.start();
    }
  }

  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  setMuted(value: boolean) {
    this.muted = value;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(value ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
  }

  setEngine(ratio: number, boosting: boolean, drifting: boolean, active: boolean) {
    if (!this.ctx || !this.engineOscA || !this.engineOscB || !this.engineGain || !this.engineFilter) {
      return;
    }
    const t = this.ctx.currentTime;
    const clamped = Math.min(1, Math.max(0, ratio));
    const base = 54 + clamped * 102 + (boosting ? 26 : 0);
    this.engineOscA.frequency.setTargetAtTime(base, t, 0.08);
    this.engineOscB.frequency.setTargetAtTime(base * 0.5, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(360 + clamped * 1100 + (boosting ? 500 : 0), t, 0.1);
    this.engineGain.gain.setTargetAtTime(active ? 0.07 + clamped * 0.055 : 0, t, 0.15);
    if (this.skidGain) {
      this.skidGain.gain.setTargetAtTime(active && drifting && clamped > 0.2 ? 0.028 : 0, t, 0.08);
    }
  }

  private tone(type: OscType, from: number, to: number, duration: number, gain: number, delay = 0) {
    if (!this.ctx || !this.master) {
      return;
    }
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env);
    env.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noise(duration: number, gain: number, fromFreq: number, toFreq: number, type: BiquadFilterType = "lowpass") {
    if (!this.ctx || !this.master || !this.noiseBuffer) {
      return;
    }
    const ctx = this.ctx;
    const start = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(fromFreq, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, toFreq), start + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(env);
    env.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  shot() {
    this.tone("square", 760, 210, 0.09, 0.055);
    this.noise(0.05, 0.025, 2600, 900, "highpass");
  }

  missile() {
    this.tone("sawtooth", 280, 90, 0.32, 0.08);
    this.noise(0.3, 0.05, 1400, 300);
  }

  explosion() {
    this.noise(0.55, 0.3, 1300, 60);
    this.tone("sine", 120, 38, 0.4, 0.16);
  }

  hit() {
    this.noise(0.08, 0.07, 3200, 1100, "highpass");
    this.tone("square", 220, 130, 0.06, 0.035);
  }

  pickup() {
    this.tone("triangle", 523, 523, 0.08, 0.09);
    this.tone("triangle", 659, 659, 0.08, 0.09, 0.07);
    this.tone("triangle", 880, 880, 0.14, 0.09, 0.14);
  }

  boost() {
    this.tone("sawtooth", 130, 520, 0.38, 0.09);
    this.noise(0.35, 0.06, 700, 2600, "bandpass");
  }

  shield() {
    this.tone("sine", 420, 760, 0.35, 0.08);
    this.tone("sine", 760, 980, 0.25, 0.05, 0.08);
  }

  shock() {
    this.tone("sawtooth", 90, 40, 0.45, 0.14);
    this.noise(0.4, 0.14, 900, 120, "lowpass");
  }

  respawn() {
    this.tone("triangle", 260, 520, 0.3, 0.07);
    this.tone("triangle", 520, 780, 0.25, 0.06, 0.16);
  }

  dispose() {
    if (this.engineOscA) {
      try {
        this.engineOscA.stop();
      } catch {
        // already stopped
      }
    }
    if (this.engineOscB) {
      try {
        this.engineOscB.stop();
      } catch {
        // already stopped
      }
    }
    void this.ctx?.close();
    this.ctx = null;
  }
}

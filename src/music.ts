// Global cozy lo-fi music controller — a singleton that survives page navigation.
// Mute preference is stored in localStorage and synced across browser tabs.

const KEY = "desk-planner-music-muted";
const BPM = 72;
const BEAT = 60 / BPM;
const VOLUME = 0.5;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Fmaj9 → Em7 → Dm9 → Cmaj9 (classic warm lo-fi loop)
const PROGRESSION = [
  { bass: 41, notes: [57, 60, 64, 67] },
  { bass: 40, notes: [55, 59, 62, 67] },
  { bass: 38, notes: [53, 57, 60, 64] },
  { bass: 36, notes: [52, 55, 59, 62] },
];
const MELODY_SCALE = [72, 74, 76, 79, 81, 84];

class MusicController {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private crackle: AudioBufferSourceNode | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private _muted = localStorage.getItem(KEY) === "true";
  private listeners = new Set<(muted: boolean) => void>();
  private unlock = () => this.resumeIfAllowed();

  constructor() {
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) this.applyMuted(e.newValue === "true", false);
    });
  }

  get muted() { return this._muted; }

  subscribe(fn: (muted: boolean) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  toggleMute() { this.applyMuted(!this._muted, true); }

  private applyMuted(m: boolean, persist: boolean) {
    this._muted = m;
    if (persist) localStorage.setItem(KEY, m ? "true" : "false");
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(m ? 0 : VOLUME, t + 0.8);
      if (!m) this.resumeIfAllowed();
    }
    this.listeners.forEach((fn) => fn(m));
  }

  private resumeIfAllowed() {
    if (this.ctx && !this._muted && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }

  start() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch { return; }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : VOLUME;
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 2400;
    warmth.Q.value = 0.4;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(warmth).connect(comp).connect(ctx.destination);

    this.bus = ctx.createGain();
    this.bus.gain.value = 0.8;
    this.bus.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.bus.connect(this.reverb).connect(wet).connect(this.master);

    this.startCrackle();
    this.nextTime = ctx.currentTime + 0.2;
    this.step = 0;
    this.timer = window.setInterval(() => this.schedule(), 100);
    ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, this.unlock));
    this.resumeIfAllowed();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    ["pointerdown", "keydown"].forEach((ev) => window.removeEventListener(ev, this.unlock));
    this.crackle?.stop();
    this.ctx?.close();
    this.ctx = null;
  }

  private makeImpulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  private noiseBuffer(seconds: number, crackle = false) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = crackle ? (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.015) : Math.random() * 2 - 1;
    }
    return buf;
  }

  private startCrackle() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4, true);
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    src.connect(hp).connect(g).connect(this.master!);
    src.start();
    this.crackle = src;
  }

  private schedule() {
    if (!this.ctx) return;
    while (this.nextTime < this.ctx.currentTime + 0.4) {
      this.playStep(this.step, this.nextTime);
      // gentle swing on eighth notes
      this.nextTime += (this.step % 2 === 0 ? 0.58 : 0.42) * BEAT;
      this.step++;
    }
  }

  private playStep(step: number, t: number) {
    const eighth = step % 8;
    const chord = PROGRESSION[Math.floor(step / 8) % PROGRESSION.length];
    if (eighth === 0) {
      chord.notes.forEach((n, i) => this.keys(midi(n), t + i * 0.035, BEAT * 3.6, 0.07));
      this.bass(midi(chord.bass), t, BEAT * 1.8);
    }
    if (eighth === 5) this.bass(midi(chord.bass + 7), t, BEAT * 1.2);
    if (eighth === 0 || eighth === 5) this.kick(t);
    if (eighth === 4) this.snare(t);
    if (eighth % 2 === 1) this.hat(t, 0.025);
    if ((eighth === 2 || eighth === 6 || eighth === 7) && Math.random() < 0.45) {
      const n = MELODY_SCALE[Math.floor(Math.random() * MELODY_SCALE.length)];
      this.bell(midi(n), t, 0.035);
    }
  }

  private env(t: number, peak: number, attack: number, dur: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, out: AudioNode, detune = 0) {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Soft Rhodes-like electric piano
  private keys(freq: number, t: number, dur: number, vol: number) {
    const g = this.env(t, vol, 0.03, dur);
    const lp = this.ctx!.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + dur);
    g.connect(lp).connect(this.bus!);
    this.osc("sine", freq, t, dur, g, -4);
    this.osc("sine", freq, t, dur, g, 5);
    const h = this.env(t, vol * 0.25, 0.01, 0.6);
    h.connect(this.bus!);
    this.osc("triangle", freq * 2, t, 0.6, h);
  }

  private bass(freq: number, t: number, dur: number) {
    const g = this.env(t, 0.14, 0.04, dur);
    g.connect(this.master!);
    this.osc("sine", freq, t, dur, g);
  }

  private bell(freq: number, t: number, vol: number) {
    const g = this.env(t, vol, 0.01, 1.8);
    g.connect(this.bus!);
    this.osc("sine", freq, t, 1.8, g);
    const shimmer = this.env(t, vol * 0.15, 0.005, 0.5);
    shimmer.connect(this.bus!);
    this.osc("sine", freq * 3, t, 0.5, shimmer);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    const g = this.env(t, 0.22, 0.005, 0.35);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.4);
  }

  private noiseHit(t: number, vol: number, dur: number, type: BiquadFilterType, freq: number, toBus = false) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.env(t, vol, 0.004, dur);
    src.connect(f).connect(g).connect(toBus ? this.bus! : this.master!);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private snare(t: number) { this.noiseHit(t, 0.05, 0.28, "bandpass", 1800, true); }
  private hat(t: number, vol: number) { this.noiseHit(t, vol, 0.06, "highpass", 7000); }
}

export const musicController = new MusicController();

// Global music controller — singleton, survives navigation across pages.
// Generates calm lobby-style ambient jazz: extended chords with smooth transitions,
// soft sine/triangle tones, slow tempo, no jarring changes.

type Voice = {
  osc: OscillatorNode;
  gain: GainNode;
};

const CHORDS: number[][] = [
  [261.63, 329.63, 392.00, 493.88], // Cmaj7
  [220.00, 277.18, 329.63, 415.30], // Am7
  [196.00, 246.94, 293.66, 369.99], // Gmaj7
  [174.61, 220.00, 261.63, 329.63], // Fmaj7
  [233.08, 293.66, 349.23, 440.00], // Bbmaj7
  [196.00, 246.94, 311.13, 392.00], // Gmin7
];

const BASS_NOTES: number[] = [
  130.81, // C3
  110.00, // A2
  98.00,  // G2
  87.31,  // F2
  116.54, // Bb2
  98.00,  // G2
];

class MusicController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private intervalId: number | null = null;
  private chordIndex = 0;
  private beatIndex = 0;
  private _muted = false;
  private _started = false;
  private listeners: Set<(muted: boolean) => void> = new Set();

  get muted() { return this._muted; }

  subscribe(fn: (muted: boolean) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this._muted));
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.masterGain && this.ctx) {
      const target = m ? 0 : 0.12;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.4);
    }
    localStorage.setItem("desk-planner-music-muted", m ? "true" : "false");
    this.notify();
  }

  toggleMute() {
    this.setMuted(!this._muted);
  }

  start() {
    if (this._started) return;
    this._started = true;

    // Restore mute preference
    const saved = localStorage.getItem("desk-planner-music-muted");
    if (saved === "true") this._muted = true;

    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : 0.12;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this._started = false;
      return;
    }

    this.chordIndex = 0;
    this.beatIndex = 0;

    this.intervalId = window.setInterval(() => this.tick(), 2200);
    // Play first chord immediately
    this.tick();
  }

  private tick() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chord = CHORDS[this.chordIndex % CHORDS.length];
    const bassFreq = BASS_NOTES[this.chordIndex % BASS_NOTES.length];

    // Play chord notes with gentle attack and long release
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;

      const pan = ctx.createStereoPanner();
      pan.pan.value = (i - 1.5) * 0.25;

      const startDelay = i * 0.08;
      const peakVol = 0.05 - i * 0.005;

      gain.gain.setValueAtTime(0, now + startDelay);
      gain.gain.linearRampToValueAtTime(peakVol, now + startDelay + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startDelay + 2.8);

      osc.connect(gain);
      gain.connect(pan);
      pan.connect(this.masterGain!);
      osc.start(now + startDelay);
      osc.stop(now + startDelay + 3.0);
    });

    // Soft bass note
    {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = bassFreq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 2.6);
    }

    // Light shimmer melody — one soft note per chord
    if (this.beatIndex % 2 === 0) {
      const melodyNotes = [523.25, 587.33, 659.25, 698.46, 783.99, 659.25];
      const mFreq = melodyNotes[this.chordIndex % melodyNotes.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = mFreq;
      const delay = 1.2;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.035, now + delay + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + delay);
      osc.stop(now + delay + 1.6);
    }

    this.chordIndex++;
    this.beatIndex++;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._started = false;
  }
}

export const musicController = new MusicController();

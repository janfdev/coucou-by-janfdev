// SoundEngine — port of SoundEngine.swift.
// The 28 WAVs are the macOS app's own files (see SOUNDS_DIR in vite.config.ts);
// they are served at /sounds/<name>.wav. Default volume 0.12, slider range 0–0.2,
// exactly like the Mac player, and several sounds may overlap.

export const SOUND_NAMES = [
  "peek", "open", "close", "hover", "blip", "slap", "annoyed", "dizzy", "greet",
  "work", "finish", "error", "approval", "question", "approve", "gulp", "tick",
  "send", "love", "pop", "proud", "wink", "yawn", "attach", "think", "search",
  "rate", "sleep",
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

import type { SoundPackKind } from "./state";

class SoundEngine {
  enabled = true;
  volume = 0.12;
  soundPack: SoundPackKind = "thock";

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private idleTimer: number | null = null;

  /** Creates the context and decodes every WAV. Safe to call more than once. */
  preload(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = this.volume;
      master.connect(ctx.destination);
      this.master = master;
      await Promise.all(
        SOUND_NAMES.map(async (name) => {
          try {
            const res = await fetch(`/sounds/${name}.wav`);
            if (!res.ok) return;
            const buf = await ctx.decodeAudioData(await res.arrayBuffer());
            this.buffers.set(name, buf);
          } catch {
            /* a missing sound must never break the island */
          }
        }),
      );
    })();
    return this.loading;
  }

  /** WebView2 can hand us a suspended context; call after any user input. */
  resume() {
    if (this.idleTimer != null) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    void this.ctx?.resume();
  }

  /**
   * Called when the island goes quiet. A running AudioContext keeps an audio
   * thread and its render quantum alive even with nothing playing, which shows
   * up as a steady trickle of CPU on a machine that is supposed to be idle.
   *
   * The delay covers the tail of whatever just played — suspending mid-sound
   * would clip it — and `play()` resumes the context on its own.
   */
  idle() {
    if (!this.ctx || this.ctx.state !== "running" || this.idleTimer != null) return;
    this.idleTimer = window.setTimeout(() => {
      this.idleTimer = null;
      void this.ctx?.suspend();
    }, 1500);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(0.2, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  play(name: SoundName | string) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const master = this.master;
    const buf = this.buffers.get(name);
    if (!ctx || !master || !buf) return;
    if (this.idleTimer != null) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (ctx.state === "suspended") void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start();
  }

  setSoundPack(pack: SoundPackKind) {
    this.soundPack = pack;
  }

  thock() {
    if (!this.enabled || !this.ctx || !this.master) return;
    if (this.idleTimer != null) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();

    try {
      const t = this.ctx.currentTime;
      const pack = this.soundPack;

      if (pack === "cherry_blue") {
        // High clicky switch: dual burst
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(350, t + 0.025);
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.04);
      } else if (pack === "gateron_yellow") {
        // Creamy linear switch: mellow low-end thump
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.04);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, t);
        gain.gain.setValueAtTime(0.85, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.055);
      } else if (pack === "arcade") {
        // 8-bit retro gaming blip
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(587.33, t); // D5
        osc.frequency.setValueAtTime(880, t + 0.025); // A5
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.065);
      } else {
        // Default deep tactile "thock"
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(340, t);
        osc.frequency.exponentialRampToValueAtTime(75, t + 0.045);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(460, t);
        filter.Q.setValueAtTime(3.0, t);

        gain.gain.setValueAtTime(0.65, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);

        osc.start(t);
        osc.stop(t + 0.06);
      }
    } catch {
      /* ignore audio context errors */
    }
  }
}

export const Sound = new SoundEngine();

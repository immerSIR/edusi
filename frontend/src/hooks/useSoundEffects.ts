"use client";

import { useCallback, useState } from "react";

export type SoundName =
  | "tap"
  | "correct"
  | "incorrect"
  | "transition"
  | "complete"
  | "recordStart"
  | "recordStop"
  | "lock"
  | "points";

// Singleton AudioContext — shared across all hook instances
let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (audioCtx && audioCtx.state !== "closed") return audioCtx;
  return null;
}

function ensureContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Sound synthesis functions ────────────────────────────────────────────

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine",
  freqEnd?: number,
) {
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (freqEnd) {
    osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
  }
  vol.gain.setValueAtTime(gain, startTime);
  vol.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(vol).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

const sounds: Record<SoundName, (ctx: AudioContext) => void> = {
  // Soft click — 800Hz sine, 30ms
  tap(ctx) {
    playTone(ctx, 800, ctx.currentTime, 0.03, 0.15);
  },

  // Ascending chime — C5 then E5
  correct(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, 523, t, 0.12, 0.2);
    playTone(ctx, 659, t + 0.12, 0.12, 0.2);
  },

  // Gentle descending — E4 then C4
  incorrect(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, 330, t, 0.15, 0.15, "triangle");
    playTone(ctx, 262, t + 0.15, 0.15, 0.15, "triangle");
  },

  // Quick sweep — 400→600Hz
  transition(ctx) {
    playTone(ctx, 400, ctx.currentTime, 0.08, 0.1, "sine", 600);
  },

  // Celebration arpeggio — C5, E5, G5, C6
  complete(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, 523, t, 0.1, 0.2);
    playTone(ctx, 659, t + 0.1, 0.1, 0.2);
    playTone(ctx, 784, t + 0.2, 0.1, 0.2);
    playTone(ctx, 1047, t + 0.3, 0.15, 0.2);
  },

  // Warm activation tone — A4
  recordStart(ctx) {
    playTone(ctx, 440, ctx.currentTime, 0.1, 0.15);
  },

  // Descending deactivation — A4→G4
  recordStop(ctx) {
    playTone(ctx, 440, ctx.currentTime, 0.1, 0.15, "sine", 392);
  },

  // Firm click + ascending confirmation for slide-to-lock
  lock(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, 600, t, 0.04, 0.2);
    playTone(ctx, 900, t + 0.04, 0.06, 0.15);
  },

  // Quick high sparkle — C6, E6, G6
  points(ctx) {
    const t = ctx.currentTime;
    playTone(ctx, 1047, t, 0.05, 0.12);
    playTone(ctx, 1319, t + 0.05, 0.05, 0.12);
    playTone(ctx, 1568, t + 0.1, 0.05, 0.12);
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseSoundEffectsReturn {
  play: (sound: SoundName) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  unlock: () => void;
}

function getStoredEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem("edusi-sounds-enabled");
  return v === null ? true : v === "true";
}

export function useSoundEffects(): UseSoundEffectsReturn {
  const [enabled, setEnabledState] = useState(getStoredEnabled);

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val);
    localStorage.setItem("edusi-sounds-enabled", String(val));
  }, []);

  const unlock = useCallback(() => {
    ensureContext();
  }, []);

  const play = useCallback(
    (sound: SoundName) => {
      if (!enabled) return;
      const ctx = getContext();
      if (!ctx) return;
      // Resume in case iOS suspended it
      if (ctx.state === "suspended") ctx.resume();
      try {
        sounds[sound](ctx);
      } catch {
        // Swallow audio errors silently
      }
    },
    [enabled],
  );

  return { play, enabled, setEnabled, unlock };
}

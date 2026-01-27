import { useEffect, useRef, useCallback } from "react";
import type { AlertState } from "@vg-log/shared";

interface AudioAlertConfig {
  enabled: boolean;
  warningInterval?: number; // ms between warning beeps
  urgentInterval?: number; // ms between urgent beeps
  exceededInterval?: number; // ms between exceeded beeps
}

const defaultConfig: AudioAlertConfig = {
  enabled: true,
  warningInterval: 60000, // Every minute
  urgentInterval: 30000, // Every 30 seconds
  exceededInterval: 15000, // Every 15 seconds
};

// Create audio context lazily to avoid autoplay restrictions
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      console.warn("Web Audio API not supported");
      return null;
    }
  }
  return audioContext;
}

// Play a beep with customizable frequency and duration
function playBeep(frequency: number, duration: number, volume: number = 0.5): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (required after user interaction)
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Fade in
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);

  // Fade out
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration - 0.01);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// Different alert sounds for each state
function playWarningSound(): void {
  // Single gentle beep - 440Hz (A4)
  playBeep(440, 0.2, 0.3);
}

function playUrgentSound(): void {
  // Double beep - higher pitch
  playBeep(660, 0.15, 0.4);
  setTimeout(() => playBeep(660, 0.15, 0.4), 200);
}

function playExceededSound(): void {
  // Triple beep - descending pitch, louder
  playBeep(880, 0.15, 0.5);
  setTimeout(() => playBeep(660, 0.15, 0.5), 200);
  setTimeout(() => playBeep(440, 0.25, 0.5), 400);
}

export function useAudioAlert(
  alertState: AlertState,
  isPlaying: boolean,
  config: Partial<AudioAlertConfig> = {}
): {
  playTestSound: () => void;
  initAudio: () => void;
} {
  const mergedConfig = { ...defaultConfig, ...config };
  const lastAlertRef = useRef<AlertState>("ok");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio context (must be called from user interaction)
  const initAudio = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") {
      ctx.resume();
    }
  }, []);

  // Play test sound
  const playTestSound = useCallback(() => {
    initAudio();
    playBeep(440, 0.3, 0.3);
  }, [initAudio]);

  // Play sound when alert state changes
  useEffect(() => {
    if (!mergedConfig.enabled || !isPlaying) return;

    // Only play on state change
    if (alertState !== lastAlertRef.current) {
      lastAlertRef.current = alertState;

      switch (alertState) {
        case "warning":
          playWarningSound();
          break;
        case "urgent":
          playUrgentSound();
          break;
        case "exceeded":
          playExceededSound();
          break;
      }
    }
  }, [alertState, isPlaying, mergedConfig.enabled]);

  // Set up interval for repeated alerts
  useEffect(() => {
    if (!mergedConfig.enabled || !isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Get interval based on current state
    let intervalMs: number | undefined;
    let playFn: (() => void) | null = null;

    switch (alertState) {
      case "warning":
        intervalMs = mergedConfig.warningInterval;
        playFn = playWarningSound;
        break;
      case "urgent":
        intervalMs = mergedConfig.urgentInterval;
        playFn = playUrgentSound;
        break;
      case "exceeded":
        intervalMs = mergedConfig.exceededInterval;
        playFn = playExceededSound;
        break;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (intervalMs && playFn) {
      intervalRef.current = setInterval(playFn, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    alertState,
    isPlaying,
    mergedConfig.enabled,
    mergedConfig.warningInterval,
    mergedConfig.urgentInterval,
    mergedConfig.exceededInterval,
  ]);

  return { playTestSound, initAudio };
}

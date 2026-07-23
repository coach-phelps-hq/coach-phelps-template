import { useCallback, useRef, useState } from "react";

export function useBeep() {
  const audioCtx = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const beep = useCallback((freq: number = 800, duration: number = 150) => {
    if (mutedRef.current) return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new AudioContext();
      }
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Audio not available
    }
  }, []);

  const countdown3 = useCallback(() => {
    beep(600, 100);
  }, [beep]);

  const transitionBeep = useCallback(() => {
    beep(1000, 200);
  }, [beep]);

  const completeBeep = useCallback(() => {
    beep(1200, 300);
    setTimeout(() => beep(1400, 300), 350);
  }, [beep]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  return { countdown3, transitionBeep, completeBeep, muted, toggleMute };
}

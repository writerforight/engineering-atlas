import { useEffect, useRef, useState } from 'react';

/**
 * Animated parameter t advancing at `speed` units/second while `playing`.
 * Returns [t, setT]. Respects prefers-reduced-motion by starting paused.
 */
export function useAnimatedTime(playing: boolean, speed = 1, wrap?: number): [number, (t: number) => void] {
  const [t, setT] = useState(0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current !== null) {
        const dt = Math.min(0.1, (now - last.current) / 1000);
        setT((prev) => {
          const next = prev + dt * speed;
          return wrap ? next % wrap : next;
        });
      }
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, wrap]);

  return [t, setT];
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

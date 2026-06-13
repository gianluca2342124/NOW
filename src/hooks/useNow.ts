import { useEffect, useState } from 'react';

/**
 * A ticking "current time" in epoch ms. Drives live status derivation so
 * bubbles transition (upcoming → imminent → live → ending) without a reload.
 *
 * Default cadence is 15s — frequent enough to feel alive, cheap enough to
 * never matter for performance.
 */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

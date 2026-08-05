import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './gameStore';
import { computePromotionEta, retainPromotionWindow, type PromotionSample } from './promotionEta';

const SAMPLE_INTERVAL_MS = 10_000;

/**
 * Hoisted rather than written inline as a default: a default expression is re-evaluated per call,
 * which would hand the effect a new dependency identity every render and rebuild the timer each
 * time — sampling at render cadence, which is the coupling this hook exists to avoid.
 */
const systemNowMs = () => Date.now();

/**
 * Samples the experience track on its own timer, for the same reason the velocity readout does:
 * a subscription would tie this to the 50ms tick and re-render the banner twenty times a second
 * to show a figure that changes at most once per sample.
 */
export function usePromotionEta(nowMs: () => number = systemNowMs): number | null {
  const samples = useRef<PromotionSample[]>([]);
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const sample = () => {
      const now = nowMs();
      const { experience, elapsedSeconds } = useGameStore.getState().progression;
      samples.current = retainPromotionWindow(
        [...samples.current, {
          atMs: now,
          currentSeconds: experience.currentSeconds,
          maxSeconds: experience.maxSeconds,
          // The game's own clock is the denominator; the wall clock only bounds the buffer.
          elapsedSeconds,
        }],
        now,
      );
      const next = computePromotionEta(samples.current);
      setSeconds((current) => (current === next ? current : next));
    };

    sample();
    const timer = setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [nowMs]);

  return seconds;
}

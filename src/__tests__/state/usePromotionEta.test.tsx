// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import React from 'react';
import { useGameStore } from '../../state/gameStore';
import { usePromotionEta } from '../../state/usePromotionEta';

let shown: number | null | undefined;
const Probe: React.FC<{ now: () => number }> = ({ now }) => {
  shown = usePromotionEta(now);
  return null;
};

afterEach(() => { vi.useRealTimers(); shown = undefined; });

// elapsedSeconds is the game's clock and the projection's denominator; it advances with play,
// so the fixture advances it alongside the track rather than leaving it still.
const setExperience = (currentSeconds: number, maxSeconds: number, elapsedSeconds?: number) => {
  const previous = useGameStore.getState().progression;
  useGameStore.setState({
    progression: {
      ...previous,
      experience: { currentSeconds, maxSeconds },
      elapsedSeconds: elapsedSeconds ?? previous.elapsedSeconds,
    },
  });
};

describe('promotion projection sampling', () => {
  it('reports nothing until the window is wide enough', () => {
    vi.useFakeTimers();
    setExperience(0, 1000, 0);
    let clock = 0;
    render(<Probe now={() => clock} />);
    expect(shown).toBeNull();

    clock = 10_000;
    act(() => { setExperience(50, 1000, 10); vi.advanceTimersByTime(10_000); });
    expect(shown).toBeNull();
  });

  it('reports a projection once the track has been observed moving', () => {
    vi.useFakeTimers();
    setExperience(0, 1000, 0);
    let clock = 0;
    render(<Probe now={() => clock} />);

    // Six samples, ten seconds apart, each covering ten seconds of play and earning five
    // track-seconds - a rate of 0.5, close to what the engine actually produces.
    for (let step = 1; step <= 6; step += 1) {
      clock = step * 10_000;
      act(() => { setExperience(step * 5, 1000, step * 10); vi.advanceTimersByTime(10_000); });
    }

    // 30 earned across 60 elapsed seconds; 970 remain at 0.5/s, so 1940 seconds of play.
    expect(shown).toBe(1940);
  });

  it('stops sampling when unmounted', () => {
    vi.useFakeTimers();
    setExperience(0, 1000, 0);
    let clock = 0;
    const { unmount } = render(<Probe now={() => clock} />);
    unmount();
    const before = shown;
    clock = 600_000;
    act(() => { setExperience(900, 1000, 900); vi.advanceTimersByTime(600_000); });
    expect(shown).toBe(before);
  });

  it('keeps its timer across host re-renders when no clock is supplied', () => {
    // The same defect the velocity hook shipped: an inline default argument is re-evaluated per
    // call, giving the effect a new dependency identity on every render.
    vi.useFakeTimers();
    const setInterval = vi.spyOn(window, 'setInterval');
    const DefaultProbe: React.FC = () => { usePromotionEta(); return null; };

    const { rerender } = render(<DefaultProbe />);
    expect(setInterval).toHaveBeenCalledTimes(1);
    for (let index = 0; index < 5; index += 1) act(() => { rerender(<DefaultProbe />); });

    expect(setInterval).toHaveBeenCalledTimes(1);
    setInterval.mockRestore();
  });
});

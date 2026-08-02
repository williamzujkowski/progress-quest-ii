import { afterEach, describe, expect, it, vi } from 'vitest';
import { startGameClock } from '../../state/gameClock';

describe('game clock', () => {
  afterEach(() => vi.useRealTimers());

  it('reports monotonic elapsed time instead of assuming the timer interval', () => {
    vi.useFakeTimers();
    let currentTime = 1_000;
    const tick = vi.fn();
    const stop = startGameClock(tick, () => currentTime);

    currentTime = 1_275;
    vi.advanceTimersByTime(50);

    expect(tick).toHaveBeenCalledWith(275);
    stop();
  });
});

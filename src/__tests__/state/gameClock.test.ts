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

  it('reports tick failures without stopping future ticks', () => {
    vi.useFakeTimers();
    let currentTime = 2_000;
    const failure = new Error('transition failed');
    const tick = vi.fn()
      .mockImplementationOnce(() => { throw failure; })
      .mockImplementationOnce(() => undefined);
    const onError = vi.fn();
    const stop = startGameClock(tick, () => currentTime, onError);

    currentTime = 2_050;
    vi.advanceTimersByTime(50);
    currentTime = 2_125;
    vi.advanceTimersByTime(50);

    expect(onError).toHaveBeenCalledWith(failure);
    expect(tick).toHaveBeenCalledTimes(2);
    expect(tick).toHaveBeenLastCalledWith(75);
    stop();
  });

  it('does not accrue catch-up time while the page is hidden', () => {
    vi.useFakeTimers();
    let currentTime = 3_000;
    const tick = vi.fn();
    const visibility = new EventTarget() as EventTarget & { hidden: boolean };
    visibility.hidden = false;
    const stop = startGameClock(tick, () => currentTime, undefined, visibility as Document);

    visibility.hidden = true;
    currentTime = 30_000;
    vi.advanceTimersByTime(50);
    expect(tick).not.toHaveBeenCalled();

    visibility.hidden = false;
    visibility.dispatchEvent(new Event('visibilitychange'));
    currentTime = 30_075;
    vi.advanceTimersByTime(50);

    expect(tick).toHaveBeenCalledWith(75);
    stop();
  });
});

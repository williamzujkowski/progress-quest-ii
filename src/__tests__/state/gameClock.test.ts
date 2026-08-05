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

    // The 50ms the failing tick consumed travels with the error.
    expect(onError).toHaveBeenCalledWith(failure, 50);
    expect(tick).toHaveBeenCalledTimes(2);
    expect(tick).toHaveBeenLastCalledWith(75);
    stop();
  });

  it('banks elapsed time while the page is hidden and spends it on return', () => {
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

    // 27_000ms earned while hidden plus the 75ms since returning.
    expect(tick).toHaveBeenCalledWith(27_075);
    stop();
  });

  it('banks hidden time even when a visible interval runs before the visibility event', () => {
    vi.useFakeTimers();
    let currentTime = 5_000;
    const tick = vi.fn();
    const visibility = new EventTarget() as EventTarget & { hidden: boolean };
    visibility.hidden = true;
    const stop = startGameClock(tick, () => currentTime, undefined, visibility as Document);

    currentTime = 50_000;
    visibility.hidden = false;
    vi.advanceTimersByTime(50);

    expect(tick).toHaveBeenCalledWith(45_000);
    stop();
  });

  it('keeps banking across repeated hidden spans without losing a span', () => {
    vi.useFakeTimers();
    let currentTime = 0;
    const tick = vi.fn();
    const visibility = new EventTarget() as EventTarget & { hidden: boolean };
    visibility.hidden = false;
    const stop = startGameClock(tick, () => currentTime, undefined, visibility as Document);

    for (const span of [10_000, 20_000]) {
      visibility.hidden = true;
      visibility.dispatchEvent(new Event('visibilitychange'));
      currentTime += span;
      vi.advanceTimersByTime(50);
      visibility.hidden = false;
      visibility.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(50);
    }

    const total = tick.mock.calls.reduce((sum, [elapsed]) => sum + elapsed, 0);
    expect(total).toBe(30_000);
    stop();
  });

  it('reports how much banked time a failing tick consumed', () => {
    vi.useFakeTimers();
    let currentTime = 0;
    const failure = new Error('transition failed');
    const tick = vi.fn(() => { throw failure; });
    const onError = vi.fn();
    const visibility = new EventTarget() as EventTarget & { hidden: boolean };
    visibility.hidden = false;
    const stop = startGameClock(tick, () => currentTime, onError, visibility as Document);

    // Bank two hours while hidden, then fail on the tick that tries to spend it. Without the
    // magnitude this is indistinguishable from losing a single 50ms slice.
    visibility.hidden = true;
    currentTime = 7_200_000;
    vi.advanceTimersByTime(50);
    visibility.hidden = false;
    visibility.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(50);

    expect(onError).toHaveBeenCalledWith(failure, 7_200_000);
    stop();
  });

  it('stops both timer ticks and visibility baseline resets', () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const now = vi.fn(() => 4_000);
    const visibility = new EventTarget() as EventTarget & { hidden: boolean };
    visibility.hidden = false;
    const stop = startGameClock(tick, now, undefined, visibility as Document);
    const callsBeforeStop = now.mock.calls.length;

    stop();
    vi.advanceTimersByTime(100);
    visibility.dispatchEvent(new Event('visibilitychange'));

    expect(tick).not.toHaveBeenCalled();
    expect(now).toHaveBeenCalledTimes(callsBeforeStop);
  });
});

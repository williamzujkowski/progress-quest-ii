// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import React from 'react';
import { useGameStore } from '../../state/gameStore';
import { useFilingVelocity } from '../../state/useFilingVelocity';

let shown: number | null | undefined;
const Probe: React.FC<{ now: () => number }> = ({ now }) => {
  shown = useFilingVelocity(now);
  return null;
};

const startSession = () => useGameStore.getState().startSession({
  source: 'creation', name: 'Velocity Subject', race: 'Half Orc', klass: 'Ur-Paladin', seed: 77,
});

afterEach(() => { vi.useRealTimers(); shown = undefined; });

describe('filing velocity sampling', () => {
  it('reports nothing until the sampled window is wide enough', () => {
    vi.useFakeTimers();
    startSession();
    let clock = 0;
    render(<Probe now={() => clock} />);
    expect(shown).toBeNull();

    // One further sample, but only ten seconds of span — still too narrow to mean anything.
    clock = 10_000;
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(shown).toBeNull();
  });

  it('reports a rate once enough time has been sampled', () => {
    vi.useFakeTimers();
    startSession();
    let clock = 0;
    render(<Probe now={() => clock} />);

    // Advance the clock and the store together: six ticks of a minute each.
    for (let step = 1; step <= 6; step += 1) {
      clock = step * 60_000;
      act(() => {
        useGameStore.getState().tick(60_000);
        vi.advanceTimersByTime(10_000);
      });
    }

    expect(typeof shown).toBe('number');
    expect(shown!).toBeGreaterThan(0);
  });

  it('stops sampling when unmounted', () => {
    vi.useFakeTimers();
    startSession();
    let clock = 0;
    const { unmount } = render(<Probe now={() => clock} />);
    unmount();
    const before = shown;
    clock = 600_000;
    act(() => { vi.advanceTimersByTime(600_000); });
    // No further renders, so the last reported value stands.
    expect(shown).toBe(before);
  });
});

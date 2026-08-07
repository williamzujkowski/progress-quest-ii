import { afterEach, describe, expect, it } from 'vitest';
import { MAX_PENDING_ELAPSED_MS } from '../../data/limits';
import { creditClosedElapsed, describeAbsence } from '../../state/sessionCheckpoint';
import { useGameStore } from '../../state/gameStore';

/**
 * Time the app spent closed, converted once at the load boundary. The engine never reads a
 * clock; it only ever receives elapsed milliseconds, which is what keeps replay deterministic.
 */

const session = (over: Partial<{ pendingElapsedMs: number; savedAtMs: number; isPaused: boolean }> = {}) => ({
  pendingElapsedMs: 0,
  isPaused: false,
  ...over,
});

// The store is a module singleton, so a test that starts a session leaves one running for
// whatever comes next. Captured before any test touches it and put back after each one, as the
// sibling suites do — the determinism test below drives thousands of ticks through it, and a
// suite that only survives because that test is near the end of the file is not surviving.
const originalState = useGameStore.getState();

afterEach(() => {
  useGameStore.setState(originalState, true);
});

describe('closed-app elapsed credit', () => {
  it('credits the time between the save and the reopen', () => {
    expect(creditClosedElapsed(session({ savedAtMs: 1_000 }), 61_000)).toBe(60_000);
  });

  it('adds to time already banked rather than replacing it', () => {
    expect(creditClosedElapsed(session({ savedAtMs: 1_000, pendingElapsedMs: 500 }), 1_500)).toBe(1_000);
  });

  it('credits nothing for a checkpoint written before timestamps existed', () => {
    // Old saves must keep loading and behave exactly as they did, not error.
    expect(creditClosedElapsed(session({ pendingElapsedMs: 250 }), 9_999_999)).toBe(250);
  });

  it('credits nothing when the clock has rolled backwards', () => {
    expect(creditClosedElapsed(session({ savedAtMs: 10_000, pendingElapsedMs: 42 }), 5_000)).toBe(42);
  });

  it('caps an absurd absence at the same ceiling live accrual uses', () => {
    const tenYears = 10 * 365 * 24 * 60 * 60 * 1000;
    expect(creditClosedElapsed(session({ savedAtMs: 0 }), tenYears)).toBe(MAX_PENDING_ELAPSED_MS);
  });

  it('honours a paused session across a close, as it does across a tab switch', () => {
    expect(creditClosedElapsed(session({ savedAtMs: 0, pendingElapsedMs: 7, isPaused: true }), 9_000_000)).toBe(7);
  });

  it('credits nothing when the current time is not a finite number', () => {
    expect(creditClosedElapsed(session({ savedAtMs: 0, pendingElapsedMs: 3 }), Number.NaN)).toBe(3);
  });
});

describe('offline catch-up determinism', () => {
  const START = { source: 'creation', name: 'Replay Subject', race: 'Half Daemon', klass: 'Incident Paladin', seed: 4242 } as const;

  const drive = (deliver: (tick: (ms: number) => void) => void) => {
    useGameStore.getState().startSession({ ...START });
    const tick = (ms: number) => useGameStore.getState().tick(ms);
    deliver(tick);
    // Drain whatever the 100-task cap carried forward, so both paths finish spending the budget.
    for (let guard = 0; guard < 5_000 && useGameStore.getState().pendingElapsedMs > 0; guard += 1) tick(1);
    const state = useGameStore.getState();
    return {
      character: structuredClone(state.character),
      progression: structuredClone(state.progression),
      rng: [...state.rng.getState()],
      completedTasks: state.progression.completedTasks,
    };
  };

  it('spends a closed-app lump exactly as it would have spent the same span live', () => {
    const TOTAL_MS = 45_000;

    // Live: the clock delivering 50ms at a time, as an open tab does.
    const live = drive((tick) => { for (let i = 0; i < TOTAL_MS / 50; i += 1) tick(50); });
    // Closed: the whole absence arriving at once, as creditClosedElapsed produces.
    const offline = drive((tick) => tick(TOTAL_MS));

    // If these diverge, offline progress is not the same game - it is a different one that
    // happens to run while you are away.
    expect(offline.completedTasks).toBe(live.completedTasks);
    expect(offline.character).toEqual(live.character);
    expect(offline.progression).toEqual(live.progression);
    expect(offline.rng).toEqual(live.rng);
  });
})

describe('absence copy', () => {
  it('reports the span without implying the absence was supervised', () => {
    expect(describeAbsence(30_000)).toMatch(/brief absence/i);
    expect(describeAbsence(5 * 60_000)).toBe('Absence of 5 minutes filed. Progress continued regardless.');
    expect(describeAbsence(60 * 60_000)).toBe('Absence of 1 hour filed. Progress continued regardless.');
    expect(describeAbsence(50 * 60 * 60_000)).toBe('Absence of 2 days filed. Progress continued regardless.');
  });

  it('claims no mechanic the engine does not model', () => {
    for (const ms of [0, 1_000, 90 * 60_000, 9 * 24 * 60 * 60_000]) {
      expect(describeAbsence(ms)).not.toMatch(/damage|dps|healed|bonus|reward|multiplier|offline earnings/i);
    }
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMENDATIONS_STORAGE_KEY } from '../../state/commendations';
import { useGameStore } from '../../state/gameStore';

/**
 * Catching up on a long absence is the one situation where the commendation ledger stops being
 * cheap. Records are maxima over events, which makes a new one rare during ordinary play — but
 * quests and acts are counted rather than compared, and a drain replays many of both per tick.
 * Persisting each one would put a synchronous stringify and localStorage write on the same thread
 * as the engine and the render, many times a second, for as long as the drain lasts.
 *
 * So the ledger is held in memory during the drain and written once it finishes. These tests pin
 * both halves of that: the writes stay away while work remains, and the figures are still correct
 * and still on disk when it is over.
 */

const originalState = useGameStore.getState();

const spyOnLedgerWrites = () => {
  const writes: string[] = [];
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(this: Storage, key: string, value: string) {
    if (key === COMMENDATIONS_STORAGE_KEY) writes.push(value);
  });
  return writes;
};

const startDrain = () => {
  useGameStore.getState().startSession({
    source: 'creation', name: 'Long Absence', race: 'Half Orc', klass: 'Ur-Paladin', seed: 4242,
  });
  // Far more than a single tick can spend, so the first tick is guaranteed to stop with work left.
  useGameStore.setState({ pendingElapsedMs: 0, isPaused: false });
};

afterEach(() => {
  vi.restoreAllMocks();
  useGameStore.setState(originalState, true);
  localStorage.clear();
});

describe('commendation writes during catch-up', () => {
  it('writes nothing while elapsed time remains to be drained', () => {
    startDrain();
    const writes = spyOnLedgerWrites();

    // One tick, deliberately given more than it can spend. The engine caps the work per tick and
    // returns the remainder, which is exactly the mid-drain condition.
    useGameStore.getState().tick(30 * 60 * 1000);

    expect(useGameStore.getState().pendingElapsedMs).toBeGreaterThan(0);
    // The panel reads the store, not the disk, so it is current regardless.
    expect(useGameStore.getState().commendations.questsCompleted).toBeGreaterThan(0);
    expect(writes).toEqual([]);
  });

  it('persists the accumulated ledger on the tick that finishes the drain', () => {
    startDrain();
    const writes = spyOnLedgerWrites();

    // Bank a backlog, then drain it the way the clock does: 50ms at a time until nothing is left.
    useGameStore.getState().tick(30 * 60 * 1000);
    expect(useGameStore.getState().pendingElapsedMs).toBeGreaterThan(0);
    for (let guard = 0; guard < 20_000 && useGameStore.getState().pendingElapsedMs > 0; guard += 1) {
      useGameStore.getState().tick(50);
    }

    const records = useGameStore.getState().commendations;
    expect(useGameStore.getState().pendingElapsedMs).toBe(0);
    expect(writes.length).toBeGreaterThan(0);
    // Whatever was accumulated across the whole drain is what landed, not just the last tick's.
    expect(JSON.parse(writes.at(-1)!)).toMatchObject({
      questsCompleted: records.questsCompleted,
      highestLevel: records.highestLevel,
    });
    expect(records.questsCompleted).toBeGreaterThan(0);
  });
});

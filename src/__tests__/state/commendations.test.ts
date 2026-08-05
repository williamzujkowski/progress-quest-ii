import { describe, expect, it } from 'vitest';
import type { GameTransitionEvent } from '../../engine/transition';
import {
  COMMENDATIONS_STORAGE_KEY, EMPTY_COMMENDATIONS, isEmpty,
  mergeEvents, readCommendations, writeCommendations,
} from '../../state/commendations';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    map,
  };
};

describe('commendation ledger', () => {
  it('keeps maxima rather than latest values', () => {
    const events: GameTransitionEvent[] = [
      { type: 'level_gained', level: 12 },
      { type: 'inventory_sold', gold: 400 },
      { type: 'level_gained', level: 3 },
      { type: 'inventory_sold', gold: 90 },
    ];
    const records = mergeEvents(EMPTY_COMMENDATIONS, events);
    // A new character starting over must not erase what an earlier one achieved.
    expect(records.highestLevel).toBe(12);
    expect(records.largestSale).toBe(400);
  });

  it('counts quests and acts', () => {
    const events: GameTransitionEvent[] = [
      { type: 'quest_completed', description: 'a' },
      { type: 'quest_completed', description: 'b' },
      { type: 'act_completed', act: 1 },
    ];
    const records = mergeEvents(EMPTY_COMMENDATIONS, events);
    expect(records.questsCompleted).toBe(2);
    expect(records.actsCompleted).toBe(1);
  });

  it('returns the same object when nothing changed, so callers can skip work', () => {
    const start = mergeEvents(EMPTY_COMMENDATIONS, [{ type: 'level_gained', level: 5 }]);
    const after = mergeEvents(start, [
      { type: 'level_gained', level: 2 },
      { type: 'task_started', task: { description: 'x', durationMs: 1, elapsedMs: 0, type: 'kill' } },
    ]);
    expect(after).toBe(start);
  });

  it('treats an unreadable ledger as no records rather than an error', () => {
    expect(readCommendations(fakeStorage({ [COMMENDATIONS_STORAGE_KEY]: 'not json' }))).toEqual(EMPTY_COMMENDATIONS);
    expect(readCommendations(fakeStorage({ [COMMENDATIONS_STORAGE_KEY]: '{"highestLevel":-4}' }))).toEqual(EMPTY_COMMENDATIONS);
    expect(readCommendations(fakeStorage())).toEqual(EMPTY_COMMENDATIONS);
    expect(readCommendations(undefined)).toEqual(EMPTY_COMMENDATIONS);
  });

  it('survives storage that throws on read or write', () => {
    const hostile = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(readCommendations(hostile)).toEqual(EMPTY_COMMENDATIONS);
    // A ledger that cannot be saved must never interrupt play.
    expect(() => writeCommendations(hostile, EMPTY_COMMENDATIONS)).not.toThrow();
  });

  it('round-trips through storage', () => {
    const storage = fakeStorage();
    const records = mergeEvents(EMPTY_COMMENDATIONS, [{ type: 'level_gained', level: 9 }]);
    writeCommendations(storage, records);
    expect(readCommendations(storage)).toEqual(records);
  });

  it('refuses to write a malformed ledger', () => {
    const storage = fakeStorage();
    writeCommendations(storage, { highestLevel: -1 } as never);
    expect(storage.map.size).toBe(0);
  });

  it('reports emptiness so the panel can stay away rather than show zeroes', () => {
    expect(isEmpty(EMPTY_COMMENDATIONS)).toBe(true);
    expect(isEmpty(mergeEvents(EMPTY_COMMENDATIONS, [{ type: 'act_completed', act: 1 }]))).toBe(false);
  });
});

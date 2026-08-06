import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameTransitionEvent } from '../../engine/transition';
import { MAX_PERSISTED_DESCRIPTION_LENGTH, MAX_STORED_PAYLOAD_LENGTH } from '../../data/limits';
import { EQUIP_SLOTS } from '../../data/traits';
import {
  COMMENDATIONS_STORAGE_KEY, EMPTY_COMMENDATIONS, isEmpty,
  mergeEvents, mergeExhibit, readCommendations, writeCommendations,
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

  it('keeps the finer item per slot and survives it being sold', () => {
    const notable = mergeExhibit(EMPTY_COMMENDATIONS, 'Weapon', 'Notable Stick', { label: 'notable', quality: 4 });
    const worse = mergeExhibit(notable, 'Weapon', 'Plain Stick', { label: 'serviceable', quality: 1 });
    // The record is about what was once owned, not what is worn now - selling must not erase it.
    expect(worse).toBe(notable);
    expect(worse.exhibit.Weapon?.name).toBe('Notable Stick');

    const better = mergeExhibit(notable, 'Weapon', 'Legendary Stick', { label: 'legendary', quality: 9 });
    expect(better.exhibit.Weapon?.name).toBe('Legendary Stick');
  });

  it('keeps the incumbent on a tie, so the record marks when a quality was first reached', () => {
    const first = mergeExhibit(EMPTY_COMMENDATIONS, 'Helm', 'First Helm', { label: 'notable', quality: 3 });
    expect(mergeExhibit(first, 'Helm', 'Second Helm', { label: 'notable', quality: 3 })).toBe(first);
  });

  it('ignores a slot that is not a real equipment slot', () => {
    expect(mergeExhibit(EMPTY_COMMENDATIONS, 'Trousers', 'Invented', { label: 'legendary', quality: 99 }))
      .toBe(EMPTY_COMMENDATIONS);
  });

  it('reports emptiness so the panel can stay away rather than show zeroes', () => {
    expect(isEmpty(EMPTY_COMMENDATIONS)).toBe(true);
    expect(isEmpty(mergeEvents(EMPTY_COMMENDATIONS, [{ type: 'act_completed', act: 1 }]))).toBe(false);
  });
});

describe('oversized ledger payloads', () => {
  // Restored here rather than inline: a failing assertion would skip an inline restore and leak
  // the JSON.parse stub into the next test, which is how one real failure becomes two confusing
  // ones. Observed while confirming the guard fails closed without its cap.
  afterEach(() => { vi.restoreAllMocks(); });

  it('refuses an over-long payload before parsing it', () => {
    // Proves the guard fires rather than merely exists: JSON.parse is replaced with a throw, so
    // a payload that reached it would fail loudly instead of degrading. The read still returns
    // the empty ledger, which means the cap rejected it first.
    const oversized = `{"padding":"${'x'.repeat(MAX_STORED_PAYLOAD_LENGTH)}"}`;
    const parse = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw new Error('parse must not be reached for an oversized payload');
    });

    expect(readCommendations(fakeStorage({ [COMMENDATIONS_STORAGE_KEY]: oversized }))).toEqual(EMPTY_COMMENDATIONS);
    expect(parse).not.toHaveBeenCalled();
  });

  it('still reads a legitimate ledger that sits under the cap', () => {
    // The cap must not be so tight that it rejects what the schema would accept. A full exhibit
    // with maximum-length names is the largest legitimate ledger there is.
    const exhibit = Object.fromEntries(EQUIP_SLOTS.map((slot) => [
      slot, { name: 'N'.repeat(MAX_PERSISTED_DESCRIPTION_LENGTH), label: 'legendary', quality: 99 },
    ]));
    const full = JSON.stringify({
      highestLevel: 99, largestSale: 1234, questsCompleted: 7, actsCompleted: 3, exhibit,
    });

    expect(full.length).toBeLessThan(MAX_STORED_PAYLOAD_LENGTH);
    expect(readCommendations(fakeStorage({ [COMMENDATIONS_STORAGE_KEY]: full }))).toMatchObject({ highestLevel: 99 });
  });
});

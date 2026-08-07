import { describe, expect, it } from 'vitest';
import { venueBulletin } from '../../state/venueBulletin';

const town = (over: Partial<{ location: string; act: number }> = {}) =>
  ({ venue: 'town' as const, location: 'Bleeding Cliffs', act: 2, ...over });

describe('venue bulletins', () => {
  it('reports nothing where the venue keeps no catalogue', () => {
    // A road is passed through rather than administered, a raid takes attendance instead, and a
    // cinematic is not a place at all.
    for (const venue of ['road', 'raid', 'cinematic'] as const) {
      expect(venueBulletin({ ...town(), venue })).toBeNull();
    }
  });

  it('gives the field and the dungeon their own notices rather than the town ones', () => {
    const townOffices = venueBulletin(town())!;
    const field = venueBulletin({ ...town(), venue: 'field' })!;
    const dungeon = venueBulletin({ ...town(), venue: 'dungeon' })!;

    for (const bulletin of [field, dungeon]) {
      expect(bulletin).toHaveLength(3);
      expect(new Set(bulletin).size).toBe(bulletin.length);
    }
    // Each venue draws from its own catalogue, or the joke is the same joke three times.
    expect(field.some((entry) => townOffices.includes(entry))).toBe(false);
    expect(dungeon.some((entry) => field.includes(entry))).toBe(false);
  });

  it('lists a scannable few, all distinct', () => {
    // Two sanitation boards is a different joke and not this one.
    const offices = venueBulletin(town())!;
    expect(offices).toHaveLength(3);
    expect(new Set(offices).size).toBe(offices.length);
  });

  it('keeps its offices while the hero stands there', () => {
    expect(venueBulletin(town())).toEqual(venueBulletin(town()));
  });

  it('gives different towns different offices', () => {
    const rosters = new Set(
      ['Bleeding Cliffs', 'Ironclad Bottom', 'Nowhere', 'Doubt', 'Middling'].map(
        (location) => venueBulletin(town({ location }))!.join('|'),
      ),
    );
    expect(rosters.size).toBeGreaterThan(1);
  });

  it('stays distinct even where each catalogue wraps', () => {
    // The roster is chosen by walking forward from a hashed start, so a start near the end of the
    // catalogue wraps. Distinctness has to survive that, and a rejection loop would have been the
    // fragile way to get it.
    for (const venue of ['town', 'field', 'dungeon'] as const) {
      for (let act = 0; act < 60; act += 1) {
        const entries = venueBulletin({ ...town({ act }), venue })!;
        expect(new Set(entries).size).toBe(entries.length);
      }
    }
  });

  it('claims no mechanic the engine does not model', () => {
    const forbidden = /heal|repair|upgrade|train|restore|damage|bonus|discount/i;
    for (const venue of ['town', 'field', 'dungeon'] as const) {
      for (let act = 0; act < 40; act += 1) {
        for (const entry of venueBulletin({ ...town({ act }), venue })!) expect(entry).not.toMatch(forbidden);
      }
    }
  });
});

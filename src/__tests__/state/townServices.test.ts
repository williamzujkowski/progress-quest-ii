import { describe, expect, it } from 'vitest';
import { townServices } from '../../state/townServices';

const town = (over: Partial<{ location: string; act: number }> = {}) =>
  ({ venue: 'town' as const, location: 'Bleeding Cliffs', act: 2, ...over });

describe('town services', () => {
  it('reports nothing outside a town', () => {
    // A field has no civic infrastructure, and inventing some would be the scenery this replaces.
    for (const venue of ['field', 'road', 'dungeon', 'raid', 'cinematic'] as const) {
      expect(townServices({ ...town(), venue })).toBeNull();
    }
  });

  it('lists a scannable few, all distinct', () => {
    // Two sanitation boards is a different joke and not this one.
    const offices = townServices(town())!;
    expect(offices).toHaveLength(3);
    expect(new Set(offices).size).toBe(offices.length);
  });

  it('keeps its offices while the hero stands there', () => {
    expect(townServices(town())).toEqual(townServices(town()));
  });

  it('gives different towns different offices', () => {
    const rosters = new Set(
      ['Bleeding Cliffs', 'Iron Bottom', 'Nowhere', 'Doubt', 'Middling'].map(
        (location) => townServices(town({ location }))!.join('|'),
      ),
    );
    expect(rosters.size).toBeGreaterThan(1);
  });

  it('stays distinct even where the catalogue wraps', () => {
    // The roster is chosen by walking forward from a hashed start, so a start near the end of the
    // catalogue wraps. Distinctness has to survive that, and a rejection loop would have been the
    // fragile way to get it.
    for (let act = 0; act < 60; act += 1) {
      const offices = townServices(town({ act }))!;
      expect(new Set(offices).size).toBe(offices.length);
    }
  });

  it('claims no mechanic the engine does not model', () => {
    const forbidden = /heal|repair|upgrade|train|restore|damage|bonus|discount/i;
    for (let act = 0; act < 40; act += 1) {
      for (const office of townServices(town({ act }))!) expect(office).not.toMatch(forbidden);
    }
  });
});

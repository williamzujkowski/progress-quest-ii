import { describe, expect, it } from 'vitest';
import { adversaryDossier, standingFor } from '../../state/adversaryDossier';

describe('adversary standing', () => {
  it('rises with the docket count and never falls', () => {
    let previous = -1;
    const order = ['unfiled', 'known', 'habitual', 'nemesis'];
    for (const dockets of [0, 1, 7, 8, 24, 25, 400]) {
      const rank = order.indexOf(standingFor(dockets));
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
    expect(standingFor(0)).toBe('unfiled');
    expect(standingFor(400)).toBe('nemesis');
  });
});

describe('adversary dossier', () => {
  it('reports nothing when the engine named no target', () => {
    // An unnamed quest has no adversary, and inventing one is a claim this project does not make.
    expect(adversaryDossier(undefined, 4)).toBeNull();
    expect(adversaryDossier('', 4)).toBeNull();
  });

  it('states the count plainly beside the flourish', () => {
    // The joke decorates a fact; it never stands in for one.
    expect(adversaryDossier('Kobold', 14)?.summary).toMatch(/^14 dockets on file\. /);
    expect(adversaryDossier('Imp', 1)?.summary).toMatch(/^1 docket on file\. /);
  });

  it('says so rather than reporting a bare zero', () => {
    expect(adversaryDossier('Rat', 0)?.summary).toMatch(/^Nothing previously filed\. /);
  });

  it('holds still for one adversary and differs between them', () => {
    expect(adversaryDossier('Kobold', 14)).toEqual(adversaryDossier('Kobold', 14));
    const summaries = new Set(
      ['Kobold', 'Imp', 'Gorgosaurus', 'fruit fly', 'Duke'].map((t) => adversaryDossier(t, 14)?.summary),
    );
    expect(summaries.size).toBeGreaterThan(1);
  });

  it('refuses a count that is not a count', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -5]) {
      const dossier = adversaryDossier('Kobold', bad);
      expect(dossier?.dockets).toBe(0);
      expect(dossier?.summary).toMatch(/^Nothing previously filed\./);
    }
    // A fractional count is floored rather than rendered with a decimal point.
    expect(adversaryDossier('Kobold', 3.7)?.dockets).toBe(3);
  });

  it('never implies the adversary is more dangerous for being familiar', () => {
    // CONTEXT.md's bar: encounter time depends on opponent puissance and character level only.
    // A long history must not read as a threat rating.
    const forbidden = /danger|tough|stronger|harder|weaker|damage|resist|threat level/i;
    for (const dockets of [0, 1, 8, 25, 500]) {
      expect(adversaryDossier('Kobold', dockets)!.summary).not.toMatch(forbidden);
    }
  });
});

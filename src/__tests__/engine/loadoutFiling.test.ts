import { describe, expect, it } from 'vitest';
import { fileLoadout } from '../../engine/loadoutFiling';
import { encounterSpeedMultiplier, loadoutQuality } from '../../engine/loadout';
import { createNewCharacter } from '../../engine/sim';
import { RandomGenerator } from '../../engine/prng';
import type { CharacterSheet } from '../../engine/types';

const wearing = (equip: Partial<CharacterSheet['Equip']>): CharacterSheet => {
  const character = createNewCharacter('Filed', 'Half Daemon', 'Robot Monk', new RandomGenerator('filing'));
  const empty = Object.fromEntries(Object.keys(character.Equip).map((slot) => [slot, ''])) as CharacterSheet['Equip'];
  return { ...character, Equip: { ...empty, ...equip } };
};

describe('the loadout, said out loud', () => {
  it('reports the reduction the engine actually applies, not a recomputed one', () => {
    // The point of the whole exercise. A filing that disagreed with the arithmetic would be the
    // failure this exists to fix rather than an instance of it, so the figure is taken from the
    // same function the transition multiplies by.
    const character = wearing({ Weapon: 'Vested Board Directive', Helm: 'Bonded Corner Office' });
    const filing = fileLoadout(character);

    const expected = Math.round((1 - encounterSpeedMultiplier(loadoutQuality(character))) * 100);
    expect(filing.reductionPercent).toBe(expected);
    expect(filing.reductionPercent).toBeGreaterThan(0);
  });

  it('agrees with the engine even when a negative item drags the total down', () => {
    // Summing the positive slots would disagree the moment something threadbare is worn, and the
    // disagreement would be invisible — both numbers look plausible.
    const character = wearing({ Helm: 'Corner Office', Hauberk: '-30 Cover Note' });
    const filing = fileLoadout(character);

    expect(filing.reductionPercent).toBe(Math.round((1 - encounterSpeedMultiplier(loadoutQuality(character))) * 100));
    // The good item is still cited even though the loadout as a whole earns nothing.
    expect(filing.itemOfRecord?.slot).toBe('Helm');
  });

  it('names the best thing being worn, and orders the rest behind it', () => {
    const filing = fileLoadout(wearing({
      Helm: 'Lanyard', Hauberk: 'Lender of Last Resort', Sollerets: 'Campus',
    }));

    expect(filing.itemOfRecord?.name).toBe('Lender of Last Resort');
    expect(filing.contributors.map(({ quality }) => quality)).toEqual(
      [...filing.contributors.map(({ quality }) => quality)].sort((left, right) => right - left),
    );
  });

  it('says nothing at all about an empty loadout', () => {
    const filing = fileLoadout(wearing({}));

    expect(filing.itemOfRecord).toBeNull();
    expect(filing.contributors).toEqual([]);
    expect(filing.reductionPercent).toBe(0);
    expect(filing.repeatedModifier).toBeNull();
  });

  it('notices a modifier worn three times, and not two', () => {
    // Bases cannot collide any more — each slot has its own vocabulary — but modifiers are still
    // drawn from one shared list, so three Bonded things is ordinary rather than exotic.
    const twice = fileLoadout(wearing({ Helm: 'Bonded Lanyard', Hauberk: 'Bonded Cover Note' }));
    expect(twice.repeatedModifier).toBeNull();

    const thrice = fileLoadout(wearing({
      Helm: 'Bonded Lanyard', Hauberk: 'Bonded Cover Note', Sollerets: 'Bonded Desk Space',
    }));
    expect(thrice.repeatedModifier).toEqual({ name: 'Bonded', slots: 3 });
  });

  it('ignores a slot whose contents it cannot read', () => {
    // Two separate cases, and they were nearly conflated. An uncatalogued name is *readable* — the
    // analyser returns a real breakdown totalling zero — and is excluded by the zero filter, not by
    // the null guard. Only a placeholder returns no breakdown at all, which is the guard's job and
    // is reachable from an imported save.
    const uncatalogued = fileLoadout(wearing({ Helm: 'Something Nobody Catalogued', Hauberk: 'Cover Note' }));
    expect(uncatalogued.itemOfRecord?.slot).toBe('Hauberk');
    expect(uncatalogued.contributors.every(({ slot }) => slot !== 'Helm')).toBe(true);

    const placeholder = fileLoadout(wearing({ Helm: '—', Hauberk: 'Cover Note' }));
    expect(placeholder.itemOfRecord?.slot).toBe('Hauberk');
    expect(placeholder.contributors.every(({ slot }) => slot !== 'Helm')).toBe(true);
  });

  it('is a pure function of the sheet', () => {
    const character = wearing({ Helm: 'Bonded Corner Office' });
    const before = JSON.stringify(character);

    expect(JSON.stringify(fileLoadout(character))).toBe(JSON.stringify(fileLoadout(character)));
    expect(JSON.stringify(character)).toBe(before);
  });
});

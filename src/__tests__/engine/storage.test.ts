import { describe, expect, it } from 'vitest';
import { storageAllowance } from '../../engine/storage';
import { calculateEncumbranceMax } from '../../engine/math';
import { armourTableForSlot } from '../../data/armourBySlot';
import { createNewCharacter, generateTaskDescription } from '../../engine/sim';
import { RandomGenerator } from '../../engine/prng';
import type { CharacterSheet } from '../../engine/types';

const wearing = (Gambeson: string): CharacterSheet['Equip'] => {
  const character = createNewCharacter('Padded', 'Half Daemon', 'Robot Monk', new RandomGenerator('padding'));
  return { ...character.Equip, Gambeson };
};

describe('the padding slot, and what it lets the hero carry', () => {
  it('grants nothing when the slot is empty, and something when it is not', () => {
    // The two ends of the ladder, named. Asserting a range here would admit a constant, which is the
    // shape a broken lookup takes — an earlier spike computed the allowance from a table index that
    // was always -1, so every item granted zero and the whole suite went green anyway.
    expect(storageAllowance(wearing(''))).toBe(0);
    expect(storageAllowance(wearing('Spare Pen'))).toBe(1);
    expect(storageAllowance(wearing('Doomsday Vault'))).toBe(10);
  });

  it('rises monotonically along the whole vocabulary, and is never flat', () => {
    const rungs = armourTableForSlot('Gambeson').map(([name]) => storageAllowance(wearing(name)));

    expect(rungs).toHaveLength(20);
    for (const [index, allowance] of rungs.entries()) {
      expect(allowance).toBeGreaterThan(0);
      if (index > 0) expect(allowance).toBeGreaterThanOrEqual(rungs[index - 1]!);
    }
    // A ladder every rung of which grants the same thing is not a ladder.
    expect(new Set(rungs).size).toBeGreaterThan(1);
    expect(rungs.at(-1)).toBeGreaterThan(rungs[0]!);
  });

  it('reads the base noun, not the total the engine tops the item up to', () => {
    // `generateEquipUpgrade` adds modifiers and an assessor's mark until an item's total equals the
    // character's level, so a total-derived allowance would say what act the hero is in rather than
    // what they are wearing, and every slot would grant the same number.
    expect(storageAllowance(wearing('-4 Lapsed Contested Doomsday Vault')))
      .toBe(storageAllowance(wearing('Doomsday Vault')));
    expect(storageAllowance(wearing('+9 Doomsday Vault'))).toBe(storageAllowance(wearing('Doomsday Vault')));
  });

  it('is the padding slot alone, not any slot holding a grand-sounding noun', () => {
    const character = createNewCharacter('Elsewhere', 'Half Daemon', 'Robot Monk', new RandomGenerator('elsewhere'));
    const hoardEverywhereElse: CharacterSheet['Equip'] = {
      ...character.Equip, Gambeson: '', Sollerets: 'Land Bank', Helm: 'Corner Office', Hauberk: 'Cover Note',
    };

    expect(storageAllowance(hoardEverywhereElse)).toBe(0);
  });

  it('grants nothing for a name it cannot read', () => {
    // Reachable from an imported save, where the slot holds whatever the file said.
    expect(storageAllowance(wearing('Something Nobody Catalogued'))).toBe(0);
    expect(storageAllowance(wearing('—'))).toBe(0);
  });

  it('is inert for the loadout every recorded fixture starts and stays in', () => {
    // The licence ADR 0008 grants: an engine effect may ship if it is inert at the fixtures' state.
    // Instrumenting the golden suite showed this path reached seven times, every one of them with an
    // empty Gambeson, so the pinned capacity of 20 is untouched. This pins the premise rather than
    // the conclusion — if a fixture were ever to acquire padding, this fails before the goldens do
    // and says why.
    const fixtureLoadout = wearing('');
    expect(storageAllowance({ ...fixtureLoadout, Weapon: 'Sharp Rock', Hauberk: '-3 Boilerplate' })).toBe(0);
    expect(calculateEncumbranceMax(10, storageAllowance(fixtureLoadout))).toBe(calculateEncumbranceMax(10));
  });

  it('actually defers the market trip, rather than only reporting a larger number', () => {
    // The effect is worth nothing if it moves a readout and not the engine. Both heroes carry the
    // same load; only the padded one is still allowed to keep questing.
    const character = createNewCharacter('Laden', 'Half Daemon', 'Robot Monk', new RandomGenerator('laden'));
    const capacity = calculateEncumbranceMax(character.Stats.STR);
    const load = Array.from({ length: capacity }, (_unused, index) => ({ name: `pelt ${index}`, qty: 1 }));
    const laden = { ...character, Inventory: load, Gold: 0 };

    const bare = generateTaskDescription(new RandomGenerator('trip'), laden);
    const padded = generateTaskDescription(
      new RandomGenerator('trip'),
      { ...laden, Equip: { ...laden.Equip, Gambeson: 'Doomsday Vault' } },
    );

    expect(bare.type).toBe('heading_to_market');
    expect(padded.type).not.toBe('heading_to_market');
  });

  it('is a pure function of the slot', () => {
    const equip = wearing('War Chest');
    const before = JSON.stringify(equip);

    expect(storageAllowance(equip)).toBe(storageAllowance(equip));
    expect(JSON.stringify(equip)).toBe(before);
  });
});

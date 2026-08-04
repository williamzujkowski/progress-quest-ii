import { describe, expect, it } from 'vitest';
import { analyzeItemMechanics } from '../../engine/itemMechanics';

describe('item mechanics', () => {
  it('explains every part of generated equipment quality without inventing combat damage', () => {
    expect(analyzeItemMechanics({
      kind: 'equipment',
      name: '+2 Venomed Vicious Shortsword',
      slot: 'Weapon',
    })).toEqual({
      kind: 'equipment',
      quality: {
        base: { name: 'Shortsword', value: 5 },
        modifiers: [
          { name: 'Vicious', value: 3 },
          { name: 'Venomed', value: 4 },
        ],
        mark: { label: '+2', value: 2 },
        total: 14,
      },
      combatContribution: 'none',
    });
  });

  it('reports spell rank without inventing spell damage', () => {
    expect(analyzeItemMechanics({ kind: 'spell', level: 2 })).toEqual({
      kind: 'spell',
      rank: 2,
      combatContribution: 'none',
    });
  });

  it('reports the exact encumbrance contributed by an inventory stack', () => {
    expect(analyzeItemMechanics({ kind: 'inventory', name: 'rat tail', quantity: 3 })).toEqual({
      kind: 'inventory',
      quantity: 3,
      encumbranceCubits: 3,
      combatContribution: 'none',
    });
  });

  it('retains negative quality marks and reports empty equipment explicitly', () => {
    expect(analyzeItemMechanics({ kind: 'equipment', name: '-3 Burlap', slot: 'Hauberk' })).toMatchObject({
      quality: {
        base: { name: 'Burlap', value: 3 },
        mark: { label: '-3', value: -3 },
        total: 0,
      },
    });
    expect(analyzeItemMechanics({ kind: 'equipment', name: '—', slot: 'Shield' })).toEqual({
      kind: 'equipment',
      quality: null,
      combatContribution: 'none',
    });
  });

  it('keeps Gold out of encumbrance', () => {
    expect(analyzeItemMechanics({ kind: 'inventory', name: 'Gold', quantity: 42 })).toEqual({
      kind: 'inventory',
      quantity: 42,
      encumbranceCubits: 0,
      combatContribution: 'none',
    });
  });
});

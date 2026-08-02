import { describe, expect, it } from 'vitest';
import { describeEquipment, describeInventoryItem, describeSpell } from '../data/itemDetails';

describe('item tooltip details', () => {
  it('reports equipment slot power without inventing combat damage', () => {
    const details = describeEquipment('Venomed Shortsword', 'Weapon');

    expect(details.effect).toContain('Attack rating: 9');
    expect(details.effect).toContain('damage and mitigation remain abstract');
  });

  it('explains spell level and keeps the abstract combat model explicit', () => {
    const details = describeSpell('Rabbit Punch', 2);

    expect(details.description).toContain('high velocity');
    expect(details.effect).toContain('Spell level: 2');
    expect(details.effect).toContain('exact damage is intentionally not surfaced');
  });

  it('describes loot quantity and encumbrance without claiming combat stats', () => {
    const details = describeInventoryItem('Golden Orb of Fortune', 3);

    expect(details.description).toMatch(/treasure|heirloom/);
    expect(details.effect).toContain('Quantity carried: 3');
    expect(details.effect).toContain('no direct combat effect');
  });

  it('varies flavor deterministically by item context', () => {
    const first = describeInventoryItem('Golden Orb of Fortune', 3).description;
    const repeat = describeInventoryItem('Golden Orb of Fortune', 3).description;
    const other = describeInventoryItem('Golden Orb of Fortune', 4).description;

    expect(repeat).toBe(first);
    expect(other).not.toBe(first);
  });
});

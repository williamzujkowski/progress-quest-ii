import { describe, expect, it } from 'vitest';
import { describeEquipment, describeInventoryItem, describeSpell } from '../data/itemDetails';

describe('item tooltip details', () => {
  it('reports equipment slot power without inventing combat damage', () => {
    const details = describeEquipment('Venomed Shortsword', 'Weapon');

    expect(details.effect).toContain('Attack rating: 9');
    expect(details.effect).toContain('damage and mitigation remain abstract');
  });

  it('keeps spell flavor stable across levels without inventing a combat effect', () => {
    const details = describeSpell('Rabbit Punch', 2);

    expect(details.description).toContain('high velocity');
    expect(describeSpell('Rabbit Punch', 7).description).toBe(details.description);
    expect(details.effect).toBe('Spell level: 2. The simulation does not expose a spell-specific combat effect.');
  });

  it('describes loot quantity and encumbrance without claiming combat stats', () => {
    const details = describeInventoryItem('Golden Orb of Fortune', 3);

    expect(details.description).toMatch(/treasure|heirloom/);
    expect(details.effect).toContain('Quantity carried: 3');
    expect(details.effect).toContain('no direct combat effect');
  });

  it('reports Gold as weightless currency', () => {
    expect(describeInventoryItem('Gold', 42).effect).toBe(
      'Quantity carried: 42. Gold is weightless currency; it does not contribute to encumbrance or combat.',
    );
  });

  it('keeps an inventory item story stable when its quantity changes', () => {
    const first = describeInventoryItem('Golden Orb of Fortune', 3).description;
    const repeat = describeInventoryItem('Golden Orb of Fortune', 3).description;
    const other = describeInventoryItem('Golden Orb of Fortune', 4).description;

    expect(repeat).toBe(first);
    expect(other).toBe(first);
  });
});

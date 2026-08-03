import { describe, expect, it } from 'vitest';
import { describeEquipment, describeInventoryItem, describeSpell } from '../data/itemDetails';
import { SPELLS } from '../data/traits';

describe('item tooltip details', () => {
  it('reports equipment slot power without inventing combat damage', () => {
    const details = describeEquipment('Venomed Shortsword', 'Weapon');

    expect(details.description).toContain('Venomed');
    expect(details.description).toContain('Shortsword');
    expect(details.effect).toContain('Attack rating: 9');
    expect(details.effect).toContain('damage and mitigation remain abstract');
  });

  it('keeps an explicit equipment rating mark in the item story', () => {
    const details = describeEquipment('-3 Burlap', 'Hauberk');

    expect(details.description).toContain('-3');
    expect(details.description).toContain('Burlap');
    expect(details.effect).toContain('Defense rating: 0');
  });

  it('keeps spell flavor stable across levels without inventing a combat effect', () => {
    const details = describeSpell('Rabbit Punch', 2);

    expect(details.description).toContain('customary envelope');
    expect(describeSpell('Rabbit Punch', 7).description).toBe(details.description);
    expect(details.effect).toBe('Spell level: 2. The simulation does not expose a spell-specific combat effect.');
  });

  it('gives every canonical spell a distinct bounded description', () => {
    const descriptions = SPELLS.map((name) => describeSpell(name, 1).description);

    expect(new Set(descriptions).size).toBe(SPELLS.length);
    expect(descriptions.every((description) => description.length <= 220)).toBe(true);
  });

  it('keeps an accepted unknown spell identifiable', () => {
    expect(describeSpell('Conjure Meeting Minutes', 1).description).toContain('Conjure Meeting Minutes');
  });

  it('describes loot quantity and encumbrance without claiming combat stats', () => {
    const details = describeInventoryItem('Golden Orb of Fortune', 3);

    expect(details.description).toContain('Golden');
    expect(details.description).toContain('Orb');
    expect(details.description).toContain('Fortune');
    expect(details.description.length).toBeLessThanOrEqual(220);
    expect(details.effect).toContain('Quantity carried: 3');
    expect(details.effect).toContain('no direct combat effect');
  });

  it('reports Gold as weightless currency', () => {
    const details = describeInventoryItem('Gold', 42);

    expect(details.description).toContain('Gold');
    expect(details.effect).toBe(
      'Quantity carried: 42. Gold is weightless currency; it does not contribute to encumbrance or combat.',
    );
  });

  it('names the monster in a recovered-item incident report', () => {
    const description = describeInventoryItem('Gelatinous Cube item', 1).description;

    expect(description).toContain('Gelatinous Cube');
    expect(description.length).toBeLessThanOrEqual(220);
  });

  it('does not invent monster provenance for an accepted unknown item', () => {
    expect(describeInventoryItem('Uncatalogued item', 1).description).not.toContain('Recovered from');
  });

  it('names mundane loot in its bureaucratic demotion story', () => {
    const description = describeInventoryItem('nail', 1).description;

    expect(description).toContain('nail');
    expect(description).toContain('treasure');
  });

  it('keeps an accepted unknown item identifiable', () => {
    expect(describeInventoryItem('Uncatalogued Chair', 1).description).toContain('Uncatalogued Chair');
  });

  it('keeps an inventory item story stable when its quantity changes', () => {
    const first = describeInventoryItem('Golden Orb of Fortune', 3).description;
    const repeat = describeInventoryItem('Golden Orb of Fortune', 3).description;
    const other = describeInventoryItem('Golden Orb of Fortune', 4).description;

    expect(repeat).toBe(first);
    expect(other).toBe(first);
  });
});

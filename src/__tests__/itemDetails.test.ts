import { describe, expect, it } from 'vitest';
import { describeEquipment, describeInventoryItem, describeSpell } from '../data/itemDetails';
import {
  ARMORS,
  BORING_ITEMS,
  DEFENSE_ATTRIB,
  DEFENSE_BAD,
  EQUIP_SLOTS,
  ITEM_ATTRIB,
  ITEM_OFS,
  MONSTERS,
  OFFENSE_ATTRIB,
  OFFENSE_BAD,
  SHIELDS,
  SPECIALS,
  SPELLS,
  WEAPONS,
} from '../data/traits';

const withoutIdentityToken = (description: string, ...tokens: string[]): string =>
  tokens.reduce((result, token) => result.replaceAll(token, '<identity>'), description);

describe('item tooltip details', () => {
  it('reports generated equipment quality without inventing combat damage', () => {
    const details = describeEquipment('Venomed Shortsword', 'Weapon');

    expect(details.description).toContain('Venomed');
    expect(details.description).toContain('Shortsword');
    expect(details.effect).toBe(
      'Generation quality: 9 (Shortsword 5 + Venomed +4). Combat contribution: none; classic encounter time ignores equipment.',
    );
  });

  it('keeps an explicit equipment quality mark in the item story', () => {
    const details = describeEquipment('-3 Burlap', 'Hauberk');

    expect(details.description).toContain('-3');
    expect(details.description).toContain('Burlap');
    expect(details.effect).toContain('Generation quality: 0');
  });

  it('includes every canonical modifier in an accepted equipment name', () => {
    const details = describeEquipment('Venomed Vicious Stick', 'Weapon');

    expect(details.description).toContain('Venomed');
    expect(details.description).toContain('Vicious');
    expect(details.effect).toContain('Generation quality: 7');
  });

  it('preserves canonical modifier order in an equipment micro-story', () => {
    const originalOrder = describeEquipment('Venomed Vicious Stick', 'Weapon');
    const alternateOrder = describeEquipment('Vicious Venomed Stick', 'Weapon');

    expect(originalOrder.description).toBe(alternateOrder.description);
    expect(originalOrder.effect).toBe(alternateOrder.effect);
  });

  it('keeps the equipped slot meaningful for the same armor', () => {
    const armorSlots = EQUIP_SLOTS.filter((slot) => slot !== 'Weapon' && slot !== 'Shield');
    const descriptions = armorSlots.map((slot) => describeEquipment('Burlap', slot).description);

    expect(new Set(descriptions).size).toBe(armorSlots.length);
  });

  it.each([
    ['accepted long equipment', 'X'.repeat(200), 'Helm' as const],
    ['stacked canonical equipment', '+100 Threadbare Diamond Mail', 'Hauberk' as const],
  ])('bounds %s flavor', (_case, name, slot) => {
    expect(describeEquipment(name, slot).description.length).toBeLessThanOrEqual(220);
  });

  it.each([
    ['unsafe integer', '9'.repeat(194)],
    ['oversized zero', '0'.repeat(194)],
    ['leading zeros', `${'0'.repeat(193)}1`],
  ])('does not treat an imported %s prefix as an equipment quality mark', (_case, mark) => {
    const details = describeEquipment(`${mark} Stick`, 'Weapon');

    expect([...details.description].length).toBeLessThanOrEqual(220);
    expect(details.effect).toContain('Generation quality: 0 (Stick 0).');
    expect(details.effect).not.toMatch(/Infinity|NaN|e\+/);
  });

  it('keeps every generated equipment identity distinct and bounded', () => {
    const equipment = [
      ...WEAPONS.flatMap(([base]) => [...OFFENSE_ATTRIB, ...OFFENSE_BAD].map(([modifier]) => [`${modifier} ${base}`, 'Weapon', modifier, base] as const)),
      ...SHIELDS.flatMap(([base]) => [...DEFENSE_ATTRIB, ...DEFENSE_BAD].map(([modifier]) => [`${modifier} ${base}`, 'Shield', modifier, base] as const)),
      ...EQUIP_SLOTS.filter((slot) => slot !== 'Weapon' && slot !== 'Shield').flatMap((slot) =>
        ARMORS.flatMap(([base]) => [...DEFENSE_ATTRIB, ...DEFENSE_BAD].map(([modifier]) => [`${modifier} ${base}`, slot, modifier, base] as const))),
    ];
    const descriptions = equipment.map(([name, slot]) => describeEquipment(name, slot).description);
    const signatures = descriptions.map((description, index) => {
      const item = equipment[index];
      return item ? withoutIdentityToken(description, item[2], item[3]) : '';
    });

    expect(new Set(descriptions).size).toBe(equipment.length);
    expect(descriptions.every((description) => description.length <= 220)).toBe(true);
    // Identity words are stripped: this rejects the old three-template catalog while preserving deliberate motifs.
    expect(new Set(signatures).size).toBeGreaterThanOrEqual(1_500);
  });

  it('gives neighboring equipment bases meaning beyond the interpolated noun', () => {
    const stick = withoutIdentityToken(describeEquipment('Polished Stick', 'Weapon').description, 'Stick');
    const shiv = withoutIdentityToken(describeEquipment('Polished Shiv', 'Weapon').description, 'Shiv');

    expect(stick).not.toBe(shiv);
  });

  it('gives neighboring equipment modifiers meaning beyond the interpolated adjective', () => {
    const venomed = withoutIdentityToken(describeEquipment('Venomed Shortsword', 'Weapon').description, 'Venomed');
    const vicious = withoutIdentityToken(describeEquipment('Vicious Shortsword', 'Weapon').description, 'Vicious');

    expect(venomed).not.toBe(vicious);
  });

  it('gives every canonical equipment base a distinct idea in the same context', () => {
    const weaponStories = WEAPONS.map(([base]) =>
      withoutIdentityToken(describeEquipment(`Polished ${base}`, 'Weapon').description, base));
    const shieldStories = SHIELDS.map(([base]) =>
      withoutIdentityToken(describeEquipment(`Studded ${base}`, 'Shield').description, base));
    const armorStories = ARMORS.map(([base]) =>
      withoutIdentityToken(describeEquipment(`Studded ${base}`, 'Hauberk').description, base));

    expect(new Set(weaponStories).size).toBe(WEAPONS.length);
    expect(new Set(shieldStories).size).toBe(SHIELDS.length);
    expect(new Set(armorStories).size).toBe(ARMORS.length);
  });

  it('gives every canonical equipment modifier a distinct idea in the same context', () => {
    const offense = [...OFFENSE_ATTRIB, ...OFFENSE_BAD].map(([modifier]) =>
      withoutIdentityToken(describeEquipment(`${modifier} Stick`, 'Weapon').description, modifier));
    const defense = [...DEFENSE_ATTRIB, ...DEFENSE_BAD].map(([modifier]) =>
      withoutIdentityToken(describeEquipment(`${modifier} Burlap`, 'Hauberk').description, modifier));

    expect(new Set(offense).size).toBe(offense.length);
    expect(new Set(defense).size).toBe(defense.length);
  });

  it('keeps equipment stories to two sentences and bounds stacked imported modifiers', () => {
    const modifiers = [...OFFENSE_ATTRIB, ...OFFENSE_BAD].map(([modifier]) => modifier).join(' ');
    const stacked = describeEquipment(`+100 ${modifiers} Stick`, 'Weapon').description;
    const ordinary = describeEquipment('Polished Stick', 'Weapon').description;
    const sentenceCount = (description: string): number => description.match(/[.!?](?:\s|$)/g)?.length ?? 0;

    expect([...stacked].length).toBeLessThanOrEqual(220);
    expect(sentenceCount(ordinary)).toBeLessThanOrEqual(2);
  });

  it('bounds a retained safe mark combined with stacked modifiers and an unknown base', () => {
    const prefix = '-9007199254700000 Polished Pronged Steely Nerf Venomed Dancing Vicious Invisible Tarnished Rubber Mini Padded Stabbity I8 ';
    const name = `${prefix}${'Q'.repeat(200 - prefix.length)}`;
    const details = describeEquipment(name, 'Weapon');

    expect(name).toHaveLength(200);
    expect([...details.description].length).toBeLessThanOrEqual(220);
    expect(details.effect).not.toMatch(/Infinity|NaN|e\+/);
  });

  it('keeps spell flavor stable across levels without inventing a combat effect', () => {
    const details = describeSpell('Rabbit Punch', 2);

    expect(details.description).toContain('customary envelope');
    expect(describeSpell('Rabbit Punch', 7).description).toBe(details.description);
    expect(details.effect).toBe(
      'Spell rank: 2. Combat contribution: none; classic encounter time ignores spells.',
    );
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
    expect(details.effect).toBe(
      'Quantity: 3. Encumbrance: +3 cubits. Combat contribution: none; loot is sold when the pack fills.',
    );
  });

  it('reports Gold as weightless currency', () => {
    const details = describeInventoryItem('Gold', 42);

    expect(details.description).toContain('Gold');
    expect(details.effect).toBe(
      'Quantity: 42. Encumbrance: +0 cubits. Funds equipment purchases; combat contribution: none.',
    );
  });

  it('names the monster in a recovered-item incident report', () => {
    const description = describeInventoryItem('Gelatinous Cube item', 1).description;

    expect(description).toContain('Gelatinous Cube');
    expect(description.length).toBeLessThanOrEqual(220);
  });

  it('recognizes the canonical monster and drop in live fixed loot', () => {
    const description = describeInventoryItem('gelatinous cube jam', 1).description;

    expect(description).toContain('Gelatinous Cube');
    expect(description).toContain('jam');
  });

  it('gives neighboring monster drops meaning beyond the interpolated remains', () => {
    const rat = withoutIdentityToken(describeInventoryItem('rat tail', 1).description, 'Rat', 'tail');
    const scout = withoutIdentityToken(
      describeInventoryItem('Cub Scout neckerchief', 1).description,
      'Cub Scout',
      'neckerchief',
    );

    expect(rat).not.toBe(scout);
    expect(scout).toContain('wardrobe');
  });

  it('does not invent monster provenance for an accepted unknown item', () => {
    expect(describeInventoryItem('Uncatalogued item', 1).description).not.toContain('Recovered from');
  });

  it('names mundane loot in its bureaucratic demotion story', () => {
    const description = describeInventoryItem('nail', 1).description;

    expect(description).toContain('nail');
    expect(description).toContain('treasure');
  });

  it('gives neighboring mundane loot meaning beyond the interpolated object', () => {
    const nail = withoutIdentityToken(describeInventoryItem('nail', 1).description, 'nail');
    const lunchpail = withoutIdentityToken(describeInventoryItem('lunchpail', 1).description, 'lunchpail');

    expect(nail).not.toBe(lunchpail);
  });

  it('keeps an accepted unknown item identifiable', () => {
    expect(describeInventoryItem('Uncatalogued Chair', 1).description).toContain('Uncatalogued Chair');
  });

  it('keeps every generated special-item identity distinct and bounded', () => {
    const items = ITEM_ATTRIB.flatMap((attribute) =>
      SPECIALS.flatMap((object) => ITEM_OFS.map((concept) => ({ attribute, concept, name: `${attribute} ${object} of ${concept}`, object }))));
    const descriptions = items.map(({ name }) => describeInventoryItem(name, 1).description);
    const signatures = descriptions.map((description, index) => {
      const item = items[index];
      return item ? withoutIdentityToken(description, item.attribute, item.object, item.concept) : '';
    });

    expect(new Set(descriptions).size).toBe(items.length);
    expect(descriptions.every((description) => description.length <= 220)).toBe(true);
    expect(new Set(signatures).size).toBeGreaterThanOrEqual(750);
  });

  it('gives neighboring special-item concepts meaning beyond the interpolated noun', () => {
    const craft = withoutIdentityToken(describeInventoryItem('Golden Diadem of Craft', 1).description, 'Craft');
    const joy = withoutIdentityToken(describeInventoryItem('Golden Diadem of Joy', 1).description, 'Joy');

    expect(craft).not.toBe(joy);
  });

  it('gives neighboring special-item attributes meaning beyond the interpolated adjective', () => {
    const golden = withoutIdentityToken(describeInventoryItem('Golden Diadem of Craft', 1).description, 'Golden');
    const garlanded = withoutIdentityToken(describeInventoryItem('Garlanded Diadem of Craft', 1).description, 'Garlanded');

    expect(golden).not.toBe(garlanded);
  });

  it('gives neighboring special-item objects meaning beyond the interpolated noun', () => {
    const diadem = withoutIdentityToken(describeInventoryItem('Golden Diadem of Craft', 1).description, 'Diadem');
    const garnet = withoutIdentityToken(describeInventoryItem('Golden Garnet of Craft', 1).description, 'Garnet');

    expect(diadem).not.toBe(garnet);
  });

  it('gives every special-item component a distinct idea in a fixed context', () => {
    const attributes = ITEM_ATTRIB.map((attribute) =>
      withoutIdentityToken(describeInventoryItem(`${attribute} Diadem of Craft`, 1).description, attribute));
    const objects = SPECIALS.map((object) =>
      withoutIdentityToken(describeInventoryItem(`Golden ${object} of Craft`, 1).description, object));
    const concepts = ITEM_OFS.map((concept) =>
      withoutIdentityToken(describeInventoryItem(`Golden Diadem of ${concept}`, 1).description, concept));

    expect(new Set(attributes).size).toBe(attributes.length);
    expect(new Set(objects).size).toBe(objects.length);
    expect(new Set(concepts).size).toBe(concepts.length);
  });

  it('keeps materially varied stories across fixed monster and mundane loot catalogs', () => {
    const fixedMonsterLoot = [...new Map(
      MONSTERS.filter(({ item }) => item !== '*').map((monster) => [`${monster.name}\0${monster.item}`, monster]),
    ).values()];
    const monsterStories = fixedMonsterLoot.map(({ item, name }) => ({
      description: describeInventoryItem(`${name} ${item}`, 1).description,
      item,
      name,
    }));
    const mundaneStories = [...new Set(BORING_ITEMS)].map((name) => ({
      description: describeInventoryItem(name, 1).description,
      name,
    }));
    const monsterSignatures = monsterStories.map(({ description, item, name }) =>
      withoutIdentityToken(description, name, item));
    const mundaneSignatures = mundaneStories.map(({ description, name }) =>
      withoutIdentityToken(description, name));

    expect(new Set(monsterSignatures).size).toBe(monsterStories.length);
    expect(new Set(mundaneSignatures).size).toBe(mundaneStories.length);
    expect([...monsterStories, ...mundaneStories].every(({ description }) => [...description].length <= 220)).toBe(true);
  });

  it.each(['', 'Żółć Chair 🪑', 'X'.repeat(200)])('bounds accepted item identity %j', (name) => {
    const details = describeInventoryItem(name, 1);

    expect(details.description.length).toBeGreaterThan(0);
    expect(details.description.length).toBeLessThanOrEqual(220);
    expect(`${details.description} ${details.effect}`).not.toMatch(/undefined|NaN/);
  });

  it('truncates accepted long Unicode identities at code-point boundaries', () => {
    const name = '🪑'.repeat(100);
    const descriptions = [
      describeEquipment(name, 'Weapon').description,
      describeInventoryItem(name, 1).description,
      describeSpell(name, 1).description,
    ];
    const hasUnpairedSurrogate = (value: string) => [...value].some((character) => {
      const code = character.charCodeAt(0);
      return character.length === 1 && code >= 0xD800 && code <= 0xDFFF;
    });

    expect(descriptions.some(hasUnpairedSurrogate)).toBe(false);
    expect(descriptions.every((description) => [...description].length <= 220)).toBe(true);
  });

  it('keeps an inventory item story stable when its quantity changes', () => {
    const first = describeInventoryItem('Golden Orb of Fortune', 3).description;
    const repeat = describeInventoryItem('Golden Orb of Fortune', 3).description;
    const other = describeInventoryItem('Golden Orb of Fortune', 4).description;

    expect(repeat).toBe(first);
    expect(other).toBe(first);
  });
});

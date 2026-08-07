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
    const details = describeEquipment('Punitive Short Sprint', 'Weapon');

    expect(details.description).toContain('Punitive');
    expect(details.description).toContain('Short Sprint');
    expect(details.effect).toBe(
      'Generation quality: 9 (Short Sprint 5 + Punitive +4). Combat contribution: none; classic encounter time ignores equipment.',
    );
  });

  it('keeps an explicit equipment quality mark in the item story', () => {
    const details = describeEquipment('-3 Boilerplate', 'Hauberk');

    expect(details.description).toContain('-3');
    expect(details.description).toContain('Boilerplate');
    expect(details.effect).toContain('Generation quality: 0');
  });

  it('includes every canonical modifier in an accepted equipment name', () => {
    const details = describeEquipment('Punitive Binding Sticky Note', 'Weapon');

    expect(details.description).toContain('Punitive');
    expect(details.description).toContain('Binding');
    expect(details.effect).toContain('Generation quality: 7');
  });

  it('preserves canonical modifier order in an equipment micro-story', () => {
    const originalOrder = describeEquipment('Punitive Binding Sticky Note', 'Weapon');
    const alternateOrder = describeEquipment('Binding Punitive Sticky Note', 'Weapon');

    expect(originalOrder.description).toBe(alternateOrder.description);
    expect(originalOrder.effect).toBe(alternateOrder.effect);
  });

  it('keeps the equipped slot meaningful for the same armor', () => {
    const armorSlots = EQUIP_SLOTS.filter((slot) => slot !== 'Weapon' && slot !== 'Shield');
    const descriptions = armorSlots.map((slot) => describeEquipment('Boilerplate', slot).description);

    expect(new Set(descriptions).size).toBe(armorSlots.length);
  });

  it.each([
    ['accepted long equipment', 'X'.repeat(200), 'Helm' as const],
    ['stacked canonical equipment', '+100 Derated Air Gap', 'Hauberk' as const],
  ])('bounds %s flavor', (_case, name, slot) => {
    expect(describeEquipment(name, slot).description.length).toBeLessThanOrEqual(220);
  });

  it.each([
    ['unsafe integer', '9'.repeat(194)],
    ['oversized zero', '0'.repeat(194)],
    ['leading zeros', `${'0'.repeat(193)}1`],
  ])('does not treat an imported %s prefix as an equipment quality mark', (_case, mark) => {
    const details = describeEquipment(`${mark} Sticky Note`, 'Weapon');

    expect([...details.description].length).toBeLessThanOrEqual(220);
    expect(details.effect).toContain('Generation quality: 0 (Sticky Note 0).');
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
    const stick = withoutIdentityToken(describeEquipment('Vetted Sticky Note', 'Weapon').description, 'Sticky Note');
    const shiv = withoutIdentityToken(describeEquipment('Vetted Shim', 'Weapon').description, 'Shim');

    expect(stick).not.toBe(shiv);
  });

  it('gives neighboring equipment modifiers meaning beyond the interpolated adjective', () => {
    const venomed = withoutIdentityToken(describeEquipment('Punitive Short Sprint', 'Weapon').description, 'Punitive');
    const vicious = withoutIdentityToken(describeEquipment('Binding Short Sprint', 'Weapon').description, 'Binding');

    expect(venomed).not.toBe(vicious);
  });

  it('gives every canonical equipment base a distinct idea in the same context', () => {
    const weaponStories = WEAPONS.map(([base]) =>
      withoutIdentityToken(describeEquipment(`Vetted ${base}`, 'Weapon').description, base));
    const shieldStories = SHIELDS.map(([base]) =>
      withoutIdentityToken(describeEquipment(`Bonded ${base}`, 'Shield').description, base));
    const armorStories = ARMORS.map(([base]) =>
      withoutIdentityToken(describeEquipment(`Bonded ${base}`, 'Hauberk').description, base));

    expect(new Set(weaponStories).size).toBe(WEAPONS.length);
    expect(new Set(shieldStories).size).toBe(SHIELDS.length);
    expect(new Set(armorStories).size).toBe(ARMORS.length);
  });

  it('gives every canonical equipment modifier a distinct idea in the same context', () => {
    const offense = [...OFFENSE_ATTRIB, ...OFFENSE_BAD].map(([modifier]) =>
      withoutIdentityToken(describeEquipment(`${modifier} Sticky Note`, 'Weapon').description, modifier));
    const defense = [...DEFENSE_ATTRIB, ...DEFENSE_BAD].map(([modifier]) =>
      withoutIdentityToken(describeEquipment(`${modifier} Boilerplate`, 'Hauberk').description, modifier));

    expect(new Set(offense).size).toBe(offense.length);
    expect(new Set(defense).size).toBe(defense.length);
  });

  it('keeps equipment stories to two sentences and bounds stacked imported modifiers', () => {
    const modifiers = [...OFFENSE_ATTRIB, ...OFFENSE_BAD].map(([modifier]) => modifier).join(' ');
    const stacked = describeEquipment(`+100 ${modifiers} Sticky Note`, 'Weapon').description;
    const ordinary = describeEquipment('Vetted Sticky Note', 'Weapon').description;
    const sentenceCount = (description: string): number => description.match(/[.!?](?:\s|$)/g)?.length ?? 0;

    expect([...stacked].length).toBeLessThanOrEqual(220);
    expect(sentenceCount(ordinary)).toBeLessThanOrEqual(2);
  });

  it('bounds a retained safe mark combined with stacked modifiers and an unknown base', () => {
    const prefix = '-9007199254700000 Vetted Phased Signed Sunset Punitive Scripted Binding Unlogged Flagged Unfunded Trial Redlined Enforced I8 ';
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
    const details = describeInventoryItem('Certified Order of Forecast', 3);

    expect(details.description).toContain('Certified');
    expect(details.description).toContain('Order');
    expect(details.description).toContain('Forecast');
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
    const description = describeInventoryItem('Gelatinous Sprint item', 1).description;

    expect(description).toContain('Gelatinous Sprint');
    expect(description.length).toBeLessThanOrEqual(220);
  });

  it('recognizes the canonical monster and drop in live fixed loot', () => {
    const description = describeInventoryItem('gelatinous sprint jam', 1).description;

    expect(description).toContain('Gelatinous Sprint');
    expect(description).toContain('jam');
  });

  it('gives neighboring monster drops meaning beyond the interpolated remains', () => {
    const rat = withoutIdentityToken(describeInventoryItem('nit tail', 1).description, 'Nit', 'tail');
    const scout = withoutIdentityToken(
      describeInventoryItem('Intern lanyard', 1).description,
      'Intern',
      'lanyard',
    );

    expect(rat).not.toBe(scout);
    expect(scout).toContain('wardrobe');
  });

  it('keeps all three drop shapes reachable from the monster table', () => {
    // itemDetails classifies a drop as wardrobe, anatomy or residue by matching hardcoded word
    // lists — the one place in that file that names vocabulary instead of resolving it by index,
    // and so the one place a table rewrite can silently defeat. #401 replaced every adversary and
    // every drop; without this, all 232 would have fallen through to the generic ending and the
    // only symptom would have been blander tooltips nobody diffed.
    const shapes = { wardrobe: 0, anatomy: 0, residue: 0, document: 0, salvage: 0 };
    for (const { name, item } of MONSTERS) {
      if (item === '*') continue;
      const { description } = describeInventoryItem(`${name} ${item}`, 1);
      if (description.includes('wardrobe')) shapes.wardrobe += 1;
      else if (description.includes('filed as anatomy')) shapes.anatomy += 1;
      else if (description.includes('a labor grievance')) shapes.residue += 1;
      else if (description.includes('never read again')) shapes.document += 1;
      else shapes.salvage += 1;
    }
    expect(shapes.wardrobe).toBeGreaterThan(0);
    expect(shapes.anatomy).toBeGreaterThan(0);
    expect(shapes.residue).toBeGreaterThan(0);
    // The register moved: most of what an institution's adversaries drop is paperwork, which the
    // original three shapes had no category for at all.
    expect(shapes.document).toBeGreaterThan(0);
    // The generic ending is the fallback, not the norm. If a rewrite bypassed every list this
    // would be all 232, which is exactly the failure the assertions above cannot see on their own.
    expect(shapes.salvage).toBeLessThan(MONSTERS.length / 2);
  });

  it('does not invent monster provenance for an accepted unknown item', () => {
    expect(describeInventoryItem('Uncatalogued item', 1).description).not.toContain('Recovered from');
  });

  it('names mundane loot in its bureaucratic demotion story', () => {
    const description = describeInventoryItem('paperclip', 1).description;

    expect(description).toContain('paperclip');
    expect(description).toContain('treasure');
  });

  it('gives neighboring mundane loot meaning beyond the interpolated object', () => {
    const nail = withoutIdentityToken(describeInventoryItem('paperclip', 1).description, 'paperclip');
    const lunchpail = withoutIdentityToken(describeInventoryItem('lanyard', 1).description, 'lanyard');

    expect(nail).not.toBe(lunchpail);
  });

  it('keeps an accepted unknown item identifiable', () => {
    expect(describeInventoryItem('Uncatalogued Chair', 1).description).toContain('Uncatalogued Chair');
  });

  // Exhaustive: every ITEM_ATTRIB x SPECIALS x ITEM_OFS combination, 63,492 generated
  // descriptions. It runs in roughly 2s alone but has been measured at 5.4s and 6.1s under
  // parallel CI load, so the 5s default was never the right budget for it - the test was not
  // slow, the budget was wrong. Timing out here says nothing about correctness.
  it('keeps every generated special-item identity distinct and bounded', { timeout: 30_000 }, () => {
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
    const craft = withoutIdentityToken(describeInventoryItem('Certified Directive of Compliance', 1).description, 'Compliance');
    const joy = withoutIdentityToken(describeInventoryItem('Certified Directive of Jurisdiction', 1).description, 'Jurisdiction');

    expect(craft).not.toBe(joy);
  });

  it('gives neighboring special-item attributes meaning beyond the interpolated adjective', () => {
    const golden = withoutIdentityToken(describeInventoryItem('Certified Directive of Compliance', 1).description, 'Certified');
    const garlanded = withoutIdentityToken(describeInventoryItem('Commended Directive of Compliance', 1).description, 'Commended');

    expect(golden).not.toBe(garlanded);
  });

  it('gives neighboring special-item objects meaning beyond the interpolated noun', () => {
    const diadem = withoutIdentityToken(describeInventoryItem('Certified Directive of Compliance', 1).description, 'Directive');
    const garnet = withoutIdentityToken(describeInventoryItem('Certified Grant of Compliance', 1).description, 'Grant');

    expect(diadem).not.toBe(garnet);
  });

  it('gives every special-item component a distinct idea in a fixed context', () => {
    const attributes = ITEM_ATTRIB.map((attribute) =>
      withoutIdentityToken(describeInventoryItem(`${attribute} Directive of Compliance`, 1).description, attribute));
    const objects = SPECIALS.map((object) =>
      withoutIdentityToken(describeInventoryItem(`Certified ${object} of Compliance`, 1).description, object));
    const concepts = ITEM_OFS.map((concept) =>
      withoutIdentityToken(describeInventoryItem(`Certified Directive of ${concept}`, 1).description, concept));

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
    const first = describeInventoryItem('Certified Order of Forecast', 3).description;
    const repeat = describeInventoryItem('Certified Order of Forecast', 3).description;
    const other = describeInventoryItem('Certified Order of Forecast', 4).description;

    expect(repeat).toBe(first);
    expect(other).toBe(first);
  });
});

describe('modifier count as a register signal', () => {
  it('files a stacked item with more ceremony and no more power', () => {
    // Modifier count is the engine's own rarity signal. It escalates the paperwork's tone; it must
    // never escalate the claim, because equipment has no combat contribution at any quality.
    const stacked = describeEquipment('+3 Notarized Audited Chain Mail', 'Hauberk');
    const plain = describeEquipment('+1 Audited Chain Mail', 'Hauberk');

    expect(stacked.description).not.toBe(plain.description);
    for (const details of [stacked, plain]) {
      expect(details.effect).toContain('Combat contribution: none');
      expect(details.description).not.toMatch(/stronger|tougher|deadlier|more effective/i);
    }
  });

  it('keeps a stacked story inside the same bounds as any other', () => {
    // The register may change; the two-sentence and length contracts may not.
    const stacked = describeEquipment('+3 Notarized Audited Chain Mail', 'Hauberk');
    expect(stacked.description.split(/(?<=\.)\s+/).filter(Boolean).length).toBeLessThanOrEqual(2);
    expect(stacked.description.length).toBeLessThanOrEqual(220);
  });
});

describe('the boundary between what a thing is and what it does', () => {
  // Flavour is free to drift; effects are the interface's only mechanical claim, and CONTEXT.md
  // forbids asserting anything the engine does not model. These pin the shape of every effect
  // string so a future flavour pass cannot append prose to one, or smuggle a quantity in beside a
  // real figure. A legitimate mechanics change updates the pattern here deliberately.
  const EQUIPMENT_EFFECT = /^Generation quality: [-\d,]+ \([^)]*\)\. Combat contribution: [a-z ]+; classic encounter time ignores equipment\.$/u;
  const SPELL_EFFECT = /^Spell rank: [-\d,]+\. Combat contribution: [a-z ]+; classic encounter time ignores spells\.$/u;

  it('keeps every generated equipment effect to the mechanical shape', () => {
    for (const slot of EQUIP_SLOTS) {
      for (const [base] of slot === 'Weapon' ? WEAPONS : slot === 'Shield' ? SHIELDS : ARMORS) {
        for (const [modifier] of [...OFFENSE_ATTRIB, ...DEFENSE_ATTRIB, ...OFFENSE_BAD, ...DEFENSE_BAD]) {
          expect(describeEquipment(`${modifier} ${base}`, slot).effect).toMatch(EQUIPMENT_EFFECT);
        }
      }
    }
  });

  it('keeps every spell effect to the mechanical shape', () => {
    for (const [index, spell] of SPELLS.entries()) {
      expect(describeSpell(spell, index + 1).effect).toMatch(SPELL_EFFECT);
    }
  });

  it('never lets a flavour beat reach an effect', () => {
    // The dossier vocabulary belongs to descriptions. If one of these words ever appears in an
    // effect, the two halves have merged and the mechanical claim is no longer trustworthy.
    const flavour = [
      'approved', 'condemned', 'misfiled', 'quarantined', 'de-provisioned', 'derated',
      'by candlelight', 'during the brownout', 'while the coolant held', 'pending thermal review',
    ];
    const samples = [
      ...SPECIALS.slice(0, 12).map((name) => describeInventoryItem(name, 1)),
      ...BORING_ITEMS.slice(0, 12).map((name) => describeInventoryItem(name, 3)),
      ...ITEM_ATTRIB.slice(0, 8).map((attribute, index) => describeInventoryItem(`${attribute} ${ITEM_OFS[index] ?? 'Thing'}`, 2)),
      ...MONSTERS.slice(0, 20).filter(({ item }) => item).map(({ item }) => describeInventoryItem(item, 1)),
      ...EQUIP_SLOTS.map((slot) => describeEquipment(`Provisional Waiver ${slot}`, slot)),
      ...SPELLS.slice(0, 12).map((spell, index) => describeSpell(spell, index + 1)),
    ];
    expect(samples.length).toBeGreaterThan(60);
    for (const { effect } of samples) {
      for (const word of flavour) expect(effect.toLowerCase()).not.toContain(word);
    }
  });
});

describe('provenance acquires an industrial edge as acts accumulate', () => {
  const INDUSTRIAL = ['de-provisioned', 'derated', 'during the brownout', 'while the coolant held', 'pending thermal review'];

  const sample = (act: number) => [
    ...SPECIALS.map((name) => describeInventoryItem(name, 1, act).description),
    ...BORING_ITEMS.map((name) => describeInventoryItem(name, 3, act).description),
    ...MONSTERS.filter(({ item }) => item).map(({ item }) => describeInventoryItem(item, 1, act).description),
    ...EQUIP_SLOTS.flatMap((slot) => (slot === 'Weapon' ? WEAPONS : slot === 'Shield' ? SHIELDS : ARMORS)
      .map(([base]) => describeEquipment(`Provisional Waiver ${base}`, slot, act).description)),
  ];

  const industrialCount = (act: number) =>
    sample(act).filter((description) => INDUSTRIAL.some((word) => description.includes(word))).length;

  it('files nothing industrially before the first threshold', () => {
    // An object filed early cannot have been derated by a facility that did not exist yet.
    for (const act of [0, 1, 2, 3, 4]) expect(industrialCount(act)).toBe(0);
  });

  it('actually reaches the vocabulary once the acts are there', () => {
    // The assertion that makes the rest of this feature real. Threading a parameter that changes
    // no output would typecheck, pass every existing test, and do nothing.
    expect(industrialCount(5)).toBeGreaterThan(0);
    expect(industrialCount(12)).toBeGreaterThan(industrialCount(5));
  });

  it('stays deterministic and defaults to the era the archive started in', () => {
    expect(describeInventoryItem('Nit Tail', 1, 30)).toEqual(describeInventoryItem('Nit Tail', 1, 30));
    expect(describeInventoryItem('Nit Tail', 1)).toEqual(describeInventoryItem('Nit Tail', 1, 0));
  });

  it('leaves the mechanical effect alone at every act', () => {
    for (const act of [0, 5, 12, 30]) {
      expect(describeInventoryItem('Nit Tail', 1, act).effect).toBe(describeInventoryItem('Nit Tail', 1, 0).effect);
      expect(describeEquipment('Provisional Waiver Sword', 'Weapon', act).effect).toBe(describeEquipment('Provisional Waiver Sword', 'Weapon', 0).effect);
    }
  });
});

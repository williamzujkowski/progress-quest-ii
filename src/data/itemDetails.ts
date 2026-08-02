import { ARMORS, DEFENSE_ATTRIB, DEFENSE_BAD, OFFENSE_ATTRIB, OFFENSE_BAD, SHIELDS, WEAPONS } from './traits';
import type { EquipSlot } from '../engine/types';

export interface ItemDetails {
  description: string;
  effect: string;
}

const valueOf = (name: string, table: readonly (readonly [string, number])[]): number =>
  table.find(([label]) => name.includes(label))?.[1] ?? 0;

const baseValue = (name: string, slot: EquipSlot): number => {
  const table = slot === 'Weapon' ? WEAPONS : slot === 'Shield' ? SHIELDS : ARMORS;
  return valueOf(name, table);
};

export function describeEquipment(name: string, slot: EquipSlot): ItemDetails {
  if (!name || name === '—') {
    return { description: 'An empty slot. The void remains undefeated.', effect: 'No combat effect.' };
  }

  const explicit = Number(name.match(/^[+-]?\d+/)?.[0] ?? 0);
  const modifiers = slot === 'Weapon'
    ? valueOf(name, OFFENSE_ATTRIB) + valueOf(name, OFFENSE_BAD)
    : valueOf(name, DEFENSE_ATTRIB) + valueOf(name, DEFENSE_BAD);
  const rating = baseValue(name, slot) + explicit + modifiers;
  const verb = slot === 'Weapon' ? 'attack' : 'defense';
  const description = slot === 'Weapon'
    ? 'A legally questionable way to turn a monster into a footnote.'
    : 'Protective apparel for adventurers who prefer their organs inside.';

  return {
    description,
    effect: `${verb[0].toUpperCase()}${verb.slice(1)} rating: ${rating}. The simulation applies this as equipment quality; damage and mitigation remain abstract.`
  };
}

const SPELL_FLAVOR: Record<string, string> = {
  'Slime Finger': 'For pointing, poking, and making handshakes legally actionable.',
  'Rabbit Punch': 'A surprisingly effective argument delivered at high velocity.',
  Hastiness: 'Because waiting your turn is for people with a retirement plan.',
  'Cone of Annoyance': 'A focused beam of weaponized irritation.',
  'Magnetic Orb': 'Attracts metal, trouble, and occasionally both.',
  'Infinite Confusion': 'The spellbook calls it strategy. Everyone else calls it Tuesday.',
};

export function describeSpell(name: string, level: number): ItemDetails {
  return {
    description: SPELL_FLAVOR[name] ?? 'A spell of dubious provenance and excellent paperwork.',
    effect: `Spell level: ${level}. Higher levels improve its priority in the abstract combat simulation; exact damage is intentionally not surfaced by the engine.`,
  };
}

export function describeInventoryItem(name: string, quantity: number): ItemDetails {
  const description = name.includes(' item')
    ? 'A trophy from something that objected to being converted into loot.'
    : name.includes(' of ')
      ? 'A suspiciously ornate treasure with more adjectives than practical uses.'
      : 'A portable reminder that the killing fields have a procurement department.';

  return {
    description,
    effect: `Quantity carried: ${quantity}. Loot contributes to encumbrance; it has no direct combat effect until the market daemon gets involved.`,
  };
}

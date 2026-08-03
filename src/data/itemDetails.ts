import { ARMORS, DEFENSE_ATTRIB, DEFENSE_BAD, OFFENSE_ATTRIB, OFFENSE_BAD, SHIELDS, WEAPONS } from './traits';
import type { EquipSlot } from '../engine/types';

export interface ItemDetails {
  description: string;
  effect: string;
}

const stableIndex = (key: string, length: number): number => {
  let hash = 7;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % length;
};

const choose = (options: readonly string[], key: string): string => options[stableIndex(key, options.length)];

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
  const lead = slot === 'Weapon'
    ? [
      'A legally questionable way to turn a monster into a footnote',
      'A heroic solution to the ancient problem of having a monster nearby',
      'The sort of weapon a procurement department calls “within tolerance”',
    ]
    : [
      'Protective apparel for adventurers who prefer their organs inside',
      'A wearable argument against the sharp parts of other people',
      'Defensive tailoring for a profession with terrible occupational health',
    ];
  const closer = [
    'It has survived at least one meeting with a monster.',
    'The warranty was eaten by a small but ambitious animal.',
    'It looks expensive enough to discourage immediate questions.',
  ];
  const description = `${choose(lead, `${name}:${slot}`)}. ${choose(closer, `${slot}:${name}`)}`;

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

const SPELL_CLOSERS = [
  'The licensing board has declined to comment.',
  'Results may vary, especially near furniture.',
  'Approved by three wizards and one extremely nervous accountant.',
  'Side effects include confidence, paperwork, and avoidable eye contact.',
];

export function describeSpell(name: string, level: number): ItemDetails {
  return {
    description: `${SPELL_FLAVOR[name] ?? 'A spell of dubious provenance and excellent paperwork.'} ${choose(SPELL_CLOSERS, `${name}:closer`)}`,
    effect: `Spell level: ${level}. The simulation does not expose a spell-specific combat effect.`,
  };
}

export function describeInventoryItem(name: string, quantity: number): ItemDetails {
  const lead = name.includes(' item')
    ? [
      'A trophy from something that objected to being converted into loot',
      'Evidence that the monster had possessions and poor legal representation',
      'A souvenir from a workplace incident involving teeth',
    ]
    : name.includes(' of ')
      ? [
        'A suspiciously ornate treasure with more adjectives than practical uses',
        'An heirloom of uncertain ancestry and aggressively certain marketing',
        'A treasure whose primary enchantment is making inventory management worse',
      ]
      : [
        'A portable reminder that the killing fields have a procurement department',
        'A humble object promoted beyond its station by random chance',
        'A thing the market daemon will accept if nobody asks follow-up questions',
      ];
  const closer = [
    'It is not edible, unless the situation has become unusually philosophical.',
    'It will become someone else’s problem at the next market visit.',
    'It occupies space with the quiet confidence of a tax audit.',
  ];
  const description = `${choose(lead, name)}. ${choose(closer, `${name}:closer`)}`;

  return {
    description,
    effect: name === 'Gold'
      ? `Quantity carried: ${quantity}. Gold is weightless currency; it does not contribute to encumbrance or combat.`
      : `Quantity carried: ${quantity}. Loot contributes to encumbrance; it has no direct combat effect until the market daemon gets involved.`,
  };
}

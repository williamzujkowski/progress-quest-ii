import { ARMORS, BORING_ITEMS, DEFENSE_ATTRIB, DEFENSE_BAD, ITEM_ATTRIB, ITEM_OFS, MONSTERS, OFFENSE_ATTRIB, OFFENSE_BAD, SHIELDS, SPECIALS, WEAPONS } from './traits';
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

const boundedLabel = (name: string, fallback: string): string =>
  name.length > 60 ? `${name.slice(0, 59)}…` : name || fallback;

const valueOf = (name: string, table: readonly (readonly [string, number])[]): number =>
  table.find(([label]) => name.includes(label))?.[1] ?? 0;

const labelOf = (name: string, table: readonly (readonly [string, number])[]): string | undefined =>
  table.find(([label]) => name.includes(label))?.[0];

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
  const base = labelOf(name, slot === 'Weapon' ? WEAPONS : slot === 'Shield' ? SHIELDS : ARMORS) ?? name;
  const modifier = labelOf(name, slot === 'Weapon' ? [...OFFENSE_ATTRIB, ...OFFENSE_BAD] : [...DEFENSE_ATTRIB, ...DEFENSE_BAD]);
  const closer = [
    'It has survived at least one meeting with a monster.',
    'The warranty was eaten by a small but ambitious animal.',
    'It looks expensive enough to discourage immediate questions.',
  ];
  const description = modifier
    ? `${slot === 'Weapon' ? `This ${base} entered service` : `Issued as ${slot.toLowerCase()}, this ${base} remains in service`} after its ${modifier} designation passed a review with no surviving minutes. ${choose(closer, `${slot}:${name}:closer`)}`
    : `This ${base} entered service without a named modifier, which procurement calls restraint. ${choose(closer, `${slot}:${name}:closer`)}`;

  return {
    description,
    effect: `${verb[0].toUpperCase()}${verb.slice(1)} rating: ${rating}. The simulation applies this as equipment quality; damage and mitigation remain abstract.`
  };
}

const SPELL_FLAVOR: Record<string, string> = {
  'Slime Finger': 'A minor rite for making one finger somebody else’s compliance problem.',
  'Rabbit Punch': 'A close-quarters memorandum delivered without the customary envelope.',
  Hastiness: 'The minutes were approved before the meeting, preserving valuable time and all known errors.',
  'Good Move': 'Records the caster’s latest decision as sound policy before evidence can arrive.',
  Sadness: 'A mandatory reflection on every choice that led to the present corridor.',
  Seasick: 'The spellbook’s maritime section, written by someone who distrusted both boats and breakfast.',
  Shoelaces: 'The oldest binding doctrine in footwear, now available without bending over.',
  Inoculate: 'A preventative filing prepared for ailments that have not yet submitted their paperwork.',
  'Cone of Annoyance': 'A geometrically rigorous complaint addressed to everyone inside the diagram.',
  'Magnetic Orb': 'A polished sphere with a procurement file inexplicably stapled to every nearby form.',
  'Invisible Hands': 'An outsourcing proposal whose contractors cannot be seen, reached, or invoiced.',
  'Revolting Cloud': 'An atmospheric grievance jointly filed by sanitation, morale, and the ceiling.',
  'Aqueous Humor': 'A damp medical joke preserved long after both the medicine and audience expired.',
  'Spectral Miasma': 'An incorporeal air-quality incident with no department willing to claim jurisdiction.',
  'Clever Fellow': 'The author’s self-assessment, entered into the curriculum as supporting evidence.',
  Lockjaw: 'The spellbook’s preferred response to oral argument and dental reimbursement.',
  'History Lesson': 'Explains the current emergency as the inevitable result of an obsolete filing system.',
  Hydrophobia: 'Reclassifies water as an aggressive stakeholder with unacceptable boundary practices.',
  'Big Sister': 'Requests oversight from a senior relative whose authority has never been formally tested.',
  'Cone of Paste': 'An adhesive memorandum distributed across a geometrically defensible area.',
  Mulligan: 'Invokes the sacred doctrine that the previous outcome was only a rehearsal.',
  "Nestor's Bright Idea": 'A celebrated proposal whose brilliance remains protected by missing implementation notes.',
  'Holy Batpole': 'An implausible climbing aid certified for liturgical and municipal use.',
  'Tumor (Benign)': 'An anatomical footnote notable chiefly for the reassurance in its parentheses.',
  Braingate: 'A cognitive checkpoint staffed by one suspicious clerk and several unsigned waivers.',
  'Summon a Bitch': 'A cross-planar requisition for one exceptionally displeased independent contractor.',
  Nonplus: 'A procedural pause in which the agenda survives but nobody recalls approving it.',
  'Animate Nightstand': 'A promotion from bedroom furniture to mobile staff, with no salary adjustment.',
  'Eye of the Troglodyte': 'A subterranean witness whose visual standards predate disclosure law.',
  'Curse Name': 'A sanctions notice addressed to a proper noun while sparing the underlying paperwork.',
  Dropsy: 'A retired diagnosis recalled for being less precise than the symptoms deserved.',
  'Vitreous Humor': 'The joke inside the eye, submitted to ophthalmology for a second opinion.',
  "Roger's Grand Illusion": 'A grand illusion attributed to Roger because liability required a full name.',
  Covet: 'A formal expression of interest in property burdened by somebody else’s ownership.',
  'Black Idaho': 'A region, condition, or root vegetable; cartography declines to decide.',
  'Astral Miasma': 'An air-quality complaint escalated beyond the jurisdiction of ordinary ceilings.',
  'Spectral Oyster': 'A translucent mollusk retained under an extremely narrow advisory contract.',
  'Acrid Hands': 'A manual-handling policy revised in stronger language and cheaper gloves.',
  Angioplasty: 'Circulation described as a plumbing request requiring celestial preauthorization.',
  "Grognor's Big Day Off": 'The rare interval when Grognor was absent and everyone remained extremely careful.',
  'Tumor (Malignant)': 'An anatomical escalation whose parentheses have stopped attempting reassurance.',
  'Animate Tunic': 'A garment offered independent agency before anyone checked where it intended to go.',
  'Ursine Armor': 'A defensive dress code drafted by bears and reviewed from a prudent distance.',
  'Holy Roller': 'A sanctified procedure that declines to specify whether the subject is wheel or zealot.',
  Tonsillectomy: 'A throat complaint reduced to a surgical work order and an alarming consent form.',
  'Curse Family': 'A naming dispute extended to relatives, dependants, and everyone copied on the thread.',
  'Infinite Confusion': 'A standing agenda item that explains itself by generating another standing agenda item.',
};

const SPELL_CLOSERS = [
  'The licensing board has declined to comment.',
  'Results may vary, especially near furniture.',
  'Approved by three wizards and one extremely nervous accountant.',
  'Side effects include confidence, paperwork, and avoidable eye contact.',
];

export function describeSpell(name: string, level: number): ItemDetails {
  const premise = SPELL_FLAVOR[name]
    ?? `The incantation “${boundedLabel(name, 'unnamed spell')}” arrived without syllabus, sponsor, or declared learning outcome.`;
  return {
    description: `${premise} ${choose(SPELL_CLOSERS, `${name}:closer`)}`,
    effect: `Spell level: ${level}. The simulation does not expose a spell-specific combat effect.`,
  };
}

function specialItemParts(name: string): { attribute: string; object: string; concept?: string } | undefined {
  const attribute = ITEM_ATTRIB.find((candidate) => name.startsWith(`${candidate} `));
  if (!attribute) return undefined;
  const remainder = name.slice(attribute.length + 1);
  const object = SPECIALS.find((candidate) => remainder === candidate || remainder.startsWith(`${candidate} of `));
  if (!object) return undefined;
  const concept = ITEM_OFS.find((candidate) => remainder === `${object} of ${candidate}`);
  return { attribute, object, concept };
}

export function describeInventoryItem(name: string, quantity: number): ItemDetails {
  const special = specialItemParts(name);
  const monsterName = name.endsWith(' item') ? name.slice(0, -' item'.length) : undefined;
  const monster = MONSTERS.some(({ name: candidate }) => candidate === monsterName) ? monsterName : undefined;
  const label = boundedLabel(name, 'unnamed object');
  const closer = [
    'It is not edible, unless the situation has become unusually philosophical.',
    'It will become someone else’s problem at the next market visit.',
    'It occupies space with the quiet confidence of a tax audit.',
  ];
  const description = name === 'Gold'
    ? 'Gold is weightless in the pack and ruinously heavy in the quarterly ledger. Every coin has been counted twice and trusted once.'
    : special
    ? `A ${special.object} declared ${special.attribute} by ${choose([
      'a guild that now denies owning stationery',
      'an assessor compensated entirely in exposure',
      'the Office of Improbable Assets',
    ], `${name}:origin`)}. ${special.concept
      ? `Its connection to ${special.concept} is contractual, untested, and regrettably transferable.`
      : 'It has failed every practical-use hearing with distinction.'}`
    : monster
      ? `Recovered from ${monster} under circumstances classified as “inventory.” ${choose([
        'Chain of custody ended at the first bite mark.',
        'The incident report remains sticky in several jurisdictions.',
        'Ownership transferred immediately after a brief and decisive audit.',
      ], `${name}:incident`)}`
    : BORING_ITEMS.includes(name)
      ? `Once merely “${name},” this object was reassigned as treasure. ${choose([
        'The promotion includes no raise, purpose, or right of appeal.',
        'Procurement insists this is upward mobility.',
        'Its former household duties remain available upon request.',
      ], `${name}:demotion`)}`
    : `The label “${label}” is all that survived the encounter and subsequent filing error. ${choose(closer, `${name}:closer`)}`;

  return {
    description,
    effect: name === 'Gold'
      ? `Quantity carried: ${quantity}. Gold is weightless currency; it does not contribute to encumbrance or combat.`
      : `Quantity carried: ${quantity}. Loot contributes to encumbrance; it has no direct combat effect until the market daemon gets involved.`,
  };
}

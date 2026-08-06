import { ARMORS, BORING_ITEMS, DEFENSE_ATTRIB, DEFENSE_BAD, ITEM_ATTRIB, ITEM_OFS, MONSTERS, OFFENSE_ATTRIB, OFFENSE_BAD, SHIELDS, SPECIALS, WEAPONS } from './traits';
import { analyzeItemMechanics } from '../engine/itemMechanics';
import { formatGameNumber, stableIndex } from '../engine/text';
import type { EquipSlot } from '../engine/types';

export interface ItemDetails {
  description: string;
  effect: string;
}

const choose = (options: readonly string[], key: string): string => options[stableIndex(key, options.length)] ?? key;
const signedGameNumber = (value: number): string => `${value >= 0 ? '+' : ''}${formatGameNumber(value)}`;

const boundedLabel = (name: string, fallback: string, limit = 60): string => {
  const characters = Array.from(name);
  return characters.length > limit ? `${characters.slice(0, limit - 1).join('')}…` : name || fallback;
};

const DOSSIER_ACTIONS = [
  'approved', 'condemned', 'misfiled', 'insured', 'quarantined',
  'audited', 'reclassified', 'appealed', 'redacted', 'outsourced',
  'backdated', 'witnessed', 'repossessed', 'sanctified', 'returned',
] as const;

const DOSSIER_CONDITIONS = [
  'at intake', 'by candlelight', 'under protest', 'after lunch', 'without jurisdiction',
  'for tax purposes', 'during the evacuation', 'by correspondence', 'pending weather', 'in triplicate',
  'on clerical advice', 'after the witness vanished', 'with ceremonial urgency', 'before testing', 'by the night shift',
] as const;

const dossierBeat = (index: number, fallbackKey: string, salt = 0): string => {
  const catalogIndex = index >= 0 ? index : stableIndex(fallbackKey, DOSSIER_ACTIONS.length * DOSSIER_CONDITIONS.length);
  const position = (catalogIndex + salt) % (DOSSIER_ACTIONS.length * DOSSIER_CONDITIONS.length);
  return `${DOSSIER_ACTIONS[position % DOSSIER_ACTIONS.length]} ${DOSSIER_CONDITIONS[Math.floor(position / DOSSIER_ACTIONS.length)]}`;
};

// ponytail: lexical families cover the finite legacy catalog; add per-item exceptions only when the copy needs them.
const equipmentOpening = (base: string, slot: EquipSlot): string => {
  if (slot === 'Weapon') {
    const family = /shiv|knife|sword|hatchet|tomahawk|adze|ax|baselard|poachard|whinyard/i.test(base)
      ? 'blade'
      : /spear|lance|halberd|spontoon|pole|oxgoad/i.test(base)
        ? 'reach'
        : /bow|blunderbuss|culverin/i.test(base)
          ? 'ranged'
          : 'blunt';
    const openings = {
      blade: [
        `This ${base} left sharpening with more edge than supervision.`,
        `The guild issued this ${base} after diplomacy clocked out.`,
        `This ${base} divides blame more cleanly than armor.`,
      ],
      reach: [
        `This ${base} keeps danger at the preferred contractual distance.`,
        `This ${base} reaches beyond both training and liability.`,
        `This ${base} points away from payroll by written policy.`,
      ],
      ranged: [
        `This ${base} projects force and unresolved warranty questions.`,
        `The guild approved this ${base} for threats visible on paper.`,
        `This ${base} came with ammunition and borrowed confidence.`,
      ],
      blunt: [
        `This ${base} solves delicate problems by not noticing them.`,
        `Procurement calls this ${base} a weapon because “object” lacked urgency.`,
        `This ${base} survived an estate sale whose estate did not.`,
      ],
    } as const;
    const opening = choose(openings[family], `${base}:opening`);
    const baseIndex = WEAPONS.findIndex(([label]) => label === base);
    return `${opening.slice(0, -1)}; its intake file was ${dossierBeat(baseIndex, base)}.`;
  }

  if (slot === 'Shield') {
    const openings = /Parasol|Plate|Lid|Plexiglass|Fender/i.test(base)
      ? [
        `This ${base} became a shield after an abrupt civilian career.`,
        `The guild placed this ${base} between hero and evidence.`,
        `This ${base} passed shield inspection by resembling a surface.`,
      ]
      : [
        `This ${base} was certified by the people selling it.`,
        `The guild carries this ${base} face-out to hide the doubts.`,
        `This ${base} has blocked criticism more reliably than projectiles.`,
      ];
    const opening = choose(openings, `${base}:opening`);
    const baseIndex = SHIELDS.findIndex(([label]) => label === base);
    return `${opening.slice(0, -1)}; its intake file was ${dossierBeat(baseIndex, base, 41)}.`;
  }

  const armorFamily = /Lace|Macrame|Burlap|Canvas|Flannel|Chamois|Pleathers|Leathers|Bearskin/i.test(base)
    ? 'soft'
    : /mail/i.test(base)
      ? 'mail'
      : /ABS|Kevlar|Titanium|Plasma/i.test(base)
        ? 'advanced'
        : 'rigid';
  const openings = {
    soft: [
      `This ${base} offers the ${slot.toLowerCase()} texture where certainty was requested.`,
      `This ${base} protects the ${slot.toLowerCase()} by optimistic sewing pattern.`,
      `The ${slot.toLowerCase()} budget produced this ${base} and a better-stitched waiver.`,
    ],
    mail: [
      `This ${base} has more ${slot.toLowerCase()} links than its incident report.`,
      `This ${base} guards the ${slot.toLowerCase()} one administrative loop at a time.`,
      `The guild fitted this ${base} to the ${slot.toLowerCase()} after losing the knight.`,
    ],
    advanced: [
      `This ${base} protects the ${slot.toLowerCase()} with unserviceable technology.`,
      `The ${slot.toLowerCase()} requisition included this ${base} and a future manual.`,
      `This ${base} entered ${slot.toLowerCase()} service before discouraging tests.`,
    ],
    rigid: [
      `This ${base} passed ${slot.toLowerCase()} inspection during a fire drill.`,
      `This ${base} guards the ${slot.toLowerCase()} and several departmental secrets.`,
      `The guild shaped this ${base} for the ${slot.toLowerCase()} from a disputed diagram.`,
    ],
  } as const;
  const opening = choose(openings[armorFamily], `${slot}:${base}:opening`);
  const baseIndex = ARMORS.findIndex(([label]) => label === base);
  return `${opening.slice(0, -1)}; its intake file was ${dossierBeat(baseIndex, base, 82)}.`;
};

const equipmentAssessment = (modifier: string, modifierValue: number, slot: EquipSlot, explicitLabel: string | undefined, stacked: boolean): string => {
  const label = boundedLabel(modifier, 'unnamed modifier');
  const table = slot === 'Weapon' ? [...OFFENSE_ATTRIB, ...OFFENSE_BAD] : [...DEFENSE_ATTRIB, ...DEFENSE_BAD];
  const modifierIndex = table.findIndex(([candidate]) => candidate === modifier);
  const mark = explicitLabel ? `; its ${explicitLabel} assessor’s mark survived` : '';
  const assessments = modifierValue >= 0
    ? [
      `${label} certification outlived its witnesses`,
      `The guild approved ${label} by correspondence`,
      `${label} remains valid where supervision is scarce`,
      `${label} improved morale in other departments`,
      `Procurement defines ${label} as plausibly better`,
      `It is officially ${label} and unofficially evidence`,
    ]
    : [
      `${label} is a repair estimate pretending to be an adjective`,
      `Maintenance accepted ${label} and stopped returning calls`,
      `${label} is less a feature than a signed confession`,
      `The guild kept ${label} because condemned needed two signatures`,
      `Procurement lists ${label} under cosmetic litigation`,
      `${label} survived vigorous polishing of the report`,
    ];
  // Modifier count is the engine's own rarity signal and was read only as a number to add up.
  // Across four simulated hours it falls out at roughly three quarters plain, a quarter single,
  // and a twentieth double, so a second modifier is rare enough to be worth noticing and common
  // enough to be seen. The register escalates and the claim does not: a stacked item is filed
  // with more ceremony and is exactly as useless in a fight, which the effect line still says.
  //
  // Carried inside the existing sentence rather than added after it, because equipment stories
  // are held to two sentences and a length bound, both of which are tested.
  const custody = stacked ? 'its warranties were countersigned and' : 'its warranty was';
  return `${choose(assessments, `${modifier}:assessment`)}; ${custody} ${dossierBeat(modifierIndex, modifier, 123)}${mark}.`;
};

const boundEquipmentStory = (
  story: string,
  base: string,
  modifier: string,
  slot: EquipSlot,
  explicitLabel?: string,
): string => {
  if (Array.from(story).length <= 220) return story;
  const baseTable = slot === 'Weapon' ? WEAPONS : slot === 'Shield' ? SHIELDS : ARMORS;
  const modifierTable = slot === 'Weapon' ? [...OFFENSE_ATTRIB, ...OFFENSE_BAD] : [...DEFENSE_ATTRIB, ...DEFENSE_BAD];
  const baseIndex = baseTable.findIndex(([candidate]) => candidate === base);
  const modifierIndex = modifierTable.findIndex(([candidate]) => candidate === modifier);
  const mark = explicitLabel ? `; ${explicitLabel} mark retained` : '';
  return `This ${boundedLabel(base, 'equipment', 42)} ${slot.toLowerCase()} was ${dossierBeat(baseIndex, base)}. Its ${boundedLabel(modifier, 'unmodified', 20)} file was ${dossierBeat(modifierIndex, modifier, 123)}${mark}.`;
};

export function describeEquipment(name: string, slot: EquipSlot): ItemDetails {
  const mechanics = analyzeItemMechanics({ kind: 'equipment', name, slot });
  if (!mechanics.quality) {
    return { description: 'An empty slot. The void remains undefeated.', effect: 'No combat effect.' };
  }

  const { base: basePart, mark, modifiers, total } = mechanics.quality;
  const base = basePart?.name ?? boundedLabel(name, 'unnamed equipment');
  const modifier = modifiers.map(({ name: modifierName }) => modifierName).join(' and ');
  const modifierTotal = modifiers.reduce((sum, part) => sum + part.value, 0);
  const explicitLabel = mark ? signedGameNumber(mark.value) : undefined;
  const opening = equipmentOpening(base, slot);
  const story = modifier
    ? `${opening} ${equipmentAssessment(modifier, modifierTotal, slot, explicitLabel, modifiers.length >= 2)}`
    : `${opening} It carries ${explicitLabel ? `a ${explicitLabel} assessor’s mark and no` : 'no'} named modifier, which procurement calls restraint.`;
  const description = boundEquipmentStory(story, base, modifier, slot, explicitLabel);
  const qualityParts = [
    basePart ? `${basePart.name} ${formatGameNumber(basePart.value)}` : 'uncatalogued base 0',
    ...modifiers.map((part) => `${part.name} ${signedGameNumber(part.value)}`),
    ...(mark ? [`mark ${signedGameNumber(mark.value)}`] : []),
  ];

  return {
    description,
    effect: `Generation quality: ${formatGameNumber(total)} (${qualityParts.join(' + ')}). Combat contribution: ${mechanics.combatContribution}; classic encounter time ignores equipment.`,
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
  const mechanics = analyzeItemMechanics({ kind: 'spell', level });
  return {
    description: `${premise} ${choose(SPELL_CLOSERS, `${name}:closer`)}`,
    effect: `Spell rank: ${formatGameNumber(mechanics.rank)}. Combat contribution: ${mechanics.combatContribution}; classic encounter time ignores spells.`,
  };
}

function specialItemParts(name: string): { attribute: string; object: string; concept?: string } | undefined {
  const attribute = ITEM_ATTRIB.find((candidate) => name.startsWith(`${candidate} `));
  if (!attribute) return undefined;
  const remainder = name.slice(attribute.length + 1);
  const object = SPECIALS.find((candidate) => remainder === candidate || remainder.startsWith(`${candidate} of `));
  if (!object) return undefined;
  const concept = ITEM_OFS.find((candidate) => remainder === `${object} of ${candidate}`);
  return { attribute, object, ...(concept ? { concept } : {}) };
}

function monsterLootParts(name: string): { monster: string; drop: string } | undefined {
  const canonical = MONSTERS.find(({ name: monster, item }) =>
    item !== '*' && `${monster} ${item}`.toLowerCase() === name.toLowerCase());
  if (canonical) return { monster: canonical.name, drop: canonical.item };

  const generatedMonster = name.endsWith(' item') ? name.slice(0, -' item'.length) : undefined;
  const generated = MONSTERS.find(({ name: monster }) => monster === generatedMonster);
  return generated ? { monster: generated.name, drop: 'item' } : undefined;
}

const specialConceptStory = (concept: string): string => {
  const conceptIndex = ITEM_OFS.indexOf(concept);
  const family = /Happiness|Pleasure|Joy|Comfort|Patience|Loyalty|Awe|Dignard/i.test(concept)
    ? `The promised ${concept}`
    : /Craft|Practicality|Punctuality|Efficiency|Sisu|Perspicacity|Guile/i.test(concept)
      ? `Its claim to ${concept}`
      : /Internment|Incarceration|Solitude|Silence|Invisibility/i.test(concept)
        ? `The ${concept} order`
        : /Danger|Hurting|Suffering|Acrimony|Worry|Fear|Despair|Cruelty|Petulance|Frenzy/i.test(concept)
          ? `The included ${concept}`
          : `Its connection to ${concept}`;
  return `${family} was ${dossierBeat(conceptIndex, concept, 74)}.`;
};

const specialObjectClause = (object: string): string => {
  const objectIndex = SPECIALS.indexOf(object);
  const subject = /Diadem|Tiara|Laurel|Hood/i.test(object)
    ? `${object} fitting`
    : /Gemstone|Garnet|Amethyst|Bijou|Brooch/i.test(object)
      ? `${object} appraisal`
      : /Phial|Lamp|Brazier|Candelabra|Orb|Sphere/i.test(object)
        ? `${object} contents`
        : /Hymnal|Tome/i.test(object)
          ? `${object} index`
          : /Fleece|Corset|Brocade|Galoon|Festoon|Bandolier/i.test(object)
            ? `${object} tailoring`
            : /Scabbard|Arrow|Gimlet/i.test(object)
              ? `${object} custody`
              : /Sceptre|Ankh|Talisman/i.test(object)
                ? `${object} authority`
                : `${object} purpose`;
  return `the ${subject} was ${dossierBeat(objectIndex, object, 37)}`;
};

const specialAttributeStory = (attribute: string, object: string): string => {
  const attributeIndex = ITEM_ATTRIB.indexOf(attribute);
  const subject = /Golden|Gilded|Crystalline|Iron|Ormolu/i.test(attribute)
    ? `${attribute} finish`
    : /Garlanded|Filigreed|Gleaming|Grandiose|Ostentatious|Magnificent/i.test(attribute)
      ? `${attribute} decoration`
      : /Spectral|Astral|Arcane|Enchanted|Unearthly|Puissant/i.test(attribute)
        ? `${attribute} aura`
        : /Blessed|Reverential|Sacred|One True|Benevolent/i.test(attribute)
          ? `${attribute} status`
          : /Cruciate|Fearsome|Deadly/i.test(attribute)
            ? `${attribute} warning`
            : `${attribute} provenance`;
  return `The ${subject} was ${dossierBeat(attributeIndex, attribute)}; ${specialObjectClause(object)}.`;
};

const monsterLootStory = ({ monster, drop }: { monster: string; drop: string }): string => {
  const finding = drop === 'item'
    ? `Whatever ${monster} dropped was logged as “item” after anatomy declined jurisdiction.`
    : /^(?:shirt|robe|hat|boot|pants|bra|thong|pajamas|leathers|neckerchief|merit badge|collar|sash|jerkin|drawers)$/i.test(drop)
      ? `The ${drop} from ${monster} went from evidence to wardrobe without laundering the custody chain.`
      : /^(?:ass|ear|eye|eyelid|eyestalk|face|follicle|forearm|frenum|gills?|gyrum|head|hoof|horn|hump|jaw|larynx|leg|muscle|neck|patella|penis|rib|skin|tail|teeth|tentacle|testicle|thumb|tooth|tongue|tusk|wattle|wing)$/i.test(drop)
        ? `The ${drop} recovered from ${monster} was filed as anatomy after the jar objected.`
        : /^(?:condensation|curd|drops|fluid|foam|gel|gravy|lube|saliva|sample|slime|snow|spore|vomit)$/i.test(drop)
          ? `The ${drop} left by ${monster} is stored as a liquid, a solid, and a labor grievance.`
          : `The guild logged ${monster}’s ${drop} as field salvage and immediately lost the field.`;
  const monsterIndex = MONSTERS.findIndex(({ name }) => name === monster);
  const consequence = choose([
    'The donor remains unavailable for a satisfaction survey.',
    'Its chain of custody is mostly decorative.',
    'The market has standards, but none relevant here.',
    'A second sample was requested by nobody sober enough to sign.',
    'The evidence bag has begun negotiating overtime.',
  ], `${monster}:${drop}:aftermath`);
  return `${finding.slice(0, -1)}; evidence was ${dossierBeat(monsterIndex, monster)}. ${consequence}`;
};

const mundaneLootStory = (name: string): string => {
  const history = /I\.O\.U\.|writ|newspaper|letter/i.test(name)
    ? `The ${name} began as paperwork and became treasure when everybody stopped reading it.`
    : /cookie|pint|egg|chicken|carrot/i.test(name)
      ? `The ${name} was promoted from provisions to treasure shortly after its safe date.`
      : /sock|hat|vest|bandage|towel|counterpane/i.test(name)
        ? `The ${name} left textile service and entered treasure before laundering could establish facts.`
        : /nail|toothpick|needle|plank|twig|rock|pole|hoe|trowel|anvil|axle/i.test(name)
          ? `The ${name} completed a modest career in hardware before promotion to treasure.`
          : /lunchpail|bucket|canoe|inkwell|planter box|casket|credenza/i.test(name)
            ? `The ${name} once held something useful; as treasure it contains only appraised potential.`
            : `The ${name} was reassigned as treasure after its original department denied ownership.`;
  return `${history} Its promotion was ${dossierBeat(BORING_ITEMS.indexOf(name), name, 100)}.`;
};

export function describeInventoryItem(name: string, quantity: number): ItemDetails {
  const mechanics = analyzeItemMechanics({ kind: 'inventory', name, quantity });
  const special = specialItemParts(name);
  const monsterLoot = monsterLootParts(name);
  const label = boundedLabel(name, 'unnamed object');
  const closer = [
    'It is not edible, unless the situation has become unusually philosophical.',
    'It will become someone else’s problem at the next market visit.',
    'It occupies space with the quiet confidence of a tax audit.',
  ];
  const description = name === 'Gold'
    ? 'Gold is weightless in the pack and ruinously heavy in the quarterly ledger. Every coin has been counted twice and trusted once.'
    : special
    ? `${specialAttributeStory(special.attribute, special.object)} ${special.concept
      ? specialConceptStory(special.concept)
      : choose([
        'It has failed every practical-use hearing with distinction.',
        'Its former ceremonial purpose remains sealed pending a less embarrassing century.',
        'The market accepts it under a policy nobody admits to writing.',
      ], `${name}:warning`)}`
    : monsterLoot
      ? monsterLootStory(monsterLoot)
    : BORING_ITEMS.includes(name)
      ? mundaneLootStory(name)
    : `The label “${label}” is all that survived the encounter and subsequent filing error. ${choose(closer, `${name}:closer`)}`;

  return {
    description,
    effect: name === 'Gold'
      ? `Quantity: ${formatGameNumber(mechanics.quantity)}. Encumbrance: +${formatGameNumber(mechanics.encumbranceCubits)} cubits. Funds equipment purchases; combat contribution: ${mechanics.combatContribution}.`
      : `Quantity: ${formatGameNumber(mechanics.quantity)}. Encumbrance: +${formatGameNumber(mechanics.encumbranceCubits)} cubits. Combat contribution: ${mechanics.combatContribution}; loot is sold when the pack fills.`,
  };
}

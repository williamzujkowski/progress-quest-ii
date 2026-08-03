import { ALL_STATS, ARMORS, BORING_ITEMS, DEFENSE_ATTRIB, DEFENSE_BAD, EQUIP_SLOTS, ITEM_ATTRIB, ITEM_OFS, MONSTERS, OFFENSE_ATTRIB, OFFENSE_BAD, PRIME_STATS, SHIELDS, SPECIALS, SPELLS, WEAPONS } from '../data/traits';
import { MAX_PERSISTED_GOLD, MAX_PERSISTED_VALUE } from '../data/limits';
import { calculateEncumbranceMax, generateInitialStats } from './math';
import { RandomGenerator, type PRNGSeed } from './prng';
import { definite, indefinite } from './text';
import type { CharacterSheet, EquipSlot, InventoryItem, ProgressTask, SpellItem, StatsMap } from './types';

const NAME_PARTS_1 = ['Brog', 'Grim', 'Kael', 'Thor', 'Zar', 'Vex', 'Gor', 'Drak', 'Thul', 'Borg', 'Loth', 'Morg', 'Fizz', 'Wiz', 'Snag'];
const NAME_PARTS_2 = ['nar', 'gath', 'dor', 'karn', 'rak', 'mar', 'vark', 'zog', 'thor', 'bluff', 'sout', 'fang', 'jaw', 'beard', 'gorm'];

export function generateRandomName(rng?: RandomGenerator): string {
  const r = rng || new RandomGenerator(Date.now());
  return r.pick(NAME_PARTS_1) + r.pick(NAME_PARTS_2);
}

export function equipPrice(level: number): number {
  return 5 * level * level + 10 * level + 20;
}

export function createNewCharacter(name: string, race: string, klass: string, seed?: PRNGSeed | RandomGenerator): CharacterSheet {
  const rng = seed instanceof RandomGenerator ? seed : new RandomGenerator(seed ?? (name + Date.now()));
  const stats = generateInitialStats(rng, race, klass);

  const initialEquip: Record<EquipSlot, string> = {
    Weapon: 'Stick',
    Shield: '',
    Helm: '',
    Hauberk: '-3 Burlap',
    Brassairts: '',
    Vambraces: '',
    Gauntlets: '',
    Gambeson: '',
    Cuisses: '',
    Greaves: '',
    Sollerets: '',
  };

  return {
    Traits: {
      Name: name,
      Race: race,
      Class: klass,
      Level: 1,
    },
    Stats: stats,
    Equip: initialEquip,
    Inventory: [
      { name: 'Gold', qty: 0 },
    ],
    Spells: [],
    Gold: 0,
    Plot: {
      act: 1,
      currentProgress: 0,
      maxProgress: 10,
    },
    Quest: {
      description: 'Heading to the killing fields...',
      currentProgress: 0,
      maxProgress: 5,
    },
    Task: {
      description: 'Experiencing an enigmatic and foreboding night vision',
      durationMs: 2000,
      elapsedMs: 0,
      type: 'heading',
    },
  };
}

export function calculateEncumbrance(inventory: InventoryItem[]): number {
  let count = 0;
  for (const item of inventory) {
    if (item.name !== 'Gold') {
      count += item.qty;
    }
  }
  return count;
}

export function getRandomMonster(rng: RandomGenerator, level: number) {
  let result = rng.pick(MONSTERS);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = rng.pick(MONSTERS);
    if (Math.abs(level - candidate.level) < Math.abs(level - result.level)) result = candidate;
  }
  return result;
}

export function generateExterminateQuest(rng: RandomGenerator, level: number): {
  kind: 'exterminate';
  description: string;
  target: string;
  targetIndex: number;
} {
  let targetIndex = rng.random(MONSTERS.length);
  let target = MONSTERS[targetIndex];
  if (!target) throw new RangeError('Monster table is empty');
  for (let attempt = 1; attempt < 4; attempt += 1) {
    const candidateIndex = rng.random(MONSTERS.length);
    const candidate = MONSTERS[candidateIndex];
    if (candidate && Math.abs(level - candidate.level) < Math.abs(level - target.level)) {
      target = candidate;
      targetIndex = candidateIndex;
    }
  }
  return {
    kind: 'exterminate',
    description: `Exterminate ${definite(target.name, 2)}`,
    target: `${target.name}|${target.level}|${target.item}`,
    targetIndex,
  };
}

export function generateSeekQuest(rng: RandomGenerator) {
  const target = `${rng.pick(ITEM_ATTRIB)} ${rng.pick(SPECIALS)}`;
  return { kind: 'seek' as const, description: `Seek ${definite(target)}` };
}

export function generateDeliverQuest(rng: RandomGenerator) {
  const target = rng.pick(BORING_ITEMS);
  return { kind: 'deliver' as const, description: `Deliver this ${target}` };
}

export function generateFetchQuest(rng: RandomGenerator) {
  const target = rng.pick(BORING_ITEMS);
  return { kind: 'fetch' as const, description: `Fetch me ${indefinite(target)}` };
}

export function generatePlacateQuest(rng: RandomGenerator, level: number) {
  let target = rng.pick(MONSTERS);
  const candidate = rng.pick(MONSTERS);
  if (Math.abs(level - candidate.level) < Math.abs(level - target.level)) target = candidate;
  return { kind: 'placate' as const, description: `Placate ${definite(target.name, 2)}` };
}

export function generateQuest(rng: RandomGenerator, level: number) {
  switch (rng.random(5)) {
    case 0: return generateExterminateQuest(rng, level);
    case 1: return generateSeekQuest(rng);
    case 2: return generateDeliverQuest(rng);
    case 3: return generateFetchQuest(rng);
    case 4: return generatePlacateQuest(rng, level);
    default: throw new RangeError('Quest branch is outside the legacy table');
  }
}

export type QuestRewardKind = 'spell' | 'equipment' | 'stat' | 'item';

export function selectQuestReward(rng: RandomGenerator): QuestRewardKind {
  return (['spell', 'equipment', 'stat', 'item'] as const)[rng.random(4)];
}

export function generateSpellReward(rng: RandomGenerator, level: number, wisdom: number): string | undefined {
  const limit = Math.min(wisdom + level, SPELLS.length);
  if (!Number.isInteger(limit) || limit <= 0) return undefined;
  const spellName = SPELLS[Math.min(rng.random(limit), rng.random(limit))];
  return spellName;
}

export function applySpellReward(rng: RandomGenerator, level: number, wisdom: number, spells: SpellItem[]): SpellItem[] {
  const spellName = generateSpellReward(rng, level, wisdom);
  if (!spellName) return spells;
  const existing = spells.find((spell) => spell.name === spellName);
  return existing
    ? spells.map((spell) => spell.name === spellName ? { ...spell, level: Math.min(MAX_PERSISTED_VALUE, spell.level + 1) } : spell)
    : [...spells, { name: spellName, level: 1 }];
}

export function generateStatReward(rng: RandomGenerator, stats: StatsMap): keyof StatsMap {
  if (rng.random(2) < 1) return rng.pick(ALL_STATS);
  let roll = rng.random(PRIME_STATS.reduce((total, stat) => total + Math.trunc(stats[stat]) ** 2, 0));
  for (const stat of PRIME_STATS) {
    roll -= Math.trunc(stats[stat]) ** 2;
    if (roll < 0) return stat;
  }
  return PRIME_STATS.at(-1) ?? 'STR';
}

export function generateItemReward(rng: RandomGenerator, inventoryNames: readonly string[]): string {
  if (Math.max(250, rng.random(999)) < inventoryNames.length) {
    const existing = inventoryNames[rng.random(inventoryNames.length)];
    if (existing !== undefined) return existing;
  }
  return `${rng.pick(ITEM_ATTRIB)} ${rng.pick(SPECIALS)} of ${rng.pick(ITEM_OFS)}`;
}

export function generateLootItem(rng: RandomGenerator, monsterName?: string): string {
  if (monsterName && rng.random(2) === 0) {
    return `${monsterName} item`;
  }
  if (rng.random(2) === 0) {
    return `${rng.pick(ITEM_ATTRIB)} ${rng.pick(SPECIALS)}`;
  }
  return `${rng.pick(ITEM_ATTRIB)} ${rng.pick(SPECIALS)} of ${rng.pick(ITEM_OFS)}`;
}

export function generateEquipUpgrade(rng: RandomGenerator, level: number): { slot: EquipSlot; name: string } {
  const slot = rng.pick(EQUIP_SLOTS);
  let stuff: [string, number][];
  let better: [string, number][];
  let worse: [string, number][];

  if (slot === 'Weapon') {
    stuff = WEAPONS;
    better = OFFENSE_ATTRIB;
    worse = OFFENSE_BAD;
  } else if (slot === 'Shield') {
    stuff = SHIELDS;
    better = DEFENSE_ATTRIB;
    worse = DEFENSE_BAD;
  } else {
    stuff = ARMORS;
    better = DEFENSE_ATTRIB;
    worse = DEFENSE_BAD;
  }

  let [name, quality] = rng.pick(stuff);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = rng.pick(stuff);
    if (Math.abs(level - quality) > Math.abs(level - candidate[1])) [name, quality] = candidate;
  }

  let plus = level - quality;
  if (plus < 0) better = worse;
  for (let count = 0; count < 2 && plus !== 0; count += 1) {
    const [modifier, value] = rng.pick(better);
    if (name.includes(modifier) || Math.abs(plus) < Math.abs(value)) break;
    name = `${modifier} ${name}`;
    plus -= value;
  }
  if (plus !== 0) name = `${plus} ${name}`;
  if (plus > 0) name = `+${name}`;

  return { slot, name };
}

export function applyQuestReward(rng: RandomGenerator, character: CharacterSheet): {
  kind: QuestRewardKind;
  character: CharacterSheet;
  message: string | undefined;
} {
  const kind = selectQuestReward(rng);
  if (kind === 'spell') {
    const spells = applySpellReward(rng, character.Traits.Level, character.Stats.WIS, character.Spells);
    return { kind, character: { ...character, Spells: spells }, message: undefined };
  }
  if (kind === 'equipment') {
    const upgrade = generateEquipUpgrade(rng, character.Traits.Level);
    return {
      kind,
      character: { ...character, Equip: { ...character.Equip, [upgrade.slot]: upgrade.name } },
      message: undefined,
    };
  }
  if (kind === 'stat') {
    const stat = generateStatReward(rng, character.Stats);
    return {
      kind,
      character: { ...character, Stats: { ...character.Stats, [stat]: Math.min(MAX_PERSISTED_VALUE, Math.trunc(character.Stats[stat]) + 1) } },
      message: `Gained ${indefinite(stat)}`,
    };
  }

  const itemName = generateItemReward(rng, [
    'Gold',
    ...character.Inventory.filter(({ name }) => name !== 'Gold').map(({ name }) => name),
  ]);
  if (itemName === 'Gold') {
    return {
      kind,
      character: { ...character, Gold: Math.min(MAX_PERSISTED_GOLD, character.Gold + 1) },
      message: 'Got paid a gold piece',
    };
  }
  const existing = character.Inventory.find(({ name }) => name === itemName);
  const inventory = existing
    ? character.Inventory.map((item) => item.name === itemName ? { ...item, qty: Math.min(MAX_PERSISTED_VALUE, item.qty + 1) } : item)
    : [...character.Inventory, { name: itemName, qty: 1 }];
  return {
    kind,
    character: { ...character, Inventory: inventory },
    message: `Gained ${indefinite(itemName)}`,
  };
}

function generateMonsterTask(rng: RandomGenerator, character: CharacterSheet): { description: string; durationMs: number; loot: NonNullable<ProgressTask['loot']> } {
  const characterLevel = character.Traits.Level;
  let targetLevel = characterLevel;
  for (let step = targetLevel; step >= 1; step -= 1) {
    if (rng.random(5) < 2) targetLevel += rng.random(2) * 2 - 1;
  }
  targetLevel = Math.max(1, targetLevel);

  // ponytail: consume the legacy NPC branch roll; add that branch only with its own #39 oracle vector.
  rng.random(25);
  const questMonster = character.Quest.targetIndex === undefined ? undefined : MONSTERS[character.Quest.targetIndex];
  const validQuestTarget = character.Quest.kind === 'exterminate'
    && questMonster !== undefined
    && character.Quest.target === `${questMonster.name}|${questMonster.level}|${questMonster.item}`;
  const monster = validQuestTarget && rng.random(4) === 0
    ? questMonster
    : getRandomMonster(rng, targetLevel);
  let quantity = 1;
  if (targetLevel - monster.level > 10) {
    const divisor = Math.max(monster.level, 1);
    quantity = Math.max(1, Math.floor((targetLevel + rng.random(divisor)) / divisor));
    targetLevel = Math.floor(targetLevel / quantity);
  }

  const prefix = (values: readonly string[], magnitude: number, name: string, separator = ' ') => {
    const value = values[Math.abs(magnitude) - 1];
    return value ? `${value}${separator}${name}` : name;
  };
  const sick = (magnitude: number, name: string) => prefix(['dead', 'comatose', 'crippled', 'sick', 'undernourished'], 6 - Math.abs(magnitude), name);
  const young = (magnitude: number, name: string) => prefix(['foetal', 'baby', 'preadolescent', 'teenage', 'underage'], 6 - Math.abs(magnitude), name);
  const big = (magnitude: number, name: string) => prefix(['greater', 'massive', 'enormous', 'giant', 'titanic'], magnitude, name);
  const special = (magnitude: number, name: string) => name.includes(' ')
    ? prefix(['veteran', 'cursed', 'warrior', 'undead', 'demon'], magnitude, name)
    : prefix(['Battle-', 'cursed ', 'Were-', 'undead ', 'demon '], magnitude, name, '');

  let displayName = monster.name;
  const difference = targetLevel - monster.level;
  if (difference <= -10) displayName = `imaginary ${displayName}`;
  else if (difference < -5) {
    const sickMagnitude = 5 - rng.random(11 + difference);
    displayName = sick(sickMagnitude, young(-difference - sickMagnitude, displayName));
  } else if (difference < 0 && rng.random(2) === 1) displayName = sick(difference, displayName);
  else if (difference < 0) displayName = young(difference, displayName);
  else if (difference >= 10) displayName = `messianic ${displayName}`;
  else if (difference > 5) {
    const bigMagnitude = 5 - rng.random(11 - difference);
    displayName = big(bigMagnitude, special(difference - bigMagnitude, displayName));
  } else if (difference > 0 && rng.random(2) === 1) displayName = big(difference, displayName);
  else if (difference > 0) displayName = special(difference, displayName);

  const opponentLevel = targetLevel * quantity;
  return {
    description: `Executing ${indefinite(displayName, quantity)}...`,
    durationMs: Math.floor((2 * 3 * opponentLevel * 1000) / characterLevel),
    loot: monster.item === '*'
      ? { type: 'random' }
      : { type: 'fixed', item: `${monster.name} ${monster.item}`.toLowerCase() },
  };
}

export function generateTaskDescription(rng: RandomGenerator, character: CharacterSheet): { description: string; type: ProgressTask['type']; durationMs: number; loot?: ProgressTask['loot'] } {
  const encum = calculateEncumbrance(character.Inventory);
  const maxEncum = calculateEncumbranceMax(character.Stats.STR);
  const price = equipPrice(character.Traits.Level);

  if (encum >= maxEncum) {
    return {
      description: 'Heading to market to sell loot...',
      type: 'selling',
      durationMs: 3000,
    };
  }

  if (character.Gold >= price) {
    return {
      description: 'Negotiating purchase of better equipment...',
      type: 'buying',
      durationMs: 3000,
    };
  }

  const monster = generateMonsterTask(rng, character);
  return {
    description: monster.description,
    type: 'kill',
    durationMs: monster.durationMs,
    loot: monster.loot,
  };
}

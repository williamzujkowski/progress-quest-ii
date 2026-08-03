import { ARMORS, BORING_ITEMS, DEFENSE_ATTRIB, DEFENSE_BAD, EQUIP_SLOTS, ITEM_ATTRIB, ITEM_OFS, MONSTERS, OFFENSE_ATTRIB, OFFENSE_BAD, SHIELDS, SPECIALS, SPELLS, WEAPONS } from '../data/traits';
import { calculateEncumbranceMax, generateInitialStats } from './math';
import { RandomGenerator, type PRNGSeed } from './prng';
import { definite, indefinite } from './text';
import type { CharacterSheet, EquipSlot, InventoryItem, ProgressTask, SpellItem } from './types';

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

  const baseItem = rng.pick(stuff)[0];
  let name = baseItem;
  let plus = level - 1;
  if (plus > 0) {
    const mod = rng.pick(better)[0];
    name = `${mod} ${name}`;
    plus -= 1;
  } else if (plus < 0) {
    const mod = rng.pick(worse)[0];
    name = `${mod} ${name}`;
  }

  if (plus > 0) {
    name = `+${plus} ${name}`;
  }

  return { slot, name };
}

export function generateSpellUpgrade(rng: RandomGenerator, currentSpells: SpellItem[]): SpellItem[] {
  const spellName = rng.pick(SPELLS);
  const existing = currentSpells.find((s) => s.name === spellName);
  if (existing) {
    return currentSpells.map((s) => (s.name === spellName ? { ...s, level: s.level + 1 } : s));
  }
  return [...currentSpells, { name: spellName, level: 1 }];
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
  const monster = getRandomMonster(rng, targetLevel);
  return {
    description: `Executing ${indefinite(monster.name)}...`,
    durationMs: Math.floor((2 * 3 * targetLevel * 1000) / characterLevel),
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

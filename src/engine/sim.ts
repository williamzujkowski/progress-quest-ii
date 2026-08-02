import { ARMORS, DEFENSE_ATTRIB, DEFENSE_BAD, EQUIP_SLOTS, ITEM_ATTRIB, ITEM_OFS, MONSTERS, OFFENSE_ATTRIB, OFFENSE_BAD, SHIELDS, SPECIALS, SPELLS, WEAPONS } from '../data/traits';
import { calculateEncumbranceMax, generateInitialStats } from './math';
import { RandomGenerator } from './prng';
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

export function createNewCharacter(name: string, race: string, klass: string, seed?: any): CharacterSheet {
  const rng = new RandomGenerator(seed ?? (name + Date.now()));
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
  let candidates = MONSTERS.filter((m) => Math.abs(m.level - level) <= 3);
  if (candidates.length === 0) candidates = MONSTERS;
  return rng.pick(candidates);
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
  let worse: string[];

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
    const mod = rng.pick(worse);
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

export function generateTaskDescription(rng: RandomGenerator, character: CharacterSheet): { description: string; type: ProgressTask['type']; durationMs: number } {
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

  const monster = getRandomMonster(rng, character.Traits.Level);
  return {
    description: `Executing ${monster.name}...`,
    type: 'kill',
    durationMs: 2500 + rng.random(1500),
  };
}

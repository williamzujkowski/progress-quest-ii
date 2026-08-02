import { ARMORS, BORING_ITEMS, DEFENSE_ATTRIB, IMPRESSIVE_TITLES, ITEM_ATTRIB, ITEM_OFS, KLASSES, MONSTERS, MON_MODS, OFFENSE_ATTRIB, RACES, SHIELDS, SPELLS, SPECIALS, TITLES, WEAPONS } from '../data/traits';
import { calculateEncumbranceMax, generateInitialStats, levelUpTime } from './math';
import { RandomGenerator } from './prng';
import { CharacterSheet, EquipSlot, InventoryItem, ProgressTask, StatsMap } from './types';

export function createNewCharacter(name: string, race: string, klass: string, seed?: any): CharacterSheet {
  const rng = new RandomGenerator(seed ?? (name + Date.now()));
  const stats = generateInitialStats(rng, race, klass);

  const initialEquip: Record<EquipSlot, string> = {
    Weapon: 'Stick',
    Shield: '',
    Helm: '',
    Hauberk: '',
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
      description: 'Heading to market...',
      currentProgress: 0,
      maxProgress: 5,
    },
    Task: {
      description: 'Loading...',
      durationMs: 2000,
      elapsedMs: 0,
      type: 'heading_to_market',
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

export function generateTaskDescription(rng: RandomGenerator, character: CharacterSheet): { description: string; type: ProgressTask['type']; durationMs: number } {
  const encum = calculateEncumbrance(character.Inventory);
  const maxEncum = calculateEncumbranceMax(character.Stats.STR);

  if (encum >= maxEncum) {
    return {
      description: 'Heading to market to sell loot...',
      type: 'selling',
      durationMs: 4000,
    };
  }

  const monster = getRandomMonster(rng, character.Traits.Level);
  return {
    description: `Executing ${monster.name}...`,
    type: 'kill',
    durationMs: 3000 + rng.random(2000),
  };
}

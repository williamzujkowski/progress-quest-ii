import { KLASSES, RACES } from '../data/traits';
import { RandomGenerator } from './prng';
import type { StatsMap } from './types';

export function levelUpTime(level: number): number {
  // 20 minutes for level 1, exponential increase after that
  return Math.round((20 + Math.pow(1.15, level)) * 60);
}

export function roll3d6(rng: RandomGenerator): number {
  return rng.random(6) + 1 + (rng.random(6) + 1) + (rng.random(6) + 1);
}

export function calculateEncumbranceMax(str: number): number {
  return str + 10;
}

export function generateInitialStats(rng: RandomGenerator, raceName: string, klassName: string): StatsMap {
  const stats: StatsMap = {
    STR: roll3d6(rng),
    CON: roll3d6(rng),
    DEX: roll3d6(rng),
    INT: roll3d6(rng),
    WIS: roll3d6(rng),
    CHA: roll3d6(rng),
    'HP Max': roll3d6(rng) + 2,
    'MP Max': roll3d6(rng) + 2,
  };

  const race = RACES.find((r) => r.name === raceName);
  if (race) {
    for (const stat of race.stats) {
      stats[stat] += 2;
    }
  }

  const klass = KLASSES.find((k) => k.name === klassName);
  if (klass) {
    for (const stat of klass.stats) {
      stats[stat] += 2;
    }
  }

  return stats;
}

const KPARTS = [
  ['br', 'cr', 'dr', 'fr', 'gr', 'j', 'kr', 'l', 'm', 'n', 'pr', '', '', '', 'r', 'sh', 'tr', 'v', 'wh', 'x', 'y', 'z'],
  ['a', 'a', 'e', 'e', 'i', 'i', 'o', 'o', 'u', 'u', 'ae', 'ie', 'oo', 'ou'],
  ['b', 'ck', 'd', 'g', 'k', 'm', 'n', 'p', 't', 'v', 'x', 'z'],
];

export function generateName(rng: RandomGenerator): string {
  let result = '';
  for (let i = 0; i <= 5; ++i) {
    result += rng.pick(KPARTS[i % 3]);
  }
  return result.charAt(0).toUpperCase() + result.slice(1);
}

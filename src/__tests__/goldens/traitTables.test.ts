import { describe, expect, it } from 'vitest';
import {
  ALL_STATS,
  ARMORS,
  BORING_ITEMS,
  DEFENSE_ATTRIB,
  DEFENSE_BAD,
  EQUIP_SLOTS,
  IMPRESSIVE_TITLES,
  ITEM_ATTRIB,
  ITEM_OFS,
  KLASSES,
  MONSTERS,
  MON_MODS,
  OFFENSE_ATTRIB,
  OFFENSE_BAD,
  PRIME_STATS,
  RACES,
  SHIELDS,
  SPECIALS,
  SPELLS,
  TITLES,
  WEAPONS,
} from '../../data/traits';

/**
 * Structural goldens for the tables in `src/data/traits.ts`.
 *
 * This file used to read `pq-web-src/config.js` and deep-equal fourteen tables against it. That
 * submodule is gone, and the obvious replacement — snapshotting `config.js` into a fixture and
 * diffing `traits.ts` against the copy — would have been a test comparing the data to itself.
 * Any edit that damaged the tables would have been made in one place and the test would still
 * have passed, because nothing would regenerate the fixture. So the checks here changed shape.
 *
 * WHAT THIS CATCHES, and it is worth being precise because the previous test caught more:
 *
 * - An entry added to or removed from any table. Every count below is asserted exactly. Counts
 *   are not cosmetic: the engine draws from these tables with `rng.pick` and `rng.random(length)`
 *   (`src/engine/sim.ts`), so a table's length is an argument to the PRNG. Adding one monster
 *   silently rewrites every generated world downstream of that draw for every existing seed.
 * - Corruption of an entry's shape — a name/quality pair that stopped being a pair, a monster
 *   missing a drop, a race whose bonus names a stat the engine does not have.
 * - Empty or whitespace-only names, which is what a botched find-and-replace tends to leave.
 * - Accidental deduplication or accidental duplication. Two duplicates in these tables are
 *   deliberate and are pinned as such: `BORING_ITEMS` carries 'writ' twice, and `MONSTERS` lists
 *   'Rat' at two different levels. Removing either would change draw weights.
 * - The equipment ladders being sorted, reversed, or otherwise reordered. `WEAPONS`, `SHIELDS`,
 *   `ARMORS`, and `OFFENSE_ATTRIB` ascend by quality; the other modifier tables deliberately do
 *   not, so they are not held to it.
 *
 * WHAT THIS CANNOT CATCH, stated plainly rather than left to be discovered: a changed spelling, a
 * changed quality number, a swapped pair of adjacent entries that keeps the ladder ascending, or
 * a wholesale rewrite of the wording. Diffing against the original source was the only thing that
 * ever caught those, and nothing in this repository can do it now.
 *
 * That is not the whole picture, though. The fifteen transition goldens in
 * `src/__tests__/fixtures/goldens/` were recorded against the original build and reach specific
 * table entries through their pinned seeds — renaming a monster or a boring item that any of
 * those recorded runs happens to draw still fails `transitionParity.test.ts`. The coverage is
 * real but incidental, and it is a sample rather than a sweep.
 */

const COUNTS: [string, readonly unknown[], number][] = [
  ['MONSTERS', MONSTERS, 232],
  ['ITEM_OFS', ITEM_OFS, 52],
  ['SPELLS', SPELLS, 47],
  ['BORING_ITEMS', BORING_ITEMS, 42],
  ['WEAPONS', WEAPONS, 39],
  ['SPECIALS', SPECIALS, 37],
  ['ITEM_ATTRIB', ITEM_ATTRIB, 33],
  ['RACES', RACES, 21],
  ['ARMORS', ARMORS, 20],
  ['KLASSES', KLASSES, 18],
  ['SHIELDS', SHIELDS, 16],
  ['MON_MODS', MON_MODS, 16],
  ['DEFENSE_BAD', DEFENSE_BAD, 14],
  ['IMPRESSIVE_TITLES', IMPRESSIVE_TITLES, 14],
  ['EQUIP_SLOTS', EQUIP_SLOTS, 11],
  ['OFFENSE_ATTRIB', OFFENSE_ATTRIB, 11],
  ['DEFENSE_ATTRIB', DEFENSE_ATTRIB, 9],
  ['OFFENSE_BAD', OFFENSE_BAD, 9],
  ['TITLES', TITLES, 9],
  ['ALL_STATS', ALL_STATS, 8],
  ['PRIME_STATS', PRIME_STATS, 6],
];

const NAME_TABLES: [string, readonly string[]][] = [
  ['SPELLS', SPELLS],
  ['SPECIALS', SPECIALS],
  ['ITEM_ATTRIB', ITEM_ATTRIB],
  ['ITEM_OFS', ITEM_OFS],
  ['BORING_ITEMS', BORING_ITEMS],
  ['MON_MODS', MON_MODS],
  ['TITLES', TITLES],
  ['IMPRESSIVE_TITLES', IMPRESSIVE_TITLES],
  ['EQUIP_SLOTS', EQUIP_SLOTS],
];

const QUALITY_TABLES: [string, readonly [string, number][]][] = [
  ['OFFENSE_ATTRIB', OFFENSE_ATTRIB],
  ['DEFENSE_ATTRIB', DEFENSE_ATTRIB],
  ['SHIELDS', SHIELDS],
  ['ARMORS', ARMORS],
  ['WEAPONS', WEAPONS],
  ['OFFENSE_BAD', OFFENSE_BAD],
  ['DEFENSE_BAD', DEFENSE_BAD],
];

/** Tables whose entry order is a quality ladder the engine walks. The rest are ordered but flat. */
const ASCENDING_TABLES: [string, readonly [string, number][]][] = [
  ['OFFENSE_ATTRIB', OFFENSE_ATTRIB],
  ['SHIELDS', SHIELDS],
  ['ARMORS', ARMORS],
  ['WEAPONS', WEAPONS],
];

function duplicatesOf(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

describe('trait table structure', () => {
  it.each(COUNTS)('holds exactly the recorded number of %s entries', (_name, table, expected) => {
    expect(table).toHaveLength(expected);
  });

  it.each(NAME_TABLES)('gives every %s entry a non-empty name', (_name, table) => {
    expect(table.filter((entry) => typeof entry !== 'string' || entry.trim() === '')).toEqual([]);
  });

  it.each(QUALITY_TABLES)('gives every %s entry a non-empty name and an integer quality', (_name, table) => {
    expect(
      table.filter(
        (entry) =>
          !Array.isArray(entry)
          || entry.length !== 2
          || typeof entry[0] !== 'string'
          || entry[0].trim() === ''
          || !Number.isInteger(entry[1]),
      ),
    ).toEqual([]);
  });

  it.each(ASCENDING_TABLES)('keeps %s ordered by ascending quality', (_name, table) => {
    const qualities = table.map(([, quality]) => quality);

    expect(qualities).toEqual([...qualities].sort((left, right) => left - right));
  });

  // Sign is the whole distinction between the good and bad modifier tables: `generateEquipUpgrade`
  // picks between them by whether the hero out-levels the item, then subtracts the value. A stray
  // minus sign in OFFENSE_ATTRIB would make good gear worse without changing any name.
  it.each([
    ['OFFENSE_ATTRIB', OFFENSE_ATTRIB],
    ['DEFENSE_ATTRIB', DEFENSE_ATTRIB],
  ] as [string, readonly [string, number][]][])('keeps every %s bonus positive', (_name, table) => {
    expect(table.filter(([, quality]) => quality <= 0)).toEqual([]);
  });

  it.each([
    ['OFFENSE_BAD', OFFENSE_BAD],
    ['DEFENSE_BAD', DEFENSE_BAD],
  ] as [string, readonly [string, number][]][])('keeps every %s penalty negative', (_name, table) => {
    expect(table.filter(([, quality]) => quality >= 0)).toEqual([]);
  });

  it.each([
    ['SHIELDS', SHIELDS],
    ['ARMORS', ARMORS],
    ['WEAPONS', WEAPONS],
  ] as [string, readonly [string, number][]][])('keeps every %s quality non-negative', (_name, table) => {
    expect(table.filter(([, quality]) => quality < 0)).toEqual([]);
  });

  it.each([
    ['SPELLS', SPELLS],
    ['SPECIALS', SPECIALS],
    ['ITEM_ATTRIB', ITEM_ATTRIB],
    ['ITEM_OFS', ITEM_OFS],
    ['MON_MODS', MON_MODS],
    ['TITLES', TITLES],
    ['IMPRESSIVE_TITLES', IMPRESSIVE_TITLES],
    ['EQUIP_SLOTS', EQUIP_SLOTS],
  ] as [string, readonly string[]][])('lists every %s entry once', (_name, table) => {
    expect(duplicatesOf(table)).toEqual([]);
  });

  it.each(QUALITY_TABLES)('lists every %s name once', (_name, table) => {
    expect(duplicatesOf(table.map(([name]) => name))).toEqual([]);
  });

  // The one deliberate repeat, pinned rather than tolerated. See the comment above the table:
  // deduplicating 'writ' would change how often it is drawn, so the test asserts the repeat
  // exists, asserts it is the only one, and asserts it happens exactly twice.
  it('repeats writ in BORING_ITEMS, and repeats nothing else', () => {
    expect(duplicatesOf(BORING_ITEMS)).toEqual(['writ']);
    expect(BORING_ITEMS.filter((item) => item === 'writ')).toHaveLength(2);
  });

  it('gives every monster a name, a non-negative integer level, and a drop', () => {
    expect(
      MONSTERS.filter(
        ({ name, level, item }) =>
          typeof name !== 'string'
          || name.trim() === ''
          || !Number.isInteger(level)
          || level < 0
          || typeof item !== 'string'
          || item === '',
      ),
    ).toEqual([]);
  });

  // Names repeat where levels differ — 'Rat' is both a level 0 and a level 1 encounter, and the
  // quest system addresses monsters by index, so collapsing the two would shift every later index.
  it('lists every monster entry once, allowing a repeated name at a different level', () => {
    expect(duplicatesOf(MONSTERS.map((monster) => JSON.stringify(monster)))).toEqual([]);
    expect(duplicatesOf(MONSTERS.map(({ name }) => name))).toEqual(['Rat']);
  });

  it.each([
    ['RACES', RACES],
    ['KLASSES', KLASSES],
  ] as [string, readonly { name: string; stats: readonly string[] }[]][])(
    'gives every %s entry a unique name and at least one real stat bonus',
    (_name, table) => {
      expect(duplicatesOf(table.map(({ name }) => name))).toEqual([]);
      expect(
        table.filter(
          ({ name, stats }) =>
            name.trim() === ''
            || stats.length === 0
            || stats.some((stat) => !(ALL_STATS as readonly string[]).includes(stat)),
        ),
      ).toEqual([]);
    },
  );

  it('keeps the prime stats in the order everything else reads them in', () => {
    // Pinned as a literal on purpose. ALL_STATS is *derived* from PRIME_STATS, so any assertion
    // relating the two restates the derivation and cannot fail — the previous version here was
    // `expect(ALL_STATS).toEqual([...PRIME_STATS, 'HP Max', 'MP Max'])`, a character-for-character
    // copy of traits.ts:5, and reversing PRIME_STATS left all 71 assertions in this file green.
    //
    // The order is the contract: it decides the sequence stats appear in on the hero banner and in
    // the character creator. A golden that pins a load-bearing literal is doing its job when
    // editing the source line fails it. That is the opposite of the tautology it replaces, which
    // could only fail when the source line was edited in a way that broke its own restatement.
    expect(PRIME_STATS).toEqual(['STR', 'CON', 'DEX', 'INT', 'WIS', 'CHA']);
  });

  it('adds exactly the two maxima to the prime stats, and nothing else', () => {
    // The structural half, which does not restate the derivation: the extras are these two, they
    // come last, and nothing is repeated.
    expect(ALL_STATS).toHaveLength(PRIME_STATS.length + 2);
    expect(ALL_STATS.filter((stat) => !PRIME_STATS.includes(stat as never))).toEqual(['HP Max', 'MP Max']);
    expect(new Set(ALL_STATS).size).toBe(ALL_STATS.length);
  });

  // `generateEquipUpgrade` branches on these two slots by name to choose which quality table an
  // upgrade is drawn from. Everything else falls through to armour.
  it('opens the equipment slots with Weapon and Shield', () => {
    expect(EQUIP_SLOTS.slice(0, 2)).toEqual(['Weapon', 'Shield']);
  });

  // MON_MODS is declared here and read nowhere, in this codebase and in the one it descends from
  // — see the comment above the table. The shape is still asserted so that a table nothing calls
  // cannot quietly rot into something that would break if anything ever did call it.
  it('formats every unused monster modifier as a signed adjustment around a name slot', () => {
    expect(MON_MODS.filter((modifier) => !/^[+-]\d+ \S.*$/.test(modifier))).toEqual([]);
    expect(MON_MODS.filter((modifier) => !modifier.includes('*'))).toEqual([]);
  });
});

/**
 * What race and class are worth, held still while their names are free to change.
 *
 * These two tables are the ones nothing pins by content — deliberately, so the vocabulary can be
 * rewritten (#382, #384). But the entries are not only names: each grants stat bonuses at character
 * creation, which this build applies and the original never did. So a rewrite that reaches for a
 * funnier word and takes a different `stats` array with it would rebalance the game, and the only
 * symptom would be characters quietly rolling differently.
 *
 * The counts below are therefore the half that must survive a rename. They say nothing about what
 * anything is called, which is the point: rename freely, and this fails the moment the arithmetic
 * moves with the words.
 *
 * If a rebalance is ever intended, these numbers are meant to be edited in the same commit that
 * causes it — the failure is a question, not a verdict.
 */
describe('what race and class are worth', () => {
  const tally = (table: readonly { readonly stats: readonly string[] }[]) => {
    const perStat: Record<string, number> = {};
    const perWidth: Record<number, number> = {};
    for (const entry of table) {
      for (const stat of entry.stats) perStat[stat] = (perStat[stat] ?? 0) + 1;
      perWidth[entry.stats.length] = (perWidth[entry.stats.length] ?? 0) + 1;
    }
    return { perStat, perWidth };
  };

  it('grants the same spread of race bonuses however the races are named', () => {
    expect(tally(RACES).perStat).toEqual({
      CHA: 2, CON: 5, DEX: 5, 'HP Max': 2, INT: 2, 'MP Max': 2, STR: 4, WIS: 4,
    });
  });

  it('grants the same spread of class bonuses however the classes are named', () => {
    // No HP Max anywhere in this table, which is a real asymmetry with RACES rather than an
    // oversight: constitution is the racial axis and the classes leave it alone.
    expect(tally(KLASSES).perStat).toEqual({
      CHA: 2, CON: 4, DEX: 4, INT: 5, 'MP Max': 1, STR: 3, WIS: 5,
    });
  });

  it('keeps the ratio of one-stat to two-stat entries', () => {
    // The generous entries are the scarce ones, and staying scarce is what keeps a rewrite from
    // making every option a two-stat option because the names happened to suggest it.
    expect(tally(RACES).perWidth).toEqual({ 1: 16, 2: 5 });
    expect(tally(KLASSES).perWidth).toEqual({ 1: 12, 2: 6 });
  });
});

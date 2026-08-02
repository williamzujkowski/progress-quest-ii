import { describe, expect, it } from 'vitest';
import legacyConfig from '../../../pq-web-src/config.js?raw';
import {
  ARMORS,
  BORING_ITEMS,
  DEFENSE_ATTRIB,
  DEFENSE_BAD,
  EQUIP_SLOTS,
  ITEM_ATTRIB,
  ITEM_OFS,
  MONSTERS,
  MON_MODS,
  OFFENSE_ATTRIB,
  OFFENSE_BAD,
  SHIELDS,
  SPECIALS,
  WEAPONS,
} from '../../data/traits';

function legacyTable(name: string): string[] {
  const marker = `K.${name} = [`;
  const start = legacyConfig.indexOf(marker);
  const end = legacyConfig.indexOf('];', start + marker.length);
  if (start < 0 || end < 0) throw new Error(`Legacy table K.${name} was not found`);

  const parsed: unknown = JSON.parse(`[${legacyConfig.slice(start + marker.length, end)}]`);
  if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string')) {
    throw new Error(`Legacy table K.${name} is not a string array`);
  }
  return parsed;
}

function legacyNumberPairs(name: string): [string, number][] {
  return legacyTable(name).map((entry) => {
    const separator = entry.lastIndexOf('|');
    if (separator < 0) throw new Error(`Legacy K.${name} entry has no numeric separator: ${entry}`);
    return [entry.slice(0, separator), Number(entry.slice(separator + 1))];
  });
}

describe('legacy data fidelity', () => {
  it('matches the ordered equipment slot table', () => {
    expect(EQUIP_SLOTS).toEqual(legacyTable('Equips'));
  });

  it('matches the complete ordered monster and drop table', () => {
    const legacyMonsters = legacyTable('Monsters').map((entry) => {
      const [name, level, item] = entry.split('|');
      if (name === undefined || level === undefined || item === undefined) throw new Error(`Invalid legacy monster: ${entry}`);
      return { name, level: Number(level), item };
    });

    expect(MONSTERS).toEqual(legacyMonsters);
  });

  it.each([
    ['Specials', SPECIALS],
    ['ItemAttrib', ITEM_ATTRIB],
    ['ItemOfs', ITEM_OFS],
    ['BoringItems', BORING_ITEMS],
    ['MonMods', MON_MODS],
  ])('matches the ordered K.%s table', (legacyName, modernTable) => {
    expect(modernTable).toEqual(legacyTable(legacyName));
  });

  it.each([
    ['OffenseAttrib', OFFENSE_ATTRIB],
    ['DefenseAttrib', DEFENSE_ATTRIB],
    ['Shields', SHIELDS],
    ['Armors', ARMORS],
    ['Weapons', WEAPONS],
    ['OffenseBad', OFFENSE_BAD],
    ['DefenseBad', DEFENSE_BAD],
  ])('matches the ordered K.%s name and quality table', (legacyName, modernTable) => {
    expect(modernTable).toEqual(legacyNumberPairs(legacyName));
  });
});

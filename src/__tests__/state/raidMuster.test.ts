import { describe, expect, it } from 'vitest';
import { SOCIAL_PERSONAS } from '../../data/socialCatalog';
import { attendanceLabel, raidMuster } from '../../state/raidMuster';

const raid = (over: Partial<{ location: string; act: number }> = {}) =>
  ({ venue: 'raid' as const, location: 'The Auditable Deep', act: 12, ...over });

describe('raid muster', () => {
  it('takes attendance only at a raid', () => {
    for (const venue of ['field', 'road', 'town', 'dungeon', 'cinematic'] as const) {
      expect(raidMuster({ ...raid(), venue })).toBeNull();
    }
    expect(raidMuster(raid())).not.toBeNull();
  });

  it('musters distinct people from the cast the chatter panel already declares fictional', () => {
    // A second roster would be a second implied population. Everyone here is already disclaimed
    // in the interface as generated locally and sent nowhere.
    const entries = raidMuster(raid())!;
    expect(entries).toHaveLength(4);
    expect(new Set(entries.map((entry) => entry.name)).size).toBe(entries.length);
    const known = new Set(SOCIAL_PERSONAS.map((persona) => persona.displayName));
    for (const entry of entries) expect(known.has(entry.name)).toBe(true);
  });

  it('records the same absences every time the same raid is read', () => {
    // A record, not a shuffle: the clerk missing from this raid is missing from it whenever
    // anyone looks.
    expect(raidMuster(raid())).toEqual(raidMuster(raid()));
  });

  it('is mostly attended, or it stops being a joke about attendance', () => {
    let present = 0;
    let total = 0;
    for (let act = 10; act < 90; act += 1) {
      for (const entry of raidMuster(raid({ act, location: `Deep ${act}` }))!) {
        total += 1;
        if (entry.attendance === 'present') present += 1;
      }
    }
    expect(present / total).toBeGreaterThan(0.5);
    expect(present / total).toBeLessThan(1);
  });

  it('stays distinct where the cast list wraps', () => {
    for (let act = 10; act < 80; act += 1) {
      const entries = raidMuster(raid({ act }))!;
      expect(new Set(entries.map((entry) => entry.name)).size).toBe(entries.length);
    }
  });

  it('never suggests attendance changes the encounter', () => {
    // The encounter is resolved by opponent puissance and character level, here as everywhere.
    const forbidden = /damage|dps|heal|tank|buff|bonus|stronger|easier|harder/i;
    for (const attendance of ['present', 'regrets', 'absent'] as const) {
      expect(attendanceLabel(attendance)).not.toMatch(forbidden);
    }
  });
});

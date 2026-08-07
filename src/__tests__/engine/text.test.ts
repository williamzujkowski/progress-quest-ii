import { describe, expect, it } from 'vitest';
import { formatDuration, indefinite, plural, stableChoice } from '../../engine/text';

describe('legacy text grammar', () => {
  it.each([
    ['fairy', 'fairies'],
    ['succubus', 'succubi'],
    ['lich', 'liches'],
    ['box', 'boxes'],
    ['boss', 'bosses'],
    ['brush', 'brushes'],
    ['elf', 'elves'],
    ['caveman', 'cavemen'],
    // A grammar fixture, not a trait reference. No race ends in -man any more, but the rule still
    // applies to monster and item text, so it keeps explicit coverage here.
    ['Escalation Man', 'Escalation Men'],
    ['Off-Prem Elf', 'Off-Prem Elves'],
    ['rat', 'rats'],
  ])('pluralizes %s as %s', (singular, expected) => {
    expect(plural(singular)).toBe(expected);
  });

  it('adds the canonical article or quantity', () => {
    expect(indefinite('rat')).toBe('a rat');
    expect(indefinite('imp')).toBe('an imp');
    expect(indefinite('rat', 2)).toBe('2 rats');
  });
});

describe('duration formatting', () => {
  it('reports at the precision a sampled projection actually supports', () => {
    // Two units at most. "4h 12m 37s" would dress a five-minute average up as a stopwatch.
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45)).toBe('45s');
    // Rounds before choosing a unit, so the boundary reads as a minute rather than "60s".
    expect(formatDuration(59.6)).toBe('1m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(3_599)).toBe('59m');
    expect(formatDuration(3_600)).toBe('1h');
    expect(formatDuration(15_120)).toBe('4h 12m');
    expect(formatDuration(86_400)).toBe('1d');
    expect(formatDuration(90_000)).toBe('1d 1h');
  });

  it('drops the smaller unit when it would read as zero rather than printing it', () => {
    expect(formatDuration(7_200)).toBe('2h');
    expect(formatDuration(172_800)).toBe('2d');
  });

  it('refuses durations that are not durations', () => {
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('stable choice', () => {
  it('returns an index inside the range for every key', () => {
    // The first implementation let a signed intermediate through and produced negative indices,
    // which read as an undefined option rather than as an error.
    for (let i = 0; i < 2_000; i += 1) {
      for (const length of [1, 2, 3, 8, 47]) {
        const index = stableChoice(`key-${i}`, length);
        expect(Number.isInteger(index)).toBe(true);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(length);
      }
    }
  });

  it('is stable for a key, which is the whole point of it', () => {
    expect(stableChoice('the same key', 7)).toBe(stableChoice('the same key', 7));
  });

  it('decides independently for keys differing only by a suffix', () => {
    // stableIndex multiplies by 31, so its result modulo two depends only on the parity of the
    // key's character-code sum. Four keys sharing a prefix and differing by a one-word suffix
    // therefore moved together, and a cast of four two-option seats had two outcomes instead of
    // sixteen. This pins the property that fixed it.
    const suffixes = ['official', 'logistics', 'field', 'support'];
    const combinations = new Set<string>();
    for (let i = 0; i < 1_000; i += 1) {
      combinations.add(suffixes.map((suffix) => stableChoice(`subject-${i}:${suffix}`, 2)).join(''));
    }
    expect(combinations.size).toBe(2 ** suffixes.length);
  });

  it('spreads roughly evenly across the options', () => {
    const counts = new Array(4).fill(0);
    for (let i = 0; i < 4_000; i += 1) counts[stableChoice(`spread-${i}`, 4)] += 1;
    for (const count of counts) expect(count).toBeGreaterThan(4_000 / 4 * 0.8);
  });

  it('refuses a length that is not a length', () => {
    for (const length of [0, -1, 1.5, Number.NaN]) {
      expect(() => stableChoice('key', length)).toThrow(RangeError);
    }
  });
});

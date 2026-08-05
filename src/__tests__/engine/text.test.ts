import { describe, expect, it } from 'vitest';
import { formatDuration, indefinite, plural } from '../../engine/text';

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
    ['Eel Man', 'Eel Men'],
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

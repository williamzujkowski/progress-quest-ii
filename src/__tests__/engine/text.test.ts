import { describe, expect, it } from 'vitest';
import { indefinite, plural } from '../../engine/text';

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

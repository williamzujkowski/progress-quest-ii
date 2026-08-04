import { describe, expect, it } from 'vitest';
import { describeGameNumber, formatGameNumber } from '../../engine/text';

describe('large game-number presentation', () => {
  it.each([
    [0, '0'],
    [999_999, '999999'],
    [1_000_000, '1.00e6'],
    [1_234_567, '1.23e6'],
    [-1_000_000, '-1.00e6'],
    [1_000_000_000, '1.00e9'],
    [1_000_000_000_000, '1.00e12'],
  ])('formats %s without changing ordinary-scale values', (value, expected) => {
    expect(formatGameNumber(value)).toBe(expected);
  });

  it.each([
    [1_000_000, '1 million'],
    [1_234_567, '1.23 million'],
    [1_000_000_000_000, '1 trillion'],
  ])('provides an understandable spoken label for %s', (value, expected) => {
    expect(describeGameNumber(value)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('fails safely for %s', (value) => {
    expect(formatGameNumber(value)).toBe('—');
    expect(describeGameNumber(value)).toBe('unavailable');
  });
});

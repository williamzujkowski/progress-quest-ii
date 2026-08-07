import { describe, expect, it } from 'vitest';
import { describeGameNumber, formatGameNumber } from '../../engine/text';

describe('large game-number presentation', () => {
  it.each([
    [0, '0'],
    [0.004, '4.00e-3'],
    [-0.004, '-4.00e-3'],
    [Number.MIN_VALUE, '5.00e-324'],
    [0.5, '0.5'],
    [1_234.5, '1234.5'],
    [999_999, '999999'],
    [999_999.999_999_999_9, '1.00e6'],
    [1_000_000, '1.00e6'],
    [1_000_001, '1.00e6'],
    [1_234_567, '1.23e6'],
    [-1_000_000, '-1.00e6'],
    [1_000_000_000, '1.00e9'],
    [1_000_000_000_000, '1.00e12'],
  ])('formats %s without changing ordinary-scale values', (value, expected) => {
    expect(formatGameNumber(value)).toBe(expected);
  });

  // These are over the character budget on their decimals alone, and used to
  // print as "1.53e4" — longer than the plain form, less precise than it, and rendered beside a
  // denominator still in plain digits ("1.53e4 / 75600"). Plot progress produces exactly this.
  it.each([
    [15_300.2, '15300'],
    [15_900.456_7, '15900'],
    [12_345.6, '12346'],
    [-15_300.2, '-15300'],
    [999_999.4, '999999'],
  ])('keeps %s in plain digits rather than spending the budget on decimals', (value, expected) => {
    expect(formatGameNumber(value)).toBe(expected);
    // The spoken form has to agree about which values are still writable, or a screen reader
    // hears scientific notation while the screen shows digits.
    expect(describeGameNumber(value)).toBe(expected);
  });

  it('still escalates when rounding reaches the threshold', () => {
    // 999999.9999 rounds to 1000000, which is over budget and genuinely wants scientific notation.
    // Truncating instead would report 999999 and understate a value that has arrived at a million.
    expect(formatGameNumber(999_999.999_999_999_9)).toBe('1.00e6');
    expect(describeGameNumber(999_999.999_999_999_9)).toBe('1 million');
  });

  it.each([
    [0.004, '0.004'],
    [-0.004, '-0.004'],
    [Number.MIN_VALUE, '5.00 times 10 to the negative 324'],
    [1_000_000, '1 million'],
    [999_999.999_999_999_9, '1 million'],
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

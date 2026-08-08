import { describe, expect, it } from 'vitest';
import { ZERO, add, compare, fromNumber, scale, toNumber } from '../../engine/magnitude';

describe('magnitude', () => {
  it('round-trips any ordinary number the game deals in', () => {
    for (const value of [0, 1, 7, 42, 1000, 1_000_000, 999_999_999]) {
      expect(toNumber(fromNumber(value)), `${value}`).toBe(value);
    }
  });

  it('normalises at construction so equal quantities are equal values', () => {
    // Without this every consumer has to normalise before comparing anything.
    expect(fromNumber(12)).toEqual({ mantissa: 1.2, decades: 1 });
    expect(scale(fromNumber(1.2), 10)).toEqual(fromNumber(12));
  });

  it('keeps the mantissa bounded however far the value escalates', () => {
    // The property the whole carrier exists for: the engine never multiplies a large number.
    let value = fromNumber(1);
    for (let step = 0; step < 400; step += 1) {
      value = scale(value, 9.5);
      expect(value.mantissa, `after ${step} steps`).toBeGreaterThanOrEqual(1);
      expect(value.mantissa, `after ${step} steps`).toBeLessThan(10);
      expect(Number.isFinite(value.mantissa)).toBe(true);
    }
    // Four hundred multiplications of 9.5 is far past what a double can hold.
    expect(value.decades).toBeGreaterThan(380);
  });

  it('reports null rather than a lossy number past the safe range', () => {
    // A caller computing with this needs to know the answer stopped being exact. Handing back an
    // inexact Number is how a scoreboard starts disagreeing with itself.
    expect(toNumber(fromNumber(2 ** 53))).toBeNull();
    expect(toNumber({ mantissa: 1, decades: 40 })).toBeNull();
    expect(toNumber(ZERO)).toBe(0);
  });

  it('adds across scales without the smaller term corrupting the larger', () => {
    expect(toNumber(add(fromNumber(300), fromNumber(45)))).toBe(345);
    // Twenty decades apart: the small term cannot survive the mantissa's precision, and dropping it
    // is the correct answer rather than a rounding artefact.
    const huge = { mantissa: 5, decades: 30 } as const;
    expect(add(huge, fromNumber(7))).toEqual(huge);
  });

  it('orders values it cannot materialise', () => {
    const big = { mantissa: 1, decades: 60 } as const;
    const bigger = { mantissa: 2, decades: 60 } as const;
    const vast = { mantissa: 1, decades: 61 } as const;

    expect(toNumber(big)).toBeNull();
    expect(compare(big, bigger)).toBe(-1);
    expect(compare(vast, bigger)).toBe(1);
    expect(compare(big, big)).toBe(0);
    expect(compare(ZERO, big)).toBe(-1);
  });

  it('refuses input that would poison the carrier', () => {
    // These reach the engine from imported saves, so failing closed matters more than being clever.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1, -0.5]) {
      expect(fromNumber(bad), `${bad}`).toEqual(ZERO);
    }
    expect(scale(fromNumber(10), Number.NaN)).toEqual(ZERO);
    expect(scale(fromNumber(10), -2)).toEqual(ZERO);
  });

  it('never returns a denormal mantissa, in either direction', () => {
    // Downward as well as up. The first version of this carrier stopped borrowing at zero decades,
    // so any value below one came back denormal and broke the invariant every other function relies
    // on. Scaling down is legal even though the point of the carrier is growth.
    let value = fromNumber(1_000_000);
    for (let step = 0; step < 12; step += 1) {
      value = scale(value, 0.1);
      expect(value.mantissa >= 1 && value.mantissa < 10, `step ${step}: mantissa ${value.mantissa}`).toBe(true);
    }
    expect(value.decades).toBeLessThan(0);
    expect(toNumber(value)).toBeCloseTo(1e-6, 12);
  });
});

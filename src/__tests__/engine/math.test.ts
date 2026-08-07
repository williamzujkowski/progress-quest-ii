import { describe, expect, it } from 'vitest';
import { calculateEncumbranceMax, generateInitialStats, levelUpTime, MAX_FINITE_CHARACTER_LEVEL, roll3d6 } from '../../engine/math';
import { RandomGenerator } from '../../engine/prng';
import { generateExterminateQuest } from '../../engine/sim';

describe('Progress Quest Engine Math', () => {
  it('calculates level up time correctly according to exponential formula', () => {
    // Level 1: Math.round((20 + 1.15^1) * 60) = Math.round(21.15 * 60) = 1269
    expect(levelUpTime(1)).toBe(1269);
    // Level 2: Math.round((20 + 1.15^2) * 60) = Math.round((20 + 1.3225) * 60) = 1279
    expect(levelUpTime(2)).toBe(1279);
    // Higher levels scale exponentially
    expect(levelUpTime(10)).toBeGreaterThan(levelUpTime(5));
  });

  it('keeps experience duration finite when an accepted level exceeds numeric range', () => {
    expect(Number.isFinite(levelUpTime(MAX_FINITE_CHARACTER_LEVEL))).toBe(true);
    expect(levelUpTime(MAX_FINITE_CHARACTER_LEVEL + 1)).toBe(Number.MAX_VALUE);
  });

  it('rolls 3d6 within bounds [3, 18]', () => {
    const rng = new RandomGenerator(42);
    for (let i = 0; i < 100; i++) {
      const roll = roll3d6(rng);
      expect(roll).toBeGreaterThanOrEqual(3);
      expect(roll).toBeLessThanOrEqual(18);
    }
  });

  it('calculates encumbrance max as STR + 10', () => {
    expect(calculateEncumbranceMax(12)).toBe(22);
    expect(calculateEncumbranceMax(18)).toBe(28);
  });

  it('generates initial stats with race and class bonuses applied', () => {
    // Measured against the same seed with no race and no class, so the difference IS the bonus.
    // The previous version asserted only that each stat exceeded zero, which roll3d6 already
    // guarantees at three — it passed with both bonus loops deleted.
    const rolled = generateInitialStats(new RandomGenerator(12345), 'no-such-race', 'no-such-class');
    const stats = generateInitialStats(new RandomGenerator(12345), 'Sub-Subprocessor', 'Robot Monk');

    // Sub-Subprocessor raises DEX and CON; Robot Monk raises STR. Two points each, and nothing else.
    expect(stats.DEX - rolled.DEX).toBe(2);
    expect(stats.CON - rolled.CON).toBe(2);
    expect(stats.STR - rolled.STR).toBe(2);
    for (const untouched of ['INT', 'WIS', 'CHA', 'HP Max', 'MP Max'] as const) {
      expect(stats[untouched] - rolled[untouched], `${untouched} should carry no bonus`).toBe(0);
    }

    // An unknown race or class is not an error, it simply grants nothing — which is what makes
    // the comparison above valid rather than a coincidence.
    expect(rolled.STR).toBeGreaterThanOrEqual(3);
  });

  it('produces deterministic output with a fixed PRNG seed', () => {
    const rng1 = new RandomGenerator('test-seed-abc');
    const rng2 = new RandomGenerator('test-seed-abc');

    const roll1 = roll3d6(rng1);
    const roll2 = roll3d6(rng2);

    expect(roll1).toBe(roll2);
  });

  it('rejects an empty random selection instead of returning an untyped undefined', () => {
    expect(() => new RandomGenerator(42).pick([])).toThrow(RangeError);
  });

  it('generates an exterminate quest with exactly four deterministic monster picks', () => {
    const firstRng = new RandomGenerator('quest-seed');
    const secondRng = new RandomGenerator('quest-seed');
    const first = generateExterminateQuest(firstRng, 1);
    const second = generateExterminateQuest(secondRng, 1);
    const expectedRng = new RandomGenerator('quest-seed');
    for (let pick = 0; pick < 4; pick += 1) expectedRng.random(1000);

    expect(first).toEqual(second);
    expect(first.kind).toBe('exterminate');
    expect(first.description).toMatch(/^Exterminate the /);
    expect(first.target.split('|')).toHaveLength(3);
    expect(first.targetIndex).toBeGreaterThanOrEqual(0);
    expect(firstRng.getState()).toEqual(expectedRng.getState());
  });
});

import { describe, expect, it } from 'vitest';
import { calculateEncumbranceMax, generateInitialStats, levelUpTime, MAX_FINITE_CHARACTER_LEVEL, roll3d6 } from '../../engine/math';
import { RandomGenerator } from '../../engine/prng';

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
    const rng = new RandomGenerator(12345);
    const stats = generateInitialStats(rng, 'Hob-Hobbit', 'Robot Monk');
    
    expect(stats.STR).toBeGreaterThan(0);
    expect(stats.CON).toBeGreaterThan(0);
    expect(stats.DEX).toBeGreaterThan(0);
    expect(stats.INT).toBeGreaterThan(0);
    expect(stats.WIS).toBeGreaterThan(0);
    expect(stats.CHA).toBeGreaterThan(0);
    expect(stats['HP Max']).toBeGreaterThan(0);
    expect(stats['MP Max']).toBeGreaterThan(0);
  });

  it('produces deterministic output with a fixed PRNG seed', () => {
    const rng1 = new RandomGenerator('test-seed-abc');
    const rng2 = new RandomGenerator('test-seed-abc');

    const roll1 = roll3d6(rng1);
    const roll2 = roll3d6(rng2);

    expect(roll1).toBe(roll2);
  });
});

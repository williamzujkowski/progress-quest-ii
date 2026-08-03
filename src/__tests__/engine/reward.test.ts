import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { generateItemReward, generateSpellReward, generateStatReward, selectQuestReward } from '../../engine/sim';
import type { StatsMap } from '../../engine/types';

const balancedStats: StatsMap = { STR: 10, CON: 10, DEX: 10, INT: 10, WIS: 10, CHA: 10, 'HP Max': 10, 'MP Max': 10 };
const skewedStats: StatsMap = { ...balancedStats, STR: 30 };
const fractionalStats: StatsMap = { ...balancedStats, STR: 1.9, CON: 1, DEX: 1, INT: 1, WIS: 1, CHA: 1 };

describe('legacy quest reward selector', () => {
  it.each([
    ['reward-6', 'spell', [0.8582482466008514, 0.6167068143840879, 0.3130796393379569, 939509]],
    ['reward-1', 'equipment', [0.44075472583062947, 0.5691582697909325, 0.868644927861169, 1340950]],
    ['reward-0', 'stat', [0.8887170488014817, 0.786268072668463, 0.7947072512470186, 1936669]],
    ['reward-2', 'item', [0.9888206494506449, 0.6089199453126639, 0.9673357147257775, 907069]],
  ] as const)('selects %s as %s with one RNG call', (seed, expected, expectedState) => {
    const rng = new RandomGenerator(seed);

    expect(selectQuestReward(rng)).toBe(expected);
    expect(rng.getState()).toEqual(expectedState);
  });

});

describe('legacy spell reward', () => {
  it('uses two low-biased picks from the level and wisdom capped pool', () => {
    const rng = new RandomGenerator('spell-reward');
    const spell = generateSpellReward(rng, 1, 10);

    expect([spell, rng.getState()]).toEqual([
      'Cone of Annoyance',
      [0.1777116870507598, 0.3775933461729437, 0.8863792216870934, 802657],
    ]);
  });

  it('does not consume RNG when an accepted save has an invalid spell pool', () => {
    const rng = new RandomGenerator('invalid-spell-pool');
    const initialState = rng.getState();

    expect(generateSpellReward(rng, 1, -1)).toBeUndefined();
    expect(rng.getState()).toEqual(initialState);
  });
});

describe('legacy stat reward', () => {
  it.each([
    ['stat-0', 'CHA', [0.3283885531127453, 0.29530849447473884, 0.5603134867269546, 1437228]],
    ['stat-3', 'DEX', [0.35300477920100093, 0.5078754595015198, 0.07098527019843459, 555139]],
  ] as const)('covers direct and weighted selection for %s', (seed, stat, state) => {
    const rng = new RandomGenerator(seed);

    expect([generateStatReward(rng, balancedStats), rng.getState()]).toEqual([stat, state]);
  });

  it('uses square weighting for skewed prime stats', () => {
    const rng = new RandomGenerator('stat-3');
    expect(generateStatReward(rng, skewedStats)).toBe('STR');
    expect(rng.getState()).toEqual([0.35300477920100093, 0.5078754595015198, 0.07098527019843459, 555139]);
  });

  it('truncates accepted fractional stats like legacy GetI', () => {
    const rng = new RandomGenerator('edge-0');
    expect(generateStatReward(rng, fractionalStats)).toBe('CON');
    expect(rng.getState()).toEqual([0.9787654045503587, 0.00042752851732075214, 0.1746194192674011, 1634575]);
  });
});

describe('legacy item reward', () => {
  it('generates a three-part special item for an ordinary inventory', () => {
    const rng = new RandomGenerator('item-special');
    expect([generateItemReward(rng, ['Gold']), rng.getState()]).toEqual([
      'Reverential Galoon of Grob',
      [0.6745457765646279, 0.42392367543652654, 0.7211832229513675, 1289757],
    ]);
  });

  it('can duplicate the ordered Gold row in a sufficiently large inventory', () => {
    const inventoryNames = ['Gold', ...Array.from({ length: 299 }, (_, index) => `Item ${index}`)];
    const rng = new RandomGenerator('reuse-733');

    expect(generateItemReward(rng, inventoryNames)).toBe('Gold');
    expect(rng.getState()).toEqual([0.41563358227722347, 0.8341085575520992, 0.955911073833704, 1794342]);
  });

  it('preserves an accepted empty inventory label without consuming fallback rolls', () => {
    const inventoryNames = ['', ...Array.from({ length: 299 }, (_, index) => `Item ${index}`)];
    const rng = new RandomGenerator('reuse-733');

    expect(generateItemReward(rng, inventoryNames)).toBe('');
    expect(rng.getState()).toEqual([0.41563358227722347, 0.8341085575520992, 0.955911073833704, 1794342]);
  });
});

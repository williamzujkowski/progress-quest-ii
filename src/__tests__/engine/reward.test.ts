import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { generateSpellReward, selectQuestReward } from '../../engine/sim';

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
});

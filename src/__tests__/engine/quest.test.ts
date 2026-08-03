import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { generateDeliverQuest, generateFetchQuest, generatePlacateQuest, generateSeekQuest } from '../../engine/sim';

function stateAfterPicks(seed: string, picks: number) {
  const rng = new RandomGenerator(seed);
  for (let pick = 0; pick < picks; pick += 1) rng.random(1_000);
  return rng.getState();
}

describe('legacy quest generators', () => {
  it('generates Seek with two RNG picks', () => {
    const rng = new RandomGenerator('seek');
    const quest = generateSeekQuest(rng);

    expect(quest).toMatchObject({ kind: 'seek', description: expect.stringMatching(/^Seek the /) });
    expect(rng.getState()).toEqual(stateAfterPicks('seek', 2));
  });

  it('generates Deliver and Fetch with one RNG pick each', () => {
    const deliverRng = new RandomGenerator('deliver');
    const fetchRng = new RandomGenerator('fetch');

    expect(generateDeliverQuest(deliverRng)).toMatchObject({ kind: 'deliver', description: expect.stringMatching(/^Deliver this /) });
    expect(generateFetchQuest(fetchRng)).toMatchObject({ kind: 'fetch', description: expect.stringMatching(/^Fetch me (a|an) /) });
    expect(deliverRng.getState()).toEqual(stateAfterPicks('deliver', 1));
    expect(fetchRng.getState()).toEqual(stateAfterPicks('fetch', 1));
  });

  it('generates Placate with two monster picks and no kill target', () => {
    const rng = new RandomGenerator('placate');
    const quest = generatePlacateQuest(rng, 1);

    expect(quest).toEqual({ kind: 'placate', description: expect.stringMatching(/^Placate the /) });
    expect('target' in quest).toBe(false);
    expect(rng.getState()).toEqual(stateAfterPicks('placate', 2));
  });
});

import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import { levelUpTime } from '../../engine/math';
import { advanceGame } from '../../engine/transition';
import { projectWorld } from '../../state/worldContext';

/**
 * Driven through the real engine rather than hand-built records: the whole point is that a rare
 * classification produces a different reaction, and only the engine decides what is rare.
 */
function harvest(seed: string, hours: number) {
  const rng = new RandomGenerator(seed);
  let state = {
    character: createNewCharacter('Harvest', 'Half Orc', 'Robot Monk', rng),
    progression: { experience: { currentSeconds: 0, maxSeconds: levelUpTime(1) }, completedTasks: 0, elapsedSeconds: 0 },
  };
  const byLabel = new Map<string, { items: number; notices: number; texts: string[] }>();
  for (let step = 0; step < hours * 60 * 60 * 20; step += 1) {
    const result = advanceGame(state, 50, rng);
    state = result.state;
    for (const record of result.records) {
      const projection = projectWorld({ kind: 'transition', source: { activityId: 0, record } });
      if (!projection.equipment) continue;
      const bucket = byLabel.get(projection.equipment.label) ?? { items: 0, notices: 0, texts: [] };
      bucket.items += 1;
      bucket.notices += projection.notices.length;
      bucket.texts.push(...projection.notices.map((entry) => entry.text));
      byLabel.set(projection.equipment.label, bucket);
    }
  }
  return byLabel;
}

describe('legendary acquisitions', () => {
  const harvested = harvest('legendary-remark', 6);

  it('are rare enough that remarking on them means something', () => {
    // Counted as acquisitions, not as notices. Legendary items now emit two notices each, so
    // measuring their share of notice text would count the remark as evidence for its own
    // justification - which is how the first version of this test read 10% for a 2% event.
    //
    // The bound is loose because the rate genuinely varies by seed: two six-hour runs came out at
    // 1.8% and 5.3%. It is here to catch the tier becoming ordinary, not to pin a frequency the
    // engine never promised.
    const total = [...harvested.values()].reduce((sum, bucket) => sum + bucket.items, 0);
    const legendary = harvested.get('legendary')?.items ?? 0;
    expect(legendary).toBeGreaterThan(0);
    expect(legendary / total).toBeLessThan(0.15);
  });

  it('say something the ordinary ones do not', () => {
    // Previously every tier produced the same sentence with a different adjective in it.
    const legendary = harvested.get('legendary')!;
    const serviceable = harvested.get('serviceable')!;
    expect(legendary.notices).toBe(legendary.items * 2);
    expect(serviceable.texts.every((text) => text.includes('filed at generation quality'))).toBe(true);
    expect(legendary.texts.some((text) => !text.includes('filed at generation quality'))).toBe(true);
  });

  it('still state plainly that nothing was gained in a fight', () => {
    const legendary = harvested.get('legendary')!;
    expect(legendary.texts.some((text) => text.includes('no combat effect is modeled'))).toBe(true);
    for (const text of legendary.texts) {
      expect(text).not.toMatch(/damage|mitigat|stronger|deadlier|powerful|bonus to/i);
    }
  });
});

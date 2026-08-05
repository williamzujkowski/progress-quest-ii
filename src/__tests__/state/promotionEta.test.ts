import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import { levelUpTime } from '../../engine/math';
import { advanceGame } from '../../engine/transition';
import {
  MAX_PROJECTED_SECONDS, computePromotionEta, retainPromotionWindow, type PromotionSample,
} from '../../state/promotionEta';

/**
 * `elapsedSeconds` is the game's clock and `atMs` is the wall's. Keeping them independent in the
 * fixture is the point of most of what follows: the projection must depend on the former and use
 * the latter only to bound the buffer.
 */
const sample = (
  elapsedSeconds: number,
  currentSeconds: number,
  maxSeconds = 1000,
  atMs = elapsedSeconds * 1000,
): PromotionSample => ({ atMs, currentSeconds, maxSeconds, elapsedSeconds });

describe('promotion projection', () => {
  it('says nothing until the game clock has advanced far enough to average over', () => {
    expect(computePromotionEta([])).toBeNull();
    expect(computePromotionEta([sample(0, 10)])).toBeNull();
    // Ten seconds of play is a rate measured across one long task or none.
    expect(computePromotionEta([sample(0, 10), sample(10, 20)])).toBeNull();
  });

  it('projects the remaining track at the observed rate', () => {
    // Half a track earned over a hundred seconds of play; the other half takes another hundred.
    expect(computePromotionEta([sample(0, 0, 1000), sample(100, 500, 1000)])).toBe(100);
  });

  it('projects from the rate rather than assuming a second per second', () => {
    // The premise this module rejects: 100 experience-seconds earned across 200 elapsed ones.
    // Treating the track as a clock would say 900 remain; the observed rate says 1800.
    expect(computePromotionEta([sample(0, 0, 1000), sample(200, 100, 1000)])).toBe(1800);
  });

  it('is unmoved by a catch-up drain replaying game time faster than real time', () => {
    // The defect the browser caught. A returning session credits a closed absence and replays it
    // in a burst: 400 seconds of play inside 2 seconds of wall clock. Measured against the wall
    // this reads as an enormous rate and projected four minutes for an hour's work.
    //
    // Both windows below describe identical play. Only the wall clock differs, so only a
    // projection that ignores the wall clock can return the same answer for both.
    const live = [sample(0, 0, 1000, 0), sample(400, 200, 1000, 400_000)];
    const drained = [sample(0, 0, 1000, 0), sample(400, 200, 1000, 2_000)];

    expect(computePromotionEta(drained)).toBe(computePromotionEta(live));
    expect(computePromotionEta(drained)).toBe(1600);
  });

  it('says nothing across a level-up rather than reporting the reset as a loss', () => {
    // currentSeconds returns to zero on promotion, so a straddling window reads as negative
    // progress. A rate measured across a reset is not a rate.
    expect(computePromotionEta([sample(0, 900, 1000), sample(100, 40, 1200)])).toBeNull();
  });

  it('says nothing when the track has not moved at all', () => {
    // A stretch spent entirely on tasks that earn nothing. Dividing by that rate yields infinity,
    // which is not a duration.
    expect(computePromotionEta([sample(0, 500, 1000), sample(100, 500, 1000)])).toBeNull();
  });

  it('says nothing while paused, however long the wall clock runs', () => {
    // Pausing stops the game clock but not the sampler. The span it cares about never opens.
    const paused = [sample(500, 300, 1000, 0), sample(500, 300, 1000, 600_000)];
    expect(computePromotionEta(paused)).toBeNull();
  });

  it('measures the remaining track against the level the last sample was on', () => {
    // maxSeconds grows with level. Reading it from the first sample would project the previous
    // level's requirement onto the current level's progress.
    expect(computePromotionEta([sample(0, 100, 1000), sample(100, 200, 5000)])).toBe(4800);
  });

  it('declines to project absurd distances', () => {
    // Levels get expensive fast. Past a hundred hours the figure stops informing anyone.
    expect(computePromotionEta([sample(0, 0, 10_000_000), sample(100, 1, 10_000_000)])).toBeNull();
    const brisk = [sample(0, 0, MAX_PROJECTED_SECONDS), sample(100, 100, MAX_PROJECTED_SECONDS)];
    expect(computePromotionEta(brisk)).not.toBeNull();
  });

  it('keeps one sample behind the cutoff so the window never collapses', () => {
    const samples = [sample(0, 0, 1000, 0), sample(400, 10, 1000, 400_000), sample(500, 20, 1000, 500_000)];
    const retained = retainPromotionWindow(samples, 500_000);
    // The first sample is older than the five-minute window but is the only thing giving the
    // retained set a span at all.
    expect(retained).toHaveLength(3);
    expect(retainPromotionWindow([], 500_000)).toEqual([]);
  });
});

describe('the assumption this module rejects', () => {
  it('confirms the experience track is not a clock', () => {
    // Guards the premise directly against the real engine. If experience ever starts accruing on
    // every task, this fails and the module's whole justification should be revisited rather than
    // quietly left in place.
    const rng = new RandomGenerator('eta-premise');
    let state = {
      character: createNewCharacter('Premise', 'Half Orc', 'Robot Monk', rng),
      progression: { experience: { currentSeconds: 0, maxSeconds: levelUpTime(1) }, completedTasks: 0, elapsedSeconds: 0 },
    };

    let earned = 0;
    let previous = state.progression.experience.currentSeconds;
    // Twenty simulated minutes at the clock's own cadence.
    for (let step = 0; step < 20 * 60 * 20; step += 1) {
      state = advanceGame(state, 50, rng).state;
      const now = state.progression.experience.currentSeconds;
      // Ignore the level-up resets; only accumulate forward motion.
      if (now >= previous) earned += now - previous;
      previous = now;
    }

    const ratio = earned / state.progression.elapsedSeconds;
    expect(ratio).toBeGreaterThan(0);
    // Comfortably below one. Measured at 0.806 over six hours; the bound is loose enough to
    // survive a shorter sample without being loose enough to pass if the gap ever closed.
    expect(ratio).toBeLessThan(0.95);
  });
});

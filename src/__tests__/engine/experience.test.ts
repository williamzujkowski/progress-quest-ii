import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { levelUpTime } from '../../engine/math';
import { createNewCharacter } from '../../engine/sim';
import { advanceGame, type GameTransitionState } from '../../engine/transition';

/**
 * The experience track is the one progression bar with no UI, so nothing was asserting it.
 * These pin the two behaviours the legacy oracle defines in main.js:915-923 — a kill task
 * either advances the track by its own duration in seconds, or, when the track is already
 * full, spends it on a level instead. Non-kill work never touches it.
 */

const killState = (durationMs: number, experience: { currentSeconds: number; maxSeconds: number }): GameTransitionState => {
  const character = createNewCharacter('Experience Subject', 'Half Daemon', 'Incident Paladin', 4242);
  character.Task = { description: 'Executing a Rat...', durationMs, elapsedMs: 0, type: 'kill' };
  character.PendingTasks = undefined;
  return { character, progression: { experience, completedTasks: 0, elapsedSeconds: 0 } };
};

describe('experience track', () => {
  it('advances by the completed task duration in seconds, matching ExpBar.increment(TaskBar.Max() / 1000)', () => {
    const state = killState(4_000, { currentSeconds: 10, maxSeconds: 1_000 });
    const result = advanceGame(state, 4_000, new RandomGenerator('experience-gain'));

    expect(result.state.progression.experience.currentSeconds).toBe(14);
    expect(result.state.progression.experience.maxSeconds).toBe(1_000);
    expect(result.state.character.Traits.Level).toBe(state.character.Traits.Level);
  });

  it('never advances past its own maximum', () => {
    const state = killState(60_000, { currentSeconds: 990, maxSeconds: 1_000 });
    const result = advanceGame(state, 60_000, new RandomGenerator('experience-clamp'));

    expect(result.state.progression.experience.currentSeconds).toBe(1_000);
  });

  it('spends a full track on a level and resets to the next level-up time', () => {
    const state = killState(4_000, { currentSeconds: 1_000, maxSeconds: 1_000 });
    const startingLevel = state.character.Traits.Level;
    const result = advanceGame(state, 4_000, new RandomGenerator('experience-level'));

    expect(result.state.character.Traits.Level).toBe(startingLevel + 1);
    expect(result.state.progression.experience).toEqual({
      currentSeconds: 0,
      maxSeconds: levelUpTime(startingLevel + 1),
    });
    expect(result.records.some((record) => record.event.type === 'level_gained')).toBe(true);
  });

  it('leaves the track alone for work that is not a kill', () => {
    const state = killState(4_000, { currentSeconds: 10, maxSeconds: 1_000 });
    state.character.Task = { description: 'Selling loot...', durationMs: 4_000, elapsedMs: 0, type: 'selling' };
    const result = advanceGame(state, 4_000, new RandomGenerator('experience-idle'));

    expect(result.state.progression.experience.currentSeconds).toBe(10);
    expect(result.state.character.Traits.Level).toBe(state.character.Traits.Level);
  });

  it('reproduces the legacy level-up curve exactly', () => {
    // config.js:307 — Math.round((20 + Math.pow(1.15, level)) * 60)
    for (const level of [1, 2, 10, 50, 87]) {
      expect(levelUpTime(level)).toBe(Math.round((20 + 1.15 ** level) * 60));
    }
  });
});

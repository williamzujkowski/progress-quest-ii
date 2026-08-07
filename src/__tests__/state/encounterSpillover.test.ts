import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import { levelUpTime } from '../../engine/math';
import { advanceGame } from '../../engine/transition';
import { projectWorld } from '../../state/worldContext';

/**
 * The multi-opponent pull, which is a real thing the engine decides: a kill task's duration is
 * derived from the opponent count, so a crowd genuinely takes longer.
 */
function noticesFor(level: number, hours: number) {
  const rng = new RandomGenerator('spillover');
  const character = createNewCharacter('Crowded', 'Half Daemon', 'Robot Monk', rng);
  character.Traits.Level = level;
  let state = {
    character,
    progression: { experience: { currentSeconds: 0, maxSeconds: levelUpTime(level) }, completedTasks: 0, elapsedSeconds: 0 },
  };
  const texts: string[] = [];
  for (let step = 0; step < hours * 60 * 60 * 20; step += 1) {
    const result = advanceGame(state, 50, rng);
    state = result.state;
    for (const record of result.records) {
      texts.push(...projectWorld({ kind: 'transition', source: { activityId: 0, record } }).notices.map((n) => n.text));
    }
  }
  return texts;
}

describe('encounter spillover', () => {
  it('remarks on a crowd where the engine actually fights one', () => {
    // A high level is required: the count is derived from level, so a new character never sees a
    // crowd and a test at level one would pass while proving nothing.
    const crowded = noticesFor(400, 2).filter((text) => text.startsWith('Group assignment:'));
    expect(crowded.length).toBeGreaterThan(0);
    expect(crowded.every((text) => /Group assignment: [\d,.e+]+ opponents/.test(text))).toBe(true);
  });

  it('says nothing about a crowd when there is not one', () => {
    // Ordinary encounters need no permit, and a new character fights them exclusively.
    expect(noticesFor(1, 1).some((text) => text.startsWith('Group assignment:'))).toBe(false);
  });

  it('claims only the longer schedule, which is modelled, and nothing else', () => {
    const forbidden = /danger|deadl|harder|damage|overwhelm|risk of|wipe/i;
    for (const text of noticesFor(400, 2).filter((t) => t.startsWith('Group assignment:'))) {
      expect(text).not.toMatch(forbidden);
      // The one claim it does make is true: duration is derived from the opponent count.
      expect(text).toContain('taking longer');
    }
  });
});

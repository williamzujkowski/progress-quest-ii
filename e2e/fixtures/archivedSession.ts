import { levelUpTime } from '../../src/engine/math';
import { RandomGenerator } from '../../src/engine/prng';
import { createNewCharacter } from '../../src/engine/sim';

/**
 * A session with history already behind it.
 *
 * Several surfaces render only once something has happened — the activity feed needs entries, the
 * closed-casework archive needs closed quests — so a bare `goto('/')` cannot reach them at all.
 * Seeding is the only way to put them on screen without playing for hours, which matters most for
 * the contrast suite: a pair it cannot reach is a pair it silently reports nothing about.
 *
 * Paused, so nothing moves while a test is measuring it.
 */
export function archivedSessionStorageState(
  origin: string,
  { history = [], log = ['Seeded for measurement.'] }: { history?: string[]; log?: string[] } = {},
) {
  const character = createNewCharacter('Archivist', 'Hob-Hobbit', 'Robot Monk', 908);
  character.Quest.history = history;

  return {
    cookies: [],
    origins: [{
      origin,
      localStorage: [{
        name: 'progquest_active_session_v1',
        value: JSON.stringify({
          schemaVersion: 1,
          session: {
            character,
            rngState: new RandomGenerator('archived-session').getState(),
            progression: { experience: { currentSeconds: 0, maxSeconds: levelUpTime(1) }, completedTasks: 0, elapsedSeconds: 0 },
            isPaused: true,
            log,
          },
        }),
      }],
    }],
  };
}

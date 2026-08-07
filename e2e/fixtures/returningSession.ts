import { levelUpTime } from '../../src/engine/math';
import { RandomGenerator } from '../../src/engine/prng';
import { createNewCharacter } from '../../src/engine/sim';

const rng = new RandomGenerator('default-seed');
const character = createNewCharacter('Krg', 'Sub-Subprocessor', 'Robot Monk', rng);
const activeSession = JSON.stringify({
  schemaVersion: 1,
  session: {
    character,
    rngState: rng.getState(),
    progression: { experience: { currentSeconds: 0, maxSeconds: levelUpTime(1) }, completedTasks: 0, elapsedSeconds: 0 },
    isPaused: false,
    // Deliberately the pre-rename wording: this fixture stands in for a save written before the
    // title changed, and the log is stored text rather than something the app regenerates. Updating
    // it would quietly retire the one case that proves an older save still restores and renders.
    log: ['Welcome to Progress Quest III! Krg the Sub-Subprocessor Robot Monk sets out on an adventure.'],
  },
});

export function returningSessionStorageState(origin: string) {
  return {
    cookies: [],
    origins: [{
      origin,
      localStorage: [{ name: 'progquest_active_session_v1', value: activeSession }],
    }],
  };
}

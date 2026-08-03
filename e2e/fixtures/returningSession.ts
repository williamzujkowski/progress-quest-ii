import { levelUpTime } from '../../src/engine/math';
import { RandomGenerator } from '../../src/engine/prng';
import { createNewCharacter } from '../../src/engine/sim';

const rng = new RandomGenerator('default-seed');
const character = createNewCharacter('Krg', 'Hob-Hobbit', 'Robot Monk', rng);
const activeSession = JSON.stringify({
  schemaVersion: 1,
  session: {
    character,
    rngState: rng.getState(),
    progression: { experience: { currentSeconds: 0, maxSeconds: levelUpTime(1) }, completedTasks: 0, elapsedSeconds: 0 },
    isPaused: false,
    log: ['Welcome to Progress Quest II! Krg the Hob-Hobbit Robot Monk sets out on an adventure.'],
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

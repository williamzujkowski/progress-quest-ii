import { describe, expect, it } from 'vitest';
import oneKillFixtureJson from '../fixtures/legacy/one-kill.json';
import xpLevelUpFixtureJson from '../fixtures/legacy/xp-level-up.json';
import questCompletionFixtureJson from '../fixtures/legacy/quest-completion.json';
import {
  observeLegacyEncounterTransition,
  observeLegacyQuestCompletion,
  observeModernEncounterTransition,
  type LegacyTransitionFixture,
} from './transitionParity';

describe('legacy quest-completion contract', () => {
  it('captures reset, history, target, reward, event, and RNG observables', () => {
    const fixture = questCompletionFixtureJson as unknown as LegacyTransitionFixture;
    expect(observeLegacyQuestCompletion(fixture)).toEqual({
      caption: 'Exterminate the Swamp Elves',
      positionSeconds: 0,
      maxSeconds: 138,
      history: ['Test quest', 'Exterminate the Swamp Elves'],
      monster: 'Swamp Elf|1|lilypad',
      monsterIndex: 84,
      rewardSpells: [['Rabbit Punch', 'I', 1]],
      events: [
        'Quest completed: Test quest',
        'Commencing quest: Exterminate the Swamp Elves',
        'Saving game: Oracle',
        'Gained a rat tail',
        'Executing an undernourished Nymph...',
      ],
      rng: [0.02940695872530341, 0.6457716124132276, 0.03624980035237968, 1812947],
    });
  });
});

describe('modern encounter-output fidelity', () => {
  it.each([
    ['ordinary kill', oneKillFixtureJson],
    ['XP level boundary', xpLevelUpFixtureJson],
  ])('matches the legacy %s transition on the shared observable surface', (_name, fixtureJson) => {
    const fixture = fixtureJson as unknown as LegacyTransitionFixture;

    expect(observeModernEncounterTransition(fixture)).toEqual(observeLegacyEncounterTransition(fixture));
  });
});

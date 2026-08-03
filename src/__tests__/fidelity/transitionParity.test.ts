import { describe, expect, it } from 'vitest';
import oneKillFixtureJson from '../fixtures/legacy/one-kill.json';
import xpLevelUpFixtureJson from '../fixtures/legacy/xp-level-up.json';
import {
  observeLegacyEncounterTransition,
  observeModernEncounterTransition,
  type LegacyTransitionFixture,
} from './transitionParity';

describe('modern encounter-output fidelity', () => {
  it.each([
    ['ordinary kill', oneKillFixtureJson],
    ['XP level boundary', xpLevelUpFixtureJson],
  ])('matches the legacy %s transition on the shared observable surface', (_name, fixtureJson) => {
    const fixture = fixtureJson as unknown as LegacyTransitionFixture;

    expect(observeModernEncounterTransition(fixture)).toEqual(observeLegacyEncounterTransition(fixture));
  });
});

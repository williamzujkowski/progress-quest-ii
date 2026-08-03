import { describe, expect, it } from 'vitest';
import oneKillFixtureJson from '../fixtures/legacy/one-kill.json';
import {
  observeLegacyEncounterTransition,
  observeModernEncounterTransition,
  type LegacyTransitionFixture,
} from './transitionParity';

describe('modern encounter-output fidelity', () => {
  it('matches the legacy one-kill encounter output on the shared observable surface', () => {
    const fixture = oneKillFixtureJson as unknown as LegacyTransitionFixture;

    expect(observeModernEncounterTransition(fixture)).toEqual(observeLegacyEncounterTransition(fixture));
  });
});

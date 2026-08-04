import { describe, expect, it } from 'vitest';
import oneKillFixtureJson from '../fixtures/legacy/one-kill.json';
import actTransitionFixtureJson from '../fixtures/legacy/act-transition.json';
import npcPassingFixtureJson from '../fixtures/legacy/monster-tasks/npc-passing.json';
import xpLevelUpFixtureJson from '../fixtures/legacy/xp-level-up.json';
import questCompletionFixtureJson from '../fixtures/legacy/quest-completion.json';
import marketSaleOrdinaryFixtureJson from '../fixtures/legacy/market-sale-ordinary.json';
import marketSaleOfFixtureJson from '../fixtures/legacy/market-sale-of.json';
import marketExitPriceFixtureJson from '../fixtures/legacy/market-exit-price.json';
import marketExitPricePlusOneFixtureJson from '../fixtures/legacy/market-exit-price-plus-one.json';
import purchaseExitPriceFixtureJson from '../fixtures/legacy/purchase-exit-price.json';
import purchaseExitPricePlusOneFixtureJson from '../fixtures/legacy/purchase-exit-price-plus-one.json';
import { observeLegacyEncounterTransition, observeModernEncounterTransition, type LegacyTransitionFixture } from './transitionParity';

const npcTransitionFixture = structuredClone(oneKillFixtureJson) as unknown as LegacyTransitionFixture;
npcTransitionFixture.input.sheet.seed = [...npcPassingFixtureJson.input.seed] as [number, number, number, number];
npcTransitionFixture.expected.task = {
  ...npcTransitionFixture.expected.task,
  tag: npcPassingFixtureJson.expected.taskTag,
  caption: npcPassingFixtureJson.expected.caption,
  maxMs: npcPassingFixtureJson.expected.durationMs,
};
npcTransitionFixture.expected.rng = [...npcPassingFixtureJson.expected.rng] as [number, number, number, number];
npcTransitionFixture.expected.log = [
  ...npcTransitionFixture.expected.log.slice(0, -1),
  npcPassingFixtureJson.expected.caption,
];

describe('modern encounter-output fidelity', () => {
  it.each([
    ['ordinary kill', oneKillFixtureJson],
    ['passing named NPC', npcTransitionFixture],
    ['XP level boundary', xpLevelUpFixtureJson],
    ['quest completion', questCompletionFixtureJson],
    ['Act completion', actTransitionFixtureJson],
    ['ordinary market sale', marketSaleOrdinaryFixtureJson],
    ['of-item market sale', marketSaleOfFixtureJson],
    ['market exit at exact equipment price', marketExitPriceFixtureJson],
    ['market exit above equipment price', marketExitPricePlusOneFixtureJson],
    ['purchase exit at exact equipment price', purchaseExitPriceFixtureJson],
    ['purchase exit above equipment price', purchaseExitPricePlusOneFixtureJson],
  ])('matches the legacy %s transition on the shared observable surface', (_name, fixtureJson) => {
    const fixture = fixtureJson as unknown as LegacyTransitionFixture;

    expect(observeModernEncounterTransition(fixture)).toEqual(observeLegacyEncounterTransition(fixture));
  });
});

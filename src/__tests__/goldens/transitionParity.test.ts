import { describe, expect, it } from 'vitest';
import oneKillFixtureJson from '../fixtures/goldens/one-kill.json';
import actTransitionFixtureJson from '../fixtures/goldens/act-transition.json';
import npcPassingFixtureJson from '../fixtures/goldens/monster-tasks/npc-passing.json';
import npcTitledFixtureJson from '../fixtures/goldens/monster-tasks/npc-titled.json';
import xpLevelUpFixtureJson from '../fixtures/goldens/xp-level-up.json';
import questCompletionFixtureJson from '../fixtures/goldens/quest-completion.json';
import marketSaleOrdinaryFixtureJson from '../fixtures/goldens/market-sale-ordinary.json';
import marketSaleOfFixtureJson from '../fixtures/goldens/market-sale-of.json';
import marketExitPriceFixtureJson from '../fixtures/goldens/market-exit-price.json';
import marketExitPricePlusOneFixtureJson from '../fixtures/goldens/market-exit-price-plus-one.json';
import purchaseExitPriceFixtureJson from '../fixtures/goldens/purchase-exit-price.json';
import purchaseExitPricePlusOneFixtureJson from '../fixtures/goldens/purchase-exit-price-plus-one.json';
import randomStarDuplicateFixtureJson from '../fixtures/goldens/random-star-duplicate.json';
import randomStarSpecialFixtureJson from '../fixtures/goldens/random-star-special.json';
import randomStarInterplotFixtureJson from '../fixtures/goldens/random-star-interplot.json';
import { observeRecordedEncounterTransition, observeModernEncounterTransition, type RecordedTransitionFixture } from './transitionParity';

interface MonsterTaskFixture {
  input: { seed: number[] };
  expected: { taskTag: string; caption: string; durationMs: number; rng: number[] };
}

/**
 * The monster-task goldens record only the next-task draw, so they are replayed by grafting that
 * draw onto the ordinary kill transition: same completed task, same starting sheet, different RNG
 * state going in. What comes out is the recorded task tag, caption, duration, and RNG tuple, which
 * is precisely the surface those goldens were captured to pin.
 */
function transitionEndingIn(monsterTask: MonsterTaskFixture): RecordedTransitionFixture {
  const fixture = structuredClone(oneKillFixtureJson) as unknown as RecordedTransitionFixture;
  fixture.input.sheet.seed = [...monsterTask.input.seed] as [number, number, number, number];
  fixture.expected.task = {
    ...fixture.expected.task,
    tag: monsterTask.expected.taskTag,
    caption: monsterTask.expected.caption,
    maxMs: monsterTask.expected.durationMs,
  };
  fixture.expected.rng = [...monsterTask.expected.rng] as [number, number, number, number];
  fixture.expected.log = [...fixture.expected.log.slice(0, -1), monsterTask.expected.caption];
  return fixture;
}

describe('modern encounter output against the recorded baseline', () => {
  it.each([
    ['ordinary kill', oneKillFixtureJson],
    ['passing named NPC', transitionEndingIn(npcPassingFixtureJson)],
    ['titled named NPC', transitionEndingIn(npcTitledFixtureJson)],
    ['XP level boundary', xpLevelUpFixtureJson],
    ['quest completion', questCompletionFixtureJson],
    ['Act completion', actTransitionFixtureJson],
    ['ordinary market sale', marketSaleOrdinaryFixtureJson],
    ['of-item market sale', marketSaleOfFixtureJson],
    ['market exit at exact equipment price', marketExitPriceFixtureJson],
    ['market exit above equipment price', marketExitPricePlusOneFixtureJson],
    ['purchase exit at exact equipment price', purchaseExitPriceFixtureJson],
    ['purchase exit above equipment price', purchaseExitPricePlusOneFixtureJson],
    ['random-star duplicate item', randomStarDuplicateFixtureJson],
    ['random-star special item', randomStarSpecialFixtureJson],
    // The overlap where this engine and the recorded baseline order their draws differently: a
    // kill that drops random-star loot on the same tick the plot threshold opens an interplot
    // cinematic. They disagree about when the loot is resolved and still agree about the result.
    ['random-star loot during an interplot cinematic', randomStarInterplotFixtureJson],
  ])('reproduces the recorded %s transition on the shared observable surface', (_name, fixtureJson) => {
    const fixture = fixtureJson as unknown as RecordedTransitionFixture;

    expect(observeModernEncounterTransition(fixture)).toEqual(observeRecordedEncounterTransition(fixture));
  });
});

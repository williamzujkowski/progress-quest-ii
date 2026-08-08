import { describe, expect, it } from 'vitest';
import { MAX_PERSISTED_GOLD, MAX_PERSISTED_VALUE } from '../../data/limits';
import { earnGold, goldEarnedBetween, spendGold } from '../../engine/gold';
import { characterSheetSchema } from '../../state/schemas';

const purse = (gold: number, decades = 0) => ({ gold, decades });

describe('gold that keeps growing', () => {
  it('adds ordinarily while it is nowhere near the cap', () => {
    expect(earnGold(purse(100), 50)).toEqual(purse(150));
  });

  it('sheds a decade instead of freezing at the cap', () => {
    // The behaviour this replaces: Math.min(MAX_PERSISTED_GOLD, gold + earned), which stopped the
    // figure at a trillion while the game carried on selling loot.
    const result = earnGold(purse(MAX_PERSISTED_GOLD - 1), 10);
    expect(result.decades).toBe(1);
    expect(result.gold).toBeLessThan(MAX_PERSISTED_GOLD);
    expect(result.gold).toBeGreaterThan(0);
  });

  it('keeps the stored figure exact and safe to add to, however far it escalates', () => {
    // The point of shedding rather than growing: the engine never adds to a number it cannot
    // represent exactly.
    let held = purse(0);
    for (let step = 0; step < 5_000; step += 1) {
      held = earnGold(held, MAX_PERSISTED_GOLD / 2);
      expect(Number.isSafeInteger(held.gold), `step ${step}`).toBe(true);
      expect(held.gold).toBeLessThan(MAX_PERSISTED_GOLD);
    }
    expect(held.decades).toBeGreaterThan(100);
  });

  it('reports what was earned, not the change in the stored figure', () => {
    // The defect this prevents. Shedding a decade makes the stored balance fall even though the
    // player gained, so subtracting balances reports a loss at exactly the wrong moment.
    const before = purse(MAX_PERSISTED_GOLD - 1);
    const after = earnGold(before, 10);

    expect(after.gold - before.gold).toBeLessThan(0);
    expect(goldEarnedBetween(before, after, 10)).toBe(10);
  });

  it('reports the plain difference when no decade was shed', () => {
    const before = purse(100);
    const after = earnGold(before, 25);
    expect(goldEarnedBetween(before, after, 25)).toBe(25);
  });

  it('refuses earnings that would poison the purse', () => {
    // These arrive from imported saves before any engine arithmetic touches them.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -5, 0]) {
      expect(earnGold(purse(10), bad), `${bad}`).toEqual(purse(10));
    }
  });

  it('never lets spending erase a decade the player has reached', () => {
    // Deliberate asymmetry: a purchase is priced in ordinary coins, and no mechanic here should be
    // able to take back an order of magnitude. Shopping must not be a way to lose progress.
    const rich = purse(500, 3);
    expect(spendGold(rich, 200)).toEqual(purse(300, 3));
    // More than the stored figure holds: refused rather than borrowing from the decades.
    expect(spendGold(rich, 900)).toEqual(rich);
  });

  it('spends normally below the first decade', () => {
    expect(spendGold(purse(500), 200)).toEqual(purse(300));
    expect(spendGold(purse(100), 500)).toEqual(purse(0));
  });
  it('stops shedding at the schema maximum instead of growing past what a save can hold', () => {
    // The decade count was the one persisted quantity with no clamp. Every other figure the
    // transition writes is bounded, and a character carrying an out-of-range one fails
    // characterSheetSchema — which the checkpoint writer, the roster writer and the exporter all
    // refuse at once, with no repair offered.
    const atCeiling = purse(MAX_PERSISTED_GOLD - 1, MAX_PERSISTED_VALUE);
    const after = earnGold(atCeiling, MAX_PERSISTED_GOLD);

    expect(after.decades).toBe(MAX_PERSISTED_VALUE);
    // Both halves matter: saturating the count alone would leave the figure above the cap, which
    // fails the same schema by the other field.
    expect(after.gold).toBeLessThan(MAX_PERSISTED_GOLD);
    expect(characterSheetSchema.shape.GoldDecades.safeParse(after.decades).success).toBe(true);
    expect(characterSheetSchema.shape.Gold.safeParse(after.gold).success).toBe(true);
  });

  it('reports earning nothing once the purse is genuinely at the ceiling', () => {
    // Honest rather than flattering. goldEarnedBetween returns the requested amount whenever a
    // decade was shed, so a saturated purse must not keep claiming the player got richer.
    const atCeiling = purse(MAX_PERSISTED_GOLD - 1, MAX_PERSISTED_VALUE);
    const after = earnGold(atCeiling, MAX_PERSISTED_GOLD);

    expect(goldEarnedBetween(atCeiling, after, MAX_PERSISTED_GOLD)).toBe(0);
  });
});

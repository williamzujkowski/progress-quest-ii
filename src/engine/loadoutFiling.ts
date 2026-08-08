import { EQUIP_SLOTS } from '../data/traits';
import { analyzeItemMechanics } from './itemMechanics';
import { encounterSpeedMultiplier, loadoutQuality } from './loadout';
import type { CharacterSheet, EquipSlot } from './types';

/**
 * What the institution has noticed about the eleven rows.
 *
 * ADR 0008 gave equipment a real mechanical effect — a kill takes `1000 / (1000 + quality)` of the
 * time it otherwise would — and the effect has never once been perceptible. The player cannot see
 * the counterfactual and nothing on any surface names it, so a mechanic that was designed, argued,
 * implemented and tested has been invisible since the day it shipped.
 *
 * The value of an effect in a game nobody plays is not its magnitude, it is whether it can be
 * attributed. An effect traceable to a named item in a row already on screen is worth more at zero
 * magnitude than an untraceable one at half. So this names it.
 *
 * Derived and presentational throughout. Every figure printed is one the engine multiplied by,
 * which is the only version of this worth shipping — the world console is where the truth contract
 * is strictest, and a filing that flattered the loadout would be worse than no filing.
 */

export interface LoadoutContribution {
  readonly slot: EquipSlot;
  readonly name: string;
  readonly quality: number;
}

export interface LoadoutFiling {
  /** The best thing being worn, or nothing when the whole loadout contributes nothing. */
  readonly itemOfRecord: LoadoutContribution | null;
  /** Whole percent of encounter time the engine actually removed. Zero is common and is reported. */
  readonly reductionPercent: number;
  /** Every slot pulling its weight, best first. */
  readonly contributors: readonly LoadoutContribution[];
  /**
   * A modifier worn in three or more places at once.
   *
   * Bases cannot collide any more — each slot has its own vocabulary — but modifiers are still drawn
   * from one shared list, so a hero in three `Bonded` things is ordinary rather than exotic. The
   * institution treats that as a coincidence it has noticed, never as an achievement: the moment a
   * set reads as something to pursue, the joke becomes a spreadsheet the player is forbidden to fill
   * in, which is worse than no joke.
   */
  readonly repeatedModifier: { readonly name: string; readonly slots: number } | null;
}

/** Three, because two of anything is chance and four is rare enough to never fire. */
const REPEAT_THRESHOLD = 3;

export function fileLoadout(character: CharacterSheet): LoadoutFiling {
  const analysed = EQUIP_SLOTS.flatMap((slot) => {
    const name = character.Equip[slot];
    if (!name) return [];
    const quality = analyzeItemMechanics({ kind: 'equipment', name, slot }).quality;
    return quality ? [{ slot, name, quality }] : [];
  });

  // Ranked by the base noun's own rating, not by the total.
  //
  // `generateEquipUpgrade` adds modifiers and an assessor's mark until an item's total equals the
  // character's level exactly, so on a live sheet almost every slot totals the same number — eleven
  // slots, two distinct totals, checked in a running game. Ranking by total therefore names whichever
  // slot happens to come first in `EQUIP_SLOTS`, which is an ordering fact rather than an observation
  // about the loadout.
  //
  // The base ratings do differ, from 3 to 10 on that same sheet, and they are what the names are
  // made of. So the grandest thing being worn is the one with the grandest noun, which is both the
  // true answer and the funnier one — `Skeleton Key` deserves the citation over `Hot Desk` even
  // when the arithmetic calls them equal.
  const contributors = analysed
    .filter(({ quality }) => quality.total > 0)
    .map(({ slot, name, quality }) => ({ slot, name, quality: quality.total, standing: quality.base?.value ?? 0 }))
    .sort((left, right) => right.standing - left.standing || right.quality - left.quality)
    .map(({ slot, name, quality }) => ({ slot, name, quality }));

  // Taken from the same function the transition multiplies by, rather than recomputed from the
  // contributors above. A sum of the positive slots would disagree with the engine the moment a
  // negative item is worn, and a filing that disagrees with the arithmetic is the failure this is
  // meant to fix rather than an instance of it.
  const total = loadoutQuality(character);
  const reductionPercent = Math.round((1 - encounterSpeedMultiplier(total)) * 100);

  const modifierCounts = new Map<string, number>();
  for (const { quality } of analysed) {
    for (const { name } of quality.modifiers) modifierCounts.set(name, (modifierCounts.get(name) ?? 0) + 1);
  }
  const repeated = [...modifierCounts.entries()]
    .filter(([, count]) => count >= REPEAT_THRESHOLD)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];

  return {
    itemOfRecord: contributors[0] ?? null,
    reductionPercent,
    contributors,
    repeatedModifier: repeated ? { name: repeated[0], slots: repeated[1] } : null,
  };
}

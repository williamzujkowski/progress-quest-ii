import { analyzeItemMechanics } from './itemMechanics';
import type { CharacterSheet } from './types';

/**
 * The terms the hero gets at market, decided by how much ground they are standing on.
 *
 * `Sollerets` is filed under *footprint: where the organisation is standing, and how heavily*, and
 * its twenty nouns are a property ladder — `Desk Space`, `Site Licence`, `Leasehold`, `Freehold`,
 * `Land Bank`, `Estate`, `Campus`, `Company Town`, `Concession`, `Dominion`, `Antipode`. Someone
 * renting a desk and someone holding a continental shelf do not get quoted the same price, and
 * until now they did.
 *
 * The joke is that it is the boots. Margins are decided by the part of the hero furthest from the
 * negotiation, which is the correct amount of explanation for how procurement works.
 *
 * Keyed to the slot for the reason `storage.ts` gives at length: a keyword list matching
 * `Zone|Estate|Concession` is the substring trap this repo has been caught by four times. The slot
 * is unambiguous and the whole vocabulary is one idea.
 */

/**
 * The divisor turning standing into margin.
 *
 * Ratings run 1 to 30, so the multiplier runs 1.02 to 1.6. Deliberately smaller than it could be:
 * the `' of '` premium already swings a named item's price by roughly four times on average and by
 * an order of magnitude at level ten, and an equipment effect large enough to compete with that
 * would drown the thing it is meant to be noticed alongside.
 */
const STANDING_PER_MARGIN = 50;

export function marketFavour(equip: CharacterSheet['Equip']): number {
  const name = equip.Sollerets;
  if (!name) return 1;

  // Two ways to earn nothing, easy to conflate: a placeholder yields no breakdown at all, while an
  // uncatalogued name yields a real breakdown with no base in it. Both reach here from an imported
  // save, and destructuring through the first one throws.
  const { quality } = analyzeItemMechanics({ kind: 'equipment', name, slot: 'Sollerets' });
  const base = quality?.base;
  if (!base) return 1;

  // The base noun's own rating, not the item's total — `generateEquipUpgrade` tops every item up to
  // the character's level, so a total-derived margin would report what act the hero is in rather
  // than what they are standing on.
  return 1 + base.value / STANDING_PER_MARGIN;
}

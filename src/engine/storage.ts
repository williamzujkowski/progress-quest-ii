import { analyzeItemMechanics } from './itemMechanics';
import type { CharacterSheet } from './types';

/**
 * How much more the hero can carry because of what is worn in the padding slot.
 *
 * ADR 0008 gave equipment one effect — a kill takes `1000 / (1000 + quality)` of the time it
 * otherwise would — and for a long while that was the only thing any item did. This is the second,
 * and it exists because the vocabulary was already promising it.
 *
 * `Gambeson` is filed under *contingency: the padding nobody sees until it is needed*, and its
 * twenty nouns are a capacity ladder read end to end — `Spare Pen`, `Float`, `Petty Cash`, `Buffer
 * Stock`, `War Chest`, `Strategic Reserve`, `Doomsday Vault`. A hero in a `Doomsday Vault` who
 * could carry no more than a hero in a `Spare Pen` was the game quietly failing to mean what it
 * said. So the slot's standing is carrying capacity, and no new words were needed to say so.
 *
 * Keyed to the slot rather than to a list of storage-sounding words. Matching `Vault|Reserve|Stock`
 * against a name is the substring trap that has caught this repo three separate times — `Reserve`
 * sits inside `Strategic Reserve`, and anything matching `Stock` would claim `Buffer Stock` along
 * with whatever else happened to contain it. The slot is unambiguous and every noun in it is on
 * theme, so there is nothing to match and nothing to get wrong.
 */

/**
 * The divisor turning a base rating into cubits.
 *
 * The ladder's ratings run 1 to 30, so the allowance runs +1 to +10 against a baseline of `STR + 10`,
 * which is about 20 on a new sheet. Half again at the very top, nothing worth noticing at the
 * bottom — enough that the bar visibly stretches when something grand is equipped, not so much that
 * the hero stops going to market, which is a beat in the loop rather than an inconvenience.
 */
const CUBITS_PER_STANDING = 3;

export function storageAllowance(equip: CharacterSheet['Equip']): number {
  const name = equip.Gambeson;
  if (!name) return 0;

  // The base noun's own rating, not the item's total. The total is topped up to the character's
  // level by `generateEquipUpgrade`, so it says what act the hero is in rather than what they are
  // wearing; every slot would grant the same allowance and the ladder would mean nothing.
  // Two separate ways to grant nothing, and they are easy to conflate. A placeholder returns no
  // breakdown at all — `quality` is null — while an uncatalogued name returns a real breakdown with
  // no base in it. Both are reachable from an imported save, and destructuring straight through the
  // first one throws.
  const { quality } = analyzeItemMechanics({ kind: 'equipment', name, slot: 'Gambeson' });
  const base = quality?.base;
  if (!base) return 0;

  return Math.ceil(base.value / CUBITS_PER_STANDING);
}

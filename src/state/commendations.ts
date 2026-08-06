import { z } from 'zod';
import { MAX_PERSISTED_GOLD, MAX_PERSISTED_VALUE, MAX_PERSISTED_DESCRIPTION_LENGTH, MAX_STORED_PAYLOAD_LENGTH } from '../data/limits';
import { EQUIP_SLOTS } from '../data/traits';
import type { GameTransitionEvent } from '../engine/transition';
import type { EquipmentClassification } from './worldContext';

/**
 * Personal bests, kept as the institution's own filing cabinet.
 *
 * Deliberately outside the active checkpoint. That envelope is strict and versioned and governs
 * whether a session can restore at all; a decorative ledger has no business gating that. This
 * gets its own key and its own schema, and a corrupt or missing ledger degrades to "no records
 * yet" rather than costing anyone their game.
 *
 * Every figure is a maximum or a count over events the engine already emits. Nothing here feeds
 * back into the simulation, so it cannot affect the RNG continuation or save compatibility.
 */

export const COMMENDATIONS_STORAGE_KEY = 'progquest_commendations_v1';

/**
 * The best thing ever worn in each slot, kept after it is sold — which is where equipment
 * currently vanishes forever. `label` and `quality` are the classification worldContext already
 * computes; they are prestige, not power, and CONTEXT.md is explicit that equipment has no
 * combat contribution at all.
 */
const exhibitEntrySchema = z.object({
  name: z.string().min(1).max(MAX_PERSISTED_DESCRIPTION_LENGTH),
  label: z.enum(['questionable', 'serviceable', 'notable', 'legendary']),
  quality: z.number().finite(),
}).strict();

export const commendationsSchema = z.object({
  highestLevel: z.number().int().min(0).max(MAX_PERSISTED_VALUE),
  largestSale: z.number().int().min(0).max(MAX_PERSISTED_GOLD),
  questsCompleted: z.number().int().min(0).max(MAX_PERSISTED_VALUE),
  actsCompleted: z.number().int().min(0).max(MAX_PERSISTED_VALUE),
  // Keys are constrained to real slots so a hostile ledger cannot grow without bound, and
  // partialRecord rather than record because zod treats an enum-keyed record as exhaustive -
  // a plain record here would reject every ledger that has not yet filled all eleven slots,
  // which is all of them. Defaulted so a ledger written before the exhibit existed still loads.
  exhibit: z.partialRecord(z.enum(EQUIP_SLOTS as [string, ...string[]]), exhibitEntrySchema).default({}),
}).strict();

export type Commendations = z.infer<typeof commendationsSchema>;

export type ExhibitEntry = z.infer<typeof exhibitEntrySchema>;

export const EMPTY_COMMENDATIONS: Commendations = {
  highestLevel: 0,
  largestSale: 0,
  questsCompleted: 0,
  actsCompleted: 0,
  exhibit: {},
};

/**
 * Keeps the finer of the two. Ties keep the incumbent, so the record reflects the first time a
 * quality was reached rather than the most recent — a record of when, not of what is worn now.
 */
export function mergeExhibit(
  records: Commendations,
  slot: string,
  name: string,
  classification: Pick<EquipmentClassification, 'label' | 'quality'>,
): Commendations {
  if (!EQUIP_SLOTS.includes(slot as never) || name.length === 0) return records;
  const held = records.exhibit[slot];
  if (held && held.quality >= classification.quality) return records;
  return {
    ...records,
    exhibit: { ...records.exhibit, [slot]: { name, label: classification.label, quality: classification.quality } },
  };
}

/** True when nothing has happened worth filing, so the panel can stay away rather than show zeroes. */
export function isEmpty(records: Commendations): boolean {
  return records.highestLevel === 0 && records.largestSale === 0
    && records.questsCompleted === 0 && records.actsCompleted === 0
    && Object.keys(records.exhibit).length === 0;
}

/**
 * Folds a batch of events into the records. Pure, and returns the same object when nothing
 * changed so a caller can skip a write and a render on the overwhelming majority of ticks.
 */
export function mergeEvents(records: Commendations, events: readonly GameTransitionEvent[]): Commendations {
  let next = records;
  const bump = (patch: Partial<Commendations>) => { next = { ...next, ...patch }; };

  for (const event of events) {
    switch (event.type) {
      case 'level_gained':
        // A max rather than a counter: a new character starting over must not erase the record.
        if (event.level > next.highestLevel) bump({ highestLevel: Math.min(MAX_PERSISTED_VALUE, event.level) });
        break;
      case 'inventory_sold':
        if (event.gold > next.largestSale) bump({ largestSale: Math.min(MAX_PERSISTED_GOLD, event.gold) });
        break;
      case 'quest_completed':
        bump({ questsCompleted: Math.min(MAX_PERSISTED_VALUE, next.questsCompleted + 1) });
        break;
      case 'act_completed':
        bump({ actsCompleted: Math.min(MAX_PERSISTED_VALUE, next.actsCompleted + 1) });
        break;
      default:
        break;
    }
  }
  return next;
}

/** Reads fail closed: anything unreadable is treated as no records, never as an error. */
export function readCommendations(storage: Pick<Storage, 'getItem'> | undefined): Commendations {
  if (!storage) return EMPTY_COMMENDATIONS;
  let raw: string | null;
  try {
    raw = storage.getItem(COMMENDATIONS_STORAGE_KEY);
  } catch {
    return EMPTY_COMMENDATIONS;
  }
  if (raw === null) return EMPTY_COMMENDATIONS;
  // Refused unparsed: JSON.parse on a hostile blob is the expensive step, and it runs before any
  // validation could reject the contents. This read happens once at module load rather than on the
  // tick path, so the exposure here is small — the cap is shared because storage readers that
  // disagree about their defences are how the next one gets written without any.
  if (raw.length > MAX_STORED_PAYLOAD_LENGTH) return EMPTY_COMMENDATIONS;
  try {
    const parsed = commendationsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_COMMENDATIONS;
  } catch {
    return EMPTY_COMMENDATIONS;
  }
}

/** Writes are best-effort. A ledger that cannot be saved must never interrupt play. */
export function writeCommendations(storage: Pick<Storage, 'setItem'> | undefined, records: Commendations): void {
  if (!storage) return;
  const parsed = commendationsSchema.safeParse(records);
  if (!parsed.success) return;
  try {
    storage.setItem(COMMENDATIONS_STORAGE_KEY, JSON.stringify(parsed.data));
  } catch {
    // Storage full or denied. The game continues; the filing cabinet simply does not update.
  }
}

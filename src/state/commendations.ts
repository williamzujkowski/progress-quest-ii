import { z } from 'zod';
import { MAX_PERSISTED_GOLD, MAX_PERSISTED_VALUE } from '../data/limits';
import type { GameTransitionEvent } from '../engine/transition';

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

export const commendationsSchema = z.object({
  highestLevel: z.number().int().min(0).max(MAX_PERSISTED_VALUE),
  largestSale: z.number().int().min(0).max(MAX_PERSISTED_GOLD),
  questsCompleted: z.number().int().min(0).max(MAX_PERSISTED_VALUE),
  actsCompleted: z.number().int().min(0).max(MAX_PERSISTED_VALUE),
}).strict();

export type Commendations = z.infer<typeof commendationsSchema>;

export const EMPTY_COMMENDATIONS: Commendations = {
  highestLevel: 0,
  largestSale: 0,
  questsCompleted: 0,
  actsCompleted: 0,
};

/** True when nothing has happened worth filing, so the panel can stay away rather than show zeroes. */
export function isEmpty(records: Commendations): boolean {
  return records.highestLevel === 0 && records.largestSale === 0
    && records.questsCompleted === 0 && records.actsCompleted === 0;
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

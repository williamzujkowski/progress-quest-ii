import { z } from 'zod';
import { readLedger, writeLedger } from './ledgerStorage';
import { MAX_PERSISTED_DESCRIPTION_LENGTH } from '../data/limits';
import type { GameTransitionEvent } from '../engine/transition';

/**
 * Everything the hero has ever held, once each.
 *
 * The exhibit case keeps the best item per slot, which is a record of quality. This is a record of
 * variety: the eleventh identical rat tail adds nothing, and the first bent fork adds a line. It is
 * the collection-log shape — what have you seen, not what are you carrying — and the two questions
 * have never had the same answer here, because inventory is sold off and equipment is replaced.
 *
 * Identity is what CONTEXT.md already defines it as: the item's kind and canonical name, plus its
 * slot where it has one. Quantity and time are explicitly not identity, so holding four of
 * something is one specimen and holding it again next week is still one.
 *
 * Its own key, its own schema, outside the checkpoint — the same arrangement the commendation and
 * caseload ledgers use, and for the same reason: a decorative record has no business deciding
 * whether a session can restore.
 */

export const SPECIMEN_STORAGE_KEY = 'progquest_specimens_v1';

/**
 * Bounded because the key space is open. Equipment names are generated from modifier tables, so a
 * long enough run produces more distinct names than anyone will read, and an unbounded set in
 * local storage is a slow leak rather than a fast one.
 */
export const MAX_TRACKED_SPECIMENS = 300;

export const specimenLogSchema = z.object({
  // Sorted on write so the stored form is stable, which keeps a round trip byte-identical and
  // makes a diff between two saves mean something.
  specimens: z.array(z.string().min(1).max(MAX_PERSISTED_DESCRIPTION_LENGTH)).max(MAX_TRACKED_SPECIMENS).default([]),
}).strict();

export type SpecimenLog = z.infer<typeof specimenLogSchema>;

export const EMPTY_SPECIMEN_LOG: SpecimenLog = { specimens: [] };

/**
 * The identity string for an acquisition, or null for an event that acquires nothing.
 *
 * Slot is part of the identity where there is one, because the same name in two slots is two
 * findings — and because CONTEXT.md says so.
 */
export function specimenIdentity(event: GameTransitionEvent): string | null {
  if (event.type === 'item_gained') return `item:${event.name}`;
  if (event.type === 'equipment_gained') return `equipment:${event.slot}:${event.name}`;
  return null;
}

/** True when nothing has been filed, so the panel can stay away rather than report a zero. */
export function isEmpty(log: SpecimenLog): boolean {
  return log.specimens.length === 0;
}

/**
 * Folds a batch of events into the log. Pure, and returns the same object when nothing was new —
 * which is the overwhelming majority of ticks, since a specimen is only ever new once.
 *
 * Full is full: once the bound is reached nothing further is recorded. Dropping an older specimen
 * to make room would be worse than refusing a newer one, because the whole claim this makes is
 * "ever seen", and a log that forgets cannot make it.
 */
export function mergeSpecimens(log: SpecimenLog, events: readonly GameTransitionEvent[]): SpecimenLog {
  let added: string[] | null = null;
  const known = new Set(log.specimens);

  for (const event of events) {
    const identity = specimenIdentity(event);
    if (identity === null || identity.length > MAX_PERSISTED_DESCRIPTION_LENGTH) continue;
    if (known.has(identity)) continue;
    if (known.size >= MAX_TRACKED_SPECIMENS) break;
    known.add(identity);
    (added ??= []).push(identity);
  }

  if (added === null) return log;
  return { specimens: [...log.specimens, ...added].sort() };
}

/**
 * Reads fail closed; the shared reader owns that. Duplicates in a hostile file are collapsed on
 * the way in: they would inflate the count without adding variety, which is the one number this
 * ledger reports.
 */
export function readSpecimenLog(storage: Pick<Storage, 'getItem'> | undefined): SpecimenLog {
  return readLedger(storage, SPECIMEN_STORAGE_KEY, specimenLogSchema, EMPTY_SPECIMEN_LOG,
    (value) => ({ specimens: [...new Set(value.specimens)].sort() }));
}

/** Writes are best-effort; the shared writer owns that. */
export function writeSpecimenLog(storage: Pick<Storage, 'setItem'> | undefined, log: SpecimenLog): void {
  writeLedger(storage, SPECIMEN_STORAGE_KEY, specimenLogSchema, log);
}

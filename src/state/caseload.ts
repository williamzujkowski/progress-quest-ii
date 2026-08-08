import { z } from './zod';
import { MAX_PERSISTED_VALUE, MAX_PERSISTED_DESCRIPTION_LENGTH } from '../data/limits';
import type { GameTransitionRecord } from '../engine/transition';
import { readLedger, writeLedger } from './ledgerStorage';

/**
 * What the casework has consisted of, rather than how much of it there has been.
 *
 * The engine assigns every quest one of five kinds and branches on the `exterminate`
 * classification when deciding whether a kill can target the quest monster, which changes the
 * encounter, its duration, and its loot. Counting them still turns a classification the simulation
 * already decides into the one summary a watcher actually forms over hours: not how many quests
 * closed, but what kind of institution this has been.
 *
 * Kept outside the checkpoint for the same reason the commendation ledger is. That envelope
 * governs whether a session can restore at all, and a tally has no business gating it. A corrupt
 * or missing tally degrades to "no casework on file" and costs nobody their game.
 *
 * Every figure is a count over events the engine already emits. Nothing feeds back into the
 * simulation, so it cannot affect the RNG continuation or save compatibility.
 */

export const CASELOAD_STORAGE_KEY = 'progquest_caseload_v1';

/** The engine's own classification, in the order an institution would list them. */
export const QUEST_KINDS = ['exterminate', 'seek', 'deliver', 'fetch', 'placate'] as const;

export type QuestKindName = (typeof QUEST_KINDS)[number];

/** How each kind is named on a form, as opposed to in the engine. */
export const KIND_LABELS: Record<QuestKindName, string> = {
  exterminate: 'Extermination writs closed',
  seek: 'Retrieval orders discharged',
  deliver: 'Deliveries acknowledged',
  fetch: 'Requisitions fulfilled',
  placate: 'Placation accords reached',
};

/**
 * Targets are engine-generated names, so the key space is open. Bounded by count as well as by
 * key length, because an unbounded map in local storage is a slow leak rather than a fast one.
 */
export const MAX_TRACKED_TARGETS = 50;

const countSchema = z.number().int().min(0).max(MAX_PERSISTED_VALUE);

const caseloadSchema = z.object({
  // partialRecord rather than record: zod treats an enum-keyed record as exhaustive, which would
  // reject every tally that has not yet seen all five kinds.
  kinds: z.partialRecord(z.enum(QUEST_KINDS), countSchema).default({}),
  targets: z.record(z.string().min(1).max(MAX_PERSISTED_DESCRIPTION_LENGTH), countSchema).default({}),
}).strict();

export type Caseload = z.infer<typeof caseloadSchema>;

export const EMPTY_CASELOAD: Caseload = { kinds: {}, targets: {} };

/**
 * The name a target is known by, out of the key it is filed under.
 *
 * The engine identifies an extermination target as `name|level|item` — a composite that keeps two
 * monsters of the same name apart. That is the right thing to store and the wrong thing to show:
 * filed against "Gnoll|2|collar" is not a sentence. Splitting happens at the point of display so
 * the stored identity keeps its precision and every ledger already on disk keeps loading.
 */
export function displayTarget(target: string): string {
  const name = target.split('|')[0];
  return name && name.length > 0 ? name : target;
}

/** True when nothing has been filed, so the panel can stay away rather than show five zeroes. */
export function isEmpty(caseload: Caseload): boolean {
  return Object.keys(caseload.kinds).length === 0 && Object.keys(caseload.targets).length === 0;
}

/**
 * The target filed against most often, or null when nothing has been. Ties resolve alphabetically
 * so the answer is stable across reloads rather than dependent on key order.
 */
export function mostLitigated(caseload: Caseload): { target: string; count: number } | null {
  let best: { target: string; count: number } | null = null;
  for (const [target, count] of Object.entries(caseload.targets)) {
    if (!best || count > best.count || (count === best.count && target < best.target)) {
      best = { target, count };
    }
  }
  return best;
}

/**
 * Drops the least-filed targets once the map outgrows its bound. Ties drop alphabetically last,
 * matching mostLitigated's preference so the two never disagree about which of two equals matters.
 */
function boundTargets(targets: Record<string, number>): Record<string, number> {
  const entries = Object.entries(targets);
  if (entries.length <= MAX_TRACKED_TARGETS) return targets;
  entries.sort(([leftTarget, left], [rightTarget, right]) =>
    right - left || (leftTarget < rightTarget ? -1 : 1));
  return Object.fromEntries(entries.slice(0, MAX_TRACKED_TARGETS));
}

/**
 * Folds a batch of transition records into the tally. Pure, and returns the same object when
 * nothing changed so a caller can skip a write and a render.
 *
 * Takes records rather than events because the kind is not on the event. `quest_completed` carries
 * only a description; the classification lives on the snapshot beside it, which is the only place
 * it survives.
 */
export function mergeRecords(caseload: Caseload, records: readonly GameTransitionRecord[]): Caseload {
  let next = caseload;

  for (const { event, post } of records) {
    if (event.type !== 'quest_completed') continue;
    const identity = post.completedQuest;
    if (!identity) continue;

    if (identity.kind && QUEST_KINDS.includes(identity.kind)) {
      const kind = identity.kind;
      next = {
        ...next,
        kinds: { ...next.kinds, [kind]: Math.min(MAX_PERSISTED_VALUE, (next.kinds[kind] ?? 0) + 1) },
      };
    }

    const target = identity.target;
    if (target && target.length > 0 && target.length <= MAX_PERSISTED_DESCRIPTION_LENGTH) {
      // hasOwn rather than a bare read, because an imported save chooses this key. For one
      // inherited from Object.prototype — `constructor`, `toString`, `valueOf` — the read returns
      // a function rather than undefined, so `?? 0` never fires and the tally becomes NaN. Nothing
      // downstream shouts: the schema quietly refuses to persist a NaN while the caller keeps
      // retrying the same write, so the ledger simply stops saving for the rest of the session.
      const filed = Object.hasOwn(next.targets, target) ? next.targets[target] ?? 0 : 0;
      next = {
        ...next,
        targets: boundTargets({
          ...next.targets,
          [target]: Math.min(MAX_PERSISTED_VALUE, filed + 1),
        }),
      };
    }
  }

  return next;
}

/**
 * Reads fail closed; the shared reader owns that. The bound is applied on the way in as well as on
 * the way out, because a hostile file can hold more targets than the merge path would ever produce.
 */
export function readCaseload(storage: Pick<Storage, 'getItem'> | undefined): Caseload {
  return readLedger(storage, CASELOAD_STORAGE_KEY, caseloadSchema, EMPTY_CASELOAD,
    (value) => ({ ...value, targets: boundTargets(value.targets) }));
}

/** Writes are best-effort; the shared writer owns that. */
export function writeCaseload(storage: Pick<Storage, 'setItem'> | undefined, caseload: Caseload): void {
  writeLedger(storage, CASELOAD_STORAGE_KEY, caseloadSchema, caseload);
}

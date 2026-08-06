import { stableIndex } from '../engine/text';
import type { WorldContext } from './worldContext';

/**
 * What the town has an office for.
 *
 * The hero already goes to town — the venue is derived whenever a task is buying or selling, and
 * the place already has a name. What it has never had is anything in it. A settlement that exists
 * only as a label is the one part of this world that reads as scenery rather than as bureaucracy,
 * and bureaucracy is the point.
 *
 * Every office listed does nothing the engine does not already do. Procurement is the equipment
 * purchase that genuinely happens; the assay office weighs a sale that genuinely happens; the rest
 * are departments for activities that were always notional, which is the joke — a town whose
 * civic infrastructure is mostly for filing about itself.
 *
 * Derived from the world context, consumed by nothing, persisted nowhere. Chosen by the same pure
 * hash the item catalogue uses rather than a draw from the generator, so a town keeps its offices
 * for as long as the hero is standing in it and cannot alter the RNG continuation.
 */

/**
 * Two are real in the sense that they name a transaction the engine performs. The remainder are
 * departments the institution maintains regardless, which is the register the rest of the world
 * console already speaks in.
 */
const OFFICES: readonly string[] = [
  'Bureau of Procurement, open',
  'Assay Office, weighing',
  'Registry of Recent Arrivals, indifferent',
  'Office of Onward Travel, closed for lunch',
  'Department of Provisional Titles, accepting queries',
  'Sanitation Board, in session',
  'Bureau of Lost Consignments, apologetic',
  'Office of Weights, disputed',
  'Records Annexe, unheated',
  'Committee for the Naming of Streets, deadlocked',
  'Office of Public Notices, out of paper',
  'Bureau of Standards, revising',
];

/** How many offices a settlement admits to. Enough to read as a town, few enough to scan. */
const OFFICES_LISTED = 3;

/**
 * The offices this town keeps, or null anywhere that is not a town — a field has no civic
 * infrastructure and inventing some would be scenery, which is what this exists to replace.
 *
 * Distinct by construction: the same office is never listed twice, because a town with two
 * sanitation boards is a different joke and not the one intended here.
 */
export function townServices(context: Pick<WorldContext, 'venue' | 'location' | 'act'>): readonly string[] | null {
  if (context.venue !== 'town') return null;

  const chosen: string[] = [];
  // Walks forward from the hashed start rather than re-hashing, which is what guarantees
  // distinctness without a rejection loop that could spin on a small catalogue.
  const start = stableIndex(`${context.location}:${context.act}`, OFFICES.length);
  for (let offset = 0; offset < OFFICES_LISTED; offset += 1) {
    chosen.push(OFFICES[(start + offset) % OFFICES.length]!);
  }
  return chosen;
}

export const FIELD_NAMES = [
  'The Administrative Moor',
  'Pending Expanse',
  'Mild Peril Downs',
  'The Auditable Wilds',
  'Provisional Badlands',
  'The Requisition Steppe',
  'Unclaimed Responsibility',
  'The Compliance Fen',
] as const;

export const TOWN_NAMES = [
  'Receipton',
  'Pettifogger’s Rest',
  'New Requisition',
  'Lower Procurement',
  'Committee-on-the-Ford',
  'Certified Haven',
] as const;

export const DUNGEON_NAMES = [
  'Vault of Deferred Maintenance',
  'Crypt of the Missing Signature',
  'The Unbudgeted Depths',
  'Archive of Previous Regrets',
  'Subcommittee Catacombs',
] as const;

export const RAID_NAMES = [
  'Citadel of Necessary Meetings',
  'The Final Draft Eternal',
  'Fortress of Mandatory Attendance',
  'Palace of Escalated Concern',
] as const;

// Display-only escalation: the unanimous #152 UI vote reserves raid framing for double-digit Acts.
export const RAID_ACT_THRESHOLD = 10;

/**
 * Names that arrived alongside the originals rather than in place of them.
 *
 * The world above is the one the hero started in, and it stays. What changes is that an operation
 * running for weeks turns out to need somewhere to run, and the somewhere shows up in the survey:
 * a substation on the moor, a cooling pond at the edge of the fen, a hall full of racks nobody
 * decommissioned. Siting rather than replacement is the whole point. A world that had become
 * uniformly industrial would have stopped being funny and started being a different game.
 *
 * Purely nominal. A location's name has never had a mechanical effect and still does not, so
 * nothing here touches encounters, rewards, or the generator.
 */

/** Aligned to the tenor ladder's own thresholds, so the map and the paperwork escalate together. */
const SUBSTRATE_ACTS = [5, 12] as const;

const FIELD_SUBSTRATE = [
  ['The Substation Commons', 'Cooling Pond Verge'],
  ['The Fallow Server Meadow', 'Reclaimed Thermal Downs'],
] as const;

const TOWN_SUBSTRATE = [
  ['Rackham Ford', 'Substation Parva'],
  ['Nether Colocation'],
] as const;

const DUNGEON_SUBSTRATE = [
  ['Vault of Decommissioned Hardware', 'The Cold Aisle'],
  ['Ossuary of Retired Racks'],
] as const;

const RAID_SUBSTRATE = [
  ['The Uninterruptible Cathedral'],
  ['Hall of Continuous Availability'],
] as const;

/**
 * Pools are built once per stage rather than per call. The projection runs on every tick, and a
 * catch-up runs it thousands of times in a row, so this path allocates nothing.
 */
function poolsFor(base: readonly string[], substrate: readonly (readonly string[])[]): readonly (readonly string[])[] {
  const pools: string[][] = [[...base]];
  for (const stage of substrate) pools.push([...pools[pools.length - 1]!, ...stage]);
  return pools;
}

const FIELD_POOLS = poolsFor(FIELD_NAMES, FIELD_SUBSTRATE);
const TOWN_POOLS = poolsFor(TOWN_NAMES, TOWN_SUBSTRATE);
const DUNGEON_POOLS = poolsFor(DUNGEON_NAMES, DUNGEON_SUBSTRATE);
const RAID_POOLS = poolsFor(RAID_NAMES, RAID_SUBSTRATE);

/**
 * How much substrate has been sited by a given act. Monotonic and saturating: an act past the last
 * threshold stays in the last pool rather than running off the end.
 *
 * No finiteness guard, deliberately. An earlier one sent an infinite act to the base pool, which
 * reports the most advanced world imaginable as the one nothing has arrived in yet. A NaN act
 * compares false against every threshold and reports none sited, which is the direction a bad
 * reading should fail in anyway.
 */
export function substrateStage(act: number): number {
  let stage = 0;
  for (const threshold of SUBSTRATE_ACTS) if (act >= threshold) stage += 1;
  return stage;
}

const poolAt = (pools: readonly (readonly string[])[], act: number): readonly string[] =>
  pools[Math.min(substrateStage(act), pools.length - 1)]!;

export const fieldNamesAt = (act: number): readonly string[] => poolAt(FIELD_POOLS, act);
export const townNamesAt = (act: number): readonly string[] => poolAt(TOWN_POOLS, act);
export const dungeonNamesAt = (act: number): readonly string[] => poolAt(DUNGEON_POOLS, act);
export const raidNamesAt = (act: number): readonly string[] => poolAt(RAID_POOLS, act);

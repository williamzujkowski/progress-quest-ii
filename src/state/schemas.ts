import { z } from 'zod';
import { MAX_PENDING_ELAPSED_MS, MAX_PENDING_TASKS, MAX_PERSISTED_DESCRIPTION_LENGTH, MAX_PERSISTED_GOLD, MAX_PERSISTED_ITEMS, MAX_PERSISTED_VALUE } from '../data/limits';

export { MAX_PERSISTED_ITEMS } from '../data/limits';
export const MAX_CHARACTER_NAME_LENGTH = 120;

const shortText = z.string().max(200);
const description = z.string().max(MAX_PERSISTED_DESCRIPTION_LENGTH);
const boundedInteger = z.number().int().min(0).max(MAX_PERSISTED_VALUE);
const positiveBoundedInteger = z.number().int().positive().max(MAX_PERSISTED_VALUE);
const boundedNumber = z.number().min(0).max(MAX_PERSISTED_VALUE);
const positiveBoundedNumber = z.number().positive().max(MAX_PERSISTED_VALUE);
const aleaFraction = z.number().min(0).lt(1).refine((value) => Number.isInteger(value * 0x1_0000_0000), {
  message: 'Alea fractions must align to 32-bit state.',
});
const rngStateSchema = z.tuple([
  aleaFraction,
  aleaFraction,
  aleaFraction,
  z.number().int().min(0).max(2_091_638),
]);

export const characterNameSchema = z.string().min(1).max(MAX_CHARACTER_NAME_LENGTH);

export const characterTraitsSchema = z.object({
  Name: characterNameSchema,
  Race: z.string().min(1).max(120),
  Class: z.string().min(1).max(120),
  Level: z.number().int().min(1).max(MAX_PERSISTED_VALUE),
}).strict();

export const statsMapSchema = z.object({
  STR: positiveBoundedInteger,
  CON: positiveBoundedInteger,
  DEX: positiveBoundedInteger,
  INT: positiveBoundedInteger,
  WIS: positiveBoundedInteger,
  CHA: positiveBoundedInteger,
  'HP Max': positiveBoundedNumber,
  'MP Max': positiveBoundedNumber,
}).strict();

export const equipmentMapSchema = z.object({
  Weapon: shortText,
  Shield: shortText,
  Helm: shortText,
  Hauberk: shortText,
  Brassairts: shortText,
  Vambraces: shortText,
  Gauntlets: shortText,
  Gambeson: shortText,
  Cuisses: shortText,
  Greaves: shortText,
  Sollerets: shortText,
}).strict();

export const inventoryItemSchema = z.object({
  name: shortText,
  qty: boundedInteger,
}).strict();

export const spellItemSchema = z.object({
  name: shortText,
  level: z.number().int().min(1).max(MAX_PERSISTED_VALUE),
}).strict();

export const questStateSchema = z.object({
  description,
  currentProgress: boundedNumber,
  maxProgress: positiveBoundedNumber,
  history: z.array(description).max(100).optional(),
  kind: z.enum(['exterminate', 'seek', 'deliver', 'fetch', 'placate']).optional(),
  target: z.string().min(1).max(200).optional(),
  targetIndex: boundedInteger.optional(),
}).strict().refine(({ currentProgress, maxProgress }) => currentProgress <= maxProgress, {
  message: 'Quest progress cannot exceed its maximum.',
  path: ['currentProgress'],
});

export const plotStateSchema = z.object({
  act: z.number().int().min(0).max(MAX_PERSISTED_VALUE),
  currentProgress: boundedNumber,
  maxProgress: positiveBoundedNumber,
}).strict().refine(({ currentProgress, maxProgress }) => currentProgress <= maxProgress, {
  message: 'Plot progress cannot exceed its maximum.',
  path: ['currentProgress'],
});

export const progressTaskSchema = z.object({
  description,
  durationMs: z.number().min(1).max(86_400_000),
  elapsedMs: z.number().min(0).max(86_400_000),
  type: z.enum(['kill', 'buying', 'selling', 'quest', 'plot', 'loading', 'prologue', 'cinematic', 'act_marker', 'heading_to_market', 'heading']),
  loot: z.discriminatedUnion('type', [
    z.object({ type: z.literal('fixed'), item: z.string().min(1).max(200) }).strict(),
    z.object({ type: z.literal('random') }).strict(),
  ]).optional(),
}).strict().refine(({ durationMs, elapsedMs }) => elapsedMs <= durationMs, {
  message: 'Task elapsed time cannot exceed its duration.',
  path: ['elapsedMs'],
});

const sequenceTaskSchema = z.object({
  description,
  durationMs: z.number().int().min(1).max(86_400_000),
  elapsedMs: z.literal(0),
  type: z.enum(['prologue', 'cinematic', 'act_marker']),
}).strict();

const nemesisSequenceCursorSchema = z.object({
  description,
  type: z.literal('nemesis_cursor'),
  nemesis: shortText,
  round: z.number().int().min(MAX_PENDING_TASKS - 4).max(MAX_PERSISTED_VALUE + 2),
  advantageMod3: z.number().int().min(0).max(2),
  rollLimit: z.number().int().min(2).max(MAX_PERSISTED_VALUE + 2),
  replayRngState: rngStateSchema,
}).strict().refine(({ round, rollLimit }) => round <= rollLimit, {
  message: 'A nemesis cursor round cannot exceed its roll limit.',
  path: ['round'],
});

const pendingTasksSchema = z.array(z.union([sequenceTaskSchema, nemesisSequenceCursorSchema])).min(1).max(MAX_PENDING_TASKS).superRefine((tasks, context) => {
  const markerIndexes = tasks.flatMap((task, index) => task.type === 'act_marker' ? [index] : []);
  if (markerIndexes.length !== 1 || markerIndexes[0] !== tasks.length - 1) {
    context.addIssue({ code: 'custom', message: 'Pending tasks require exactly one final Act marker.' });
  }
  if (tasks.filter(({ type }) => type === 'nemesis_cursor').length > 1) context.addIssue({ code: 'custom', message: 'Pending tasks may contain at most one nemesis cursor.' });
});

/** The exact, recursively strict, unversioned modern PQW v0 compatibility profile. */
export const characterSheetSchema = z.object({
  Traits: characterTraitsSchema,
  Stats: statsMapSchema,
  Equip: equipmentMapSchema,
  Inventory: z.array(inventoryItemSchema).max(MAX_PERSISTED_ITEMS),
  Spells: z.array(spellItemSchema).max(MAX_PERSISTED_ITEMS),
  Gold: z.number().min(0).max(MAX_PERSISTED_GOLD),
  Plot: plotStateSchema,
  Quest: questStateSchema,
  Task: progressTaskSchema,
  PendingTasks: pendingTasksSchema.optional(),
}).strict().refine(({ Inventory }) => new Set(Inventory.map(({ name }) => name)).size === Inventory.length, {
  message: 'Inventory item names must be unique.',
  path: ['Inventory'],
}).superRefine(({ PendingTasks, Plot, Task }, context) => {
  if (!PendingTasks) return;
  const sequenceEntries = PendingTasks.slice(0, -1);
  const validPrologue = Plot.act === 0
    && (Task.type === 'loading' || Task.type === 'prologue')
    && sequenceEntries.every(({ type }) => type === 'prologue');
  const validCinematic = Plot.act > 0
    && Task.type === 'cinematic'
    && sequenceEntries.every(({ type }) => type === 'cinematic' || type === 'nemesis_cursor');
  if (!validPrologue && !validCinematic) {
    context.addIssue({ code: 'custom', message: 'Pending tasks must match the active Act phase.', path: ['PendingTasks'] });
  }
  const cursor = PendingTasks.find(({ type }) => type === 'nemesis_cursor');
  if (cursor?.type === 'nemesis_cursor' && cursor.rollLimit !== Plot.act + 2) {
    context.addIssue({ code: 'custom', message: 'A nemesis cursor roll limit must match its Act.', path: ['PendingTasks'] });
  }
});

export type PersistedCharacterSheet = z.infer<typeof characterSheetSchema>;

export const activeCheckpointV1Schema = z.object({
  schemaVersion: z.literal(1),
  session: z.object({
    character: characterSheetSchema,
    rngState: rngStateSchema,
    progression: z.object({
      experience: z.object({
        currentSeconds: z.number().finite().min(0),
        maxSeconds: z.number().finite().positive(),
      }).strict().refine(({ currentSeconds, maxSeconds }) => currentSeconds <= maxSeconds, {
        message: 'Experience progress cannot exceed its maximum.',
        path: ['currentSeconds'],
      }),
      completedTasks: boundedInteger,
      elapsedSeconds: boundedInteger,
    }).strict(),
    pendingElapsedMs: z.number().finite().min(0).max(MAX_PENDING_ELAPSED_MS).default(0),
    // Wall-clock, written when the checkpoint is saved, so a reopened app can credit the time
    // it was closed. Optional: checkpoints written before this existed simply credit nothing,
    // which is the behaviour they already had. It is never read by the engine - only at the
    // load boundary, converted once into elapsed milliseconds.
    savedAtMs: z.number().finite().min(0).optional(),
    isPaused: z.boolean(),
    log: z.array(description).max(50),
  }).strict(),
}).strict().superRefine(({ session }, context) => {
  const cursor = session.character.PendingTasks?.find(({ type }) => type === 'nemesis_cursor');
  if (cursor?.type === 'nemesis_cursor' && cursor.replayRngState.some((value, index) => value !== session.rngState[index])) {
    context.addIssue({ code: 'custom', message: 'A nemesis cursor must match the checkpoint RNG continuation.', path: ['session', 'rngState'] });
  }
});

export type ActiveCheckpointV1 = z.infer<typeof activeCheckpointV1Schema>;

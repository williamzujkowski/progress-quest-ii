import { z } from 'zod';
import { MAX_PENDING_TASKS, MAX_PERSISTED_DESCRIPTION_LENGTH, MAX_PERSISTED_GOLD, MAX_PERSISTED_ITEMS, MAX_PERSISTED_VALUE } from '../data/limits';

export { MAX_PERSISTED_ITEMS } from '../data/limits';
export const MAX_CHARACTER_NAME_LENGTH = 120;

const shortText = z.string().max(200);
const description = z.string().max(MAX_PERSISTED_DESCRIPTION_LENGTH);
const boundedInteger = z.number().int().min(0).max(MAX_PERSISTED_VALUE);
const positiveBoundedInteger = z.number().int().positive().max(MAX_PERSISTED_VALUE);
const boundedNumber = z.number().min(0).max(MAX_PERSISTED_VALUE);
const positiveBoundedNumber = z.number().positive().max(MAX_PERSISTED_VALUE);

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

const pendingTasksSchema = z.array(sequenceTaskSchema).min(1).max(MAX_PENDING_TASKS).superRefine((tasks, context) => {
  const markerIndexes = tasks.flatMap((task, index) => task.type === 'act_marker' ? [index] : []);
  if (markerIndexes.length > 1) context.addIssue({ code: 'custom', message: 'Pending tasks may contain at most one Act marker.' });
  if (markerIndexes[0] !== undefined && markerIndexes[0] !== tasks.length - 1) {
    context.addIssue({ code: 'custom', message: 'The Act marker must be the final pending task.' });
  }
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
}).superRefine(({ PendingTasks, Task }, context) => {
  if (PendingTasks && Task.type !== 'loading' && Task.type !== 'prologue' && Task.type !== 'cinematic') {
    context.addIssue({ code: 'custom', message: 'Pending sequence tasks require an active sequence task.', path: ['PendingTasks'] });
  }
});

export type PersistedCharacterSheet = z.infer<typeof characterSheetSchema>;

const aleaFraction = z.number().min(0).lt(1).refine((value) => Number.isInteger(value * 0x1_0000_0000), {
  message: 'Alea fractions must align to 32-bit state.',
});

export const activeCheckpointV1Schema = z.object({
  schemaVersion: z.literal(1),
  session: z.object({
    character: characterSheetSchema,
    rngState: z.tuple([
      aleaFraction,
      aleaFraction,
      aleaFraction,
      z.number().int().min(0).max(2_091_638),
    ]),
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
    isPaused: z.boolean(),
    log: z.array(description).max(50),
  }).strict(),
}).strict();

export type ActiveCheckpointV1 = z.infer<typeof activeCheckpointV1Schema>;

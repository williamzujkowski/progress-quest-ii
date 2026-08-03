import { z } from 'zod';

export const MAX_PERSISTED_ITEMS = 5_000;
export const MAX_CHARACTER_NAME_LENGTH = 120;

const shortText = z.string().max(200);
const description = z.string().max(1_000);
const boundedInteger = z.number().int().min(0).max(1_000_000_000);
const positiveBoundedInteger = z.number().int().positive().max(1_000_000_000);
const boundedNumber = z.number().min(0).max(1_000_000_000);
const positiveBoundedNumber = z.number().positive().max(1_000_000_000);

export const characterNameSchema = z.string().min(1).max(MAX_CHARACTER_NAME_LENGTH);

export const characterTraitsSchema = z.object({
  Name: characterNameSchema,
  Race: z.string().min(1).max(120),
  Class: z.string().min(1).max(120),
  Level: z.number().int().min(1).max(1_000_000_000),
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
  level: z.number().int().min(1).max(1_000_000_000),
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
  act: z.number().int().min(1).max(1_000_000_000),
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
  type: z.enum(['kill', 'buying', 'selling', 'quest', 'plot', 'heading_to_market', 'heading']),
  loot: z.discriminatedUnion('type', [
    z.object({ type: z.literal('fixed'), item: z.string().min(1).max(200) }).strict(),
    z.object({ type: z.literal('random') }).strict(),
  ]).optional(),
}).strict().refine(({ durationMs, elapsedMs }) => elapsedMs <= durationMs, {
  message: 'Task elapsed time cannot exceed its duration.',
  path: ['elapsedMs'],
});

/** The exact, recursively strict, unversioned modern PQW v0 compatibility profile. */
export const characterSheetSchema = z.object({
  Traits: characterTraitsSchema,
  Stats: statsMapSchema,
  Equip: equipmentMapSchema,
  Inventory: z.array(inventoryItemSchema).max(MAX_PERSISTED_ITEMS),
  Spells: z.array(spellItemSchema).max(MAX_PERSISTED_ITEMS),
  Gold: z.number().min(0).max(1_000_000_000_000),
  Plot: plotStateSchema,
  Quest: questStateSchema,
  Task: progressTaskSchema,
}).strict().refine(({ Inventory }) => new Set(Inventory.map(({ name }) => name)).size === Inventory.length, {
  message: 'Inventory item names must be unique.',
  path: ['Inventory'],
});

export type PersistedCharacterSheet = z.infer<typeof characterSheetSchema>;

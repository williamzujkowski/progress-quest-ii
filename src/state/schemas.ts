import { z } from 'zod';

export const MAX_PERSISTED_ITEMS = 5_000;

const shortText = z.string().max(200);
const description = z.string().max(1_000);
const boundedInteger = z.number().int().min(0).max(1_000_000_000);
const boundedNumber = z.number().min(0).max(1_000_000_000);
const signedBoundedNumber = z.number().min(-1_000_000_000).max(1_000_000_000);

export const characterTraitsSchema = z.object({
  Name: z.string().min(1).max(120),
  Race: z.string().min(1).max(120),
  Class: z.string().min(1).max(120),
  Level: z.number().int().min(1).max(1_000_000_000),
});

export const statsMapSchema = z.object({
  STR: signedBoundedNumber,
  CON: signedBoundedNumber,
  DEX: signedBoundedNumber,
  INT: signedBoundedNumber,
  WIS: signedBoundedNumber,
  CHA: signedBoundedNumber,
  'HP Max': signedBoundedNumber,
  'MP Max': signedBoundedNumber,
});

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
});

export const inventoryItemSchema = z.object({
  name: shortText,
  qty: boundedInteger,
});

export const spellItemSchema = z.object({
  name: shortText,
  level: z.number().int().min(1).max(1_000_000_000),
});

export const questStateSchema = z.object({
  description,
  currentProgress: boundedNumber,
  maxProgress: boundedNumber,
  history: z.array(description).max(99).optional(),
});

export const plotStateSchema = z.object({
  act: z.number().int().min(1).max(1_000_000_000),
  currentProgress: boundedNumber,
  maxProgress: boundedNumber,
});

export const progressTaskSchema = z.object({
  description,
  durationMs: z.number().min(1).max(86_400_000),
  elapsedMs: z.number().min(0).max(86_400_000),
  type: z.enum(['kill', 'buying', 'selling', 'quest', 'plot', 'heading_to_market', 'heading']),
  loot: z.discriminatedUnion('type', [
    z.object({ type: z.literal('fixed'), item: z.string().min(1).max(200) }),
    z.object({ type: z.literal('random') }),
  ]).optional(),
});

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
});

export type PersistedCharacterSheet = z.infer<typeof characterSheetSchema>;

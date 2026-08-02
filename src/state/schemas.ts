import { z } from 'zod';

export const characterTraitsSchema = z.object({
  Name: z.string().min(1),
  Race: z.string(),
  Class: z.string(),
  Level: z.number().int().min(1),
});

export const statsMapSchema = z.object({
  STR: z.number(),
  CON: z.number(),
  DEX: z.number(),
  INT: z.number(),
  WIS: z.number(),
  CHA: z.number(),
  'HP Max': z.number(),
  'MP Max': z.number(),
});

export const equipmentMapSchema = z.object({
  Weapon: z.string(),
  Shield: z.string(),
  Helm: z.string(),
  Hauberk: z.string(),
  Brassairts: z.string(),
  Vambraces: z.string(),
  Gauntlets: z.string(),
  Gambeson: z.string(),
  Cuisses: z.string(),
  Greaves: z.string(),
  Sollerets: z.string(),
});

export const inventoryItemSchema = z.object({
  name: z.string(),
  qty: z.number().int().min(0),
});

export const spellItemSchema = z.object({
  name: z.string(),
  level: z.number().int().min(1),
});

export const questStateSchema = z.object({
  description: z.string(),
  currentProgress: z.number(),
  maxProgress: z.number(),
});

export const plotStateSchema = z.object({
  act: z.number().int().min(1),
  currentProgress: z.number(),
  maxProgress: z.number(),
});

export const progressTaskSchema = z.object({
  description: z.string(),
  durationMs: z.number(),
  elapsedMs: z.number(),
  type: z.enum(['kill', 'buying', 'selling', 'quest', 'plot', 'heading_to_market']),
});

export const characterSheetSchema = z.object({
  Traits: characterTraitsSchema,
  Stats: statsMapSchema,
  Equip: equipmentMapSchema,
  Inventory: z.array(inventoryItemSchema),
  Spells: z.array(spellItemSchema),
  Gold: z.number(),
  Plot: plotStateSchema,
  Quest: questStateSchema,
  Task: progressTaskSchema,
});

export type CharacterSheetSchemaType = z.infer<typeof characterSheetSchema>;

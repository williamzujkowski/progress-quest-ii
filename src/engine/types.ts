export type PrimeStat = 'STR' | 'CON' | 'DEX' | 'INT' | 'WIS' | 'CHA';
export type SecondaryStat = 'HP Max' | 'MP Max';
export type StatName = PrimeStat | SecondaryStat;

export interface CharacterTraits {
  Name: string;
  Race: string;
  Class: string;
  Level: number;
}

export type StatsMap = Record<StatName, number>;

export type EquipSlot =
  | 'Weapon'
  | 'Shield'
  | 'Helm'
  | 'Hauberk'
  | 'Brassairts'
  | 'Vambraces'
  | 'Gauntlets'
  | 'Gambeson'
  | 'Cuisses'
  | 'Greaves'
  | 'Sollerets';

export type EquipmentMap = Record<EquipSlot, string>;

export interface InventoryItem {
  name: string;
  qty: number;
}

export interface SpellItem {
  name: string;
  level: number;
}

export interface ProgressTask {
  description: string;
  durationMs: number;
  elapsedMs: number;
  type: 'kill' | 'buying' | 'selling' | 'quest' | 'plot' | 'heading_to_market' | 'heading';
}

export interface QuestState {
  description: string;
  currentProgress: number;
  maxProgress: number;
}

export interface CharacterSheet {
  Traits: CharacterTraits;
  Stats: StatsMap;
  Equip: EquipmentMap;
  Inventory: InventoryItem[];
  Spells: SpellItem[];
  Gold: number;
  Plot: {
    act: number;
    currentProgress: number;
    maxProgress: number;
  };
  Quest: QuestState;
  Task: ProgressTask;
}

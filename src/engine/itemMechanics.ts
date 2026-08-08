import { armourTableForSlot } from '../data/armourBySlot';
import {
  DEFENSE_ATTRIB,
  DEFENSE_BAD,
  OFFENSE_ATTRIB,
  OFFENSE_BAD,
  SHIELDS,
  WEAPONS,
} from '../data/traits';
import type { EquipSlot } from './types';

interface QualityPart {
  name: string;
  value: number;
}

export interface EquipmentMechanics {
  kind: 'equipment';
  quality: {
    base: QualityPart | null;
    modifiers: QualityPart[];
    mark: { label: string; value: number } | null;
    total: number;
  } | null;
  combatContribution: 'none';
}

export interface SpellMechanics {
  kind: 'spell';
  rank: number;
  combatContribution: 'none';
}

export interface InventoryMechanics {
  kind: 'inventory';
  quantity: number;
  encumbranceCubits: number;
  combatContribution: 'none';
}

export type ItemMechanicsRequest =
  | { kind: 'equipment'; name: string; slot: EquipSlot }
  | { kind: 'spell'; level: number }
  | { kind: 'inventory'; name: string; quantity: number };

export function analyzeItemMechanics(request: Extract<ItemMechanicsRequest, { kind: 'equipment' }>): EquipmentMechanics;
export function analyzeItemMechanics(request: Extract<ItemMechanicsRequest, { kind: 'spell' }>): SpellMechanics;
export function analyzeItemMechanics(request: Extract<ItemMechanicsRequest, { kind: 'inventory' }>): InventoryMechanics;
export function analyzeItemMechanics(request: ItemMechanicsRequest): EquipmentMechanics | SpellMechanics | InventoryMechanics {
  if (request.kind === 'spell') {
    return { kind: 'spell', rank: request.level, combatContribution: 'none' };
  }
  if (request.kind === 'inventory') {
    return {
      kind: 'inventory',
      quantity: request.quantity,
      encumbranceCubits: request.name === 'Gold' ? 0 : request.quantity,
      combatContribution: 'none',
    };
  }
  const { name, slot } = request;
  if (!name || name === '—') return { kind: 'equipment', quality: null, combatContribution: 'none' };

  // Armour is named per slot, so the table an item is looked up in has to be the slot's own.
  // Reading every slot against the shared list would find no base for eight of the nine, which
  // costs the tooltips their breakdown and `loadoutQuality` its entire contribution.
  const baseTable = slot === 'Weapon' ? WEAPONS : slot === 'Shield' ? SHIELDS : armourTableForSlot(slot);
  const modifierTable = slot === 'Weapon'
    ? [...OFFENSE_ATTRIB, ...OFFENSE_BAD]
    : [...DEFENSE_ATTRIB, ...DEFENSE_BAD];
  const baseEntry = baseTable.find(([label]) => name.includes(label));
  const base = baseEntry ? { name: baseEntry[0], value: baseEntry[1] } : null;
  const modifiers = modifierTable
    .flatMap(([label, value]) => name.includes(label) ? [{ name: label, value }] : []);
  const assessorMark = name.match(/^[+-]?\d+/)?.[0];
  const parsedMark = Number(assessorMark ?? 0);
  const modifierTotal = modifiers.reduce((total, modifier) => total + modifier.value, 0);
  const acceptedMark = assessorMark !== undefined
    && assessorMark.length <= 17
    && Number.isSafeInteger(parsedMark)
    && Number.isSafeInteger((base?.value ?? 0) + modifierTotal + parsedMark);
  const mark = acceptedMark
    ? { label: `${assessorMark.startsWith('+') ? '+' : ''}${parsedMark}`, value: parsedMark }
    : null;

  return {
    kind: 'equipment',
    quality: {
      base,
      modifiers,
      mark,
      total: (base?.value ?? 0) + modifierTotal + (mark?.value ?? 0),
    },
    combatContribution: 'none',
  };
}

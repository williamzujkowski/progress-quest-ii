import { MAX_PERSISTED_DESCRIPTION_LENGTH } from '../data/limits';
import { formatGameNumber, indefinite } from '../engine/text';
import type { GameTransitionEvent } from '../engine/transition';

export type GameSoundCue = 'level_up' | 'quest_complete' | 'market';

export function describeAct(act: number): string {
  return act === 0 ? 'Prologue' : `Act ${formatGameNumber(act)}`;
}

function gained(value: string, quantity = 1): string {
  return `Gained ${indefinite(value, quantity)}`;
}

function describeUnboundedGameEvent(event: GameTransitionEvent): string {
  switch (event.type) {
    case 'level_gained': return gained('Level');
    case 'stat_gained': return gained(event.stat, event.amount);
    case 'quest_completed': return `Quest completed: ${event.description}`;
    case 'quest_started': return `Commencing quest: ${event.description}`;
    case 'save_requested': return `Saving game: ${event.characterName}`;
    case 'item_gained': return gained(event.name, event.quantity);
    case 'gold_received': return `Got paid ${indefinite('gold piece', event.amount)}`;
    case 'inventory_sold': return `Got paid ${indefinite('gold piece', event.gold)}`;
    case 'equipment_purchased': return `Negotiated purchase: Equipped ${event.name} in ${event.slot} slot!`;
    case 'equipment_gained': return `Gained ${event.name} for the ${event.slot} slot`;
    case 'act_completed': return `Completed ${describeAct(event.act)}`;
    case 'task_started': return event.task.description;
  }
}

export function describeGameEvent(event: GameTransitionEvent): string {
  return describeUnboundedGameEvent(event).slice(0, MAX_PERSISTED_DESCRIPTION_LENGTH);
}

/**
 * The mechanical cause behind an event, where the engine already knew it.
 *
 * Kept literal and separate from the flavour line it accompanies — the same split the item
 * tooltips use. It reports only quantities the engine actually computed, and never damage,
 * mitigation, spell priority, or any other system this game does not have.
 */
export function describeDecisionReason(event: GameTransitionEvent): string | undefined {
  if (event.type === 'task_started' && event.reason) {
    const { carriedCubits, capacityCubits } = event.reason;
    return `Carrying ${carriedCubits} of ${capacityCubits} cubits. At capacity, procurement routes the hero to market.`;
  }
  if (event.type === 'level_gained' && event.reason) {
    return `The experience track reached its full ${event.reason.experienceSeconds} seconds and was reset for the next level.`;
  }
  return undefined;
}

export function soundCueForGameEvent(event: GameTransitionEvent): GameSoundCue | undefined {
  if (event.type === 'level_gained') return 'level_up';
  if (event.type === 'quest_completed') return 'quest_complete';
  if (event.type === 'inventory_sold' || event.type === 'equipment_purchased') return 'market';
  return undefined;
}

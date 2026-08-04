import { MAX_PERSISTED_DESCRIPTION_LENGTH } from '../data/limits';
import { indefinite } from '../engine/text';
import type { GameTransitionEvent } from '../engine/transition';

export type GameSoundCue = 'level_up' | 'quest_complete' | 'market';

export function describeAct(act: number): string {
  return act === 0 ? 'Prologue' : `Act ${act}`;
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
    case 'inventory_sold': return `Sold loot at market for ${event.gold} gold!`;
    case 'equipment_purchased': return `Negotiated purchase: Equipped ${event.name} in ${event.slot} slot!`;
    case 'equipment_gained': return `Gained ${event.name} for the ${event.slot} slot`;
    case 'act_completed': return `Completed ${describeAct(event.act)}`;
    case 'task_started': return event.task.description;
  }
}

export function describeGameEvent(event: GameTransitionEvent): string {
  return describeUnboundedGameEvent(event).slice(0, MAX_PERSISTED_DESCRIPTION_LENGTH);
}

export function soundCueForGameEvent(event: GameTransitionEvent): GameSoundCue | undefined {
  if (event.type === 'level_gained') return 'level_up';
  if (event.type === 'quest_completed') return 'quest_complete';
  if (event.type === 'inventory_sold' || event.type === 'equipment_purchased') return 'market';
  return undefined;
}

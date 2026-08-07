import { describe, expect, it } from 'vitest';
import { MAX_PERSISTED_DESCRIPTION_LENGTH } from '../../data/limits';
import type { GameTransitionEvent } from '../../engine/transition';
import { describeAct, describeGameEvent, soundCueForGameEvent } from '../../state/gameEventAdapter';

describe('game event presentation adapter', () => {
  it('keeps familiar Act labels and compacts absurd ones', () => {
    expect(describeAct(0)).toBe('Prologue');
    expect(describeAct(42)).toBe('Act 42');
    expect(describeAct(1_000_000)).toBe('Act 1.00e6');
  });

  it.each([
    [{ type: 'level_gained', level: 2 }, 'Gained a Level', 'level_up'],
    [{ type: 'stat_gained', stat: 'HP Max', amount: 6 }, 'Gained 6 HP Maxes', undefined],
    [{ type: 'quest_completed', description: 'Acquire forms' }, 'Quest completed: Acquire forms', 'quest_complete'],
    [{ type: 'quest_started', description: 'Misfile forms' }, 'Commencing quest: Misfile forms', undefined],
    [{ type: 'save_requested', characterName: 'Oracle' }, 'Saving game: Oracle', undefined],
    [{ type: 'item_gained', name: 'nit tail', quantity: 1 }, 'Gained a nit tail', undefined],
    [{ type: 'gold_received', amount: 1 }, 'Got paid a gold piece', undefined],
    [{ type: 'gold_received', amount: 0.5 }, 'Got paid 0.5 gold pieces', undefined],
    [{ type: 'inventory_sold', gold: 47 }, 'Got paid 47 gold pieces', 'market'],
    [{ type: 'equipment_purchased', slot: 'Helm', name: 'Tax Hat' }, 'Negotiated purchase: Equipped Tax Hat in Helm slot!', 'market'],
    [{ type: 'task_started', task: { description: 'Waiting heroically...', durationMs: 1, elapsedMs: 0, type: 'heading' } }, 'Waiting heroically...', undefined],
  ] as const)('presents %o as legacy activity with its sound cue', (event, message, cue) => {
    expect(describeGameEvent(event as GameTransitionEvent)).toBe(message);
    expect(soundCueForGameEvent(event as GameTransitionEvent)).toBe(cue);
  });

  it('keeps prefixed event text within the checkpoint log limit', () => {
    const message = describeGameEvent({ type: 'quest_completed', description: 'q'.repeat(MAX_PERSISTED_DESCRIPTION_LENGTH) });

    expect(message).toHaveLength(MAX_PERSISTED_DESCRIPTION_LENGTH);
    expect(message).toMatch(/^Quest completed: /);
  });
});

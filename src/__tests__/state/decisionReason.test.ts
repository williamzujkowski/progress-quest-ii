import { describe, expect, it } from 'vitest';
import type { GameTransitionEvent } from '../../engine/transition';
import { describeDecisionReason } from '../../state/gameEventAdapter';

const marketTrip = (carriedCubits: number, capacityCubits: number): GameTransitionEvent => ({
  type: 'task_started',
  task: { description: 'Heading to market to sell loot...', durationMs: 4000, elapsedMs: 0, type: 'heading_to_market' },
  reason: { carriedCubits, capacityCubits },
});

describe('decision reasons', () => {
  it('reports the encumbrance figures the engine compared', () => {
    expect(describeDecisionReason(marketTrip(22, 22))).toBe(
      'Carrying 22 of 22 cubits. At capacity, procurement routes the hero to market.',
    );
  });

  it('reports the experience track that filled', () => {
    expect(describeDecisionReason({ type: 'level_gained', level: 4, reason: { experienceSeconds: 1269 } }))
      .toContain('1269 seconds');
  });

  it('says nothing for events the engine did not attach a cause to', () => {
    // Absence is the default: a reason exists only where the decision site already knew one.
    expect(describeDecisionReason({ type: 'level_gained', level: 4 })).toBeUndefined();
    expect(describeDecisionReason({ type: 'gold_received', amount: 1 })).toBeUndefined();
    expect(describeDecisionReason({ type: 'quest_completed', description: 'x' })).toBeUndefined();
  });

  it('claims no mechanic the engine does not model', () => {
    const reasons = [describeDecisionReason(marketTrip(5, 5)),
      describeDecisionReason({ type: 'level_gained', level: 2, reason: { experienceSeconds: 60 } })];
    for (const reason of reasons) {
      expect(reason).toBeDefined();
      expect(reason!).not.toMatch(/damage|mitigation|armou?r rating|spell priority|dps|attack/i);
    }
  });
});

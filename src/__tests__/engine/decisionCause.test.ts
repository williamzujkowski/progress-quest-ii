import { describe, expect, it } from 'vitest';
import { calculateEncumbranceMax } from '../../engine/math';
import { RandomGenerator } from '../../engine/prng';
import { calculateEncumbrance, createNewCharacter } from '../../engine/sim';
import { advanceGame, type GameTransitionEvent, type GameTransitionState } from '../../engine/transition';

/**
 * The reasons attached at the transition seam must be the figures the engine actually compared,
 * not a plausible-looking restatement. These assert against the same helpers the decision uses.
 */

describe('decision causes at the transition seam', () => {
  it('attaches the encumbrance figures that sent the hero to market', () => {
    const character = createNewCharacter('Cause Subject', 'Half Orc', 'Ur-Paladin', 606);
    character.PendingTasks = undefined;
    character.Task = { description: 'Loading', durationMs: 1000, elapsedMs: 0, type: 'act_marker' };
    // Load the pack past capacity so the market branch is the one taken.
    const capacity = calculateEncumbranceMax(character.Stats.STR);
    character.Inventory = [
      { name: 'Gold', qty: 0 },
      { name: 'ballast', qty: capacity + 5 },
    ];

    const state: GameTransitionState = {
      character,
      progression: { experience: { currentSeconds: 0, maxSeconds: 1000 }, completedTasks: 0, elapsedSeconds: 0 },
    };
    const result = advanceGame(state, 1000, new RandomGenerator('market-cause'));

    const started = result.records
      .map(({ event }) => event)
      .find((event) => event.type === 'task_started' && event.task.type === 'heading_to_market');
    expect(started, 'expected the hero to be routed to market').toBeDefined();
    if (started?.type !== 'task_started') throw new Error('unreachable');

    expect(started.reason).toBeDefined();
    // The reported figures must be the ones the branch actually compared.
    expect(started.reason!.carriedCubits).toBe(calculateEncumbrance(character.Inventory));
    expect(started.reason!.capacityCubits).toBe(capacity);
    expect(started.reason!.carriedCubits).toBeGreaterThanOrEqual(started.reason!.capacityCubits);
  });

  it('attaches the experience track that filled to a level', () => {
    const character = createNewCharacter('Level Cause', 'Half Orc', 'Ur-Paladin', 707);
    character.PendingTasks = undefined;
    character.Task = { description: 'Executing a Rat...', durationMs: 1000, elapsedMs: 0, type: 'kill' };

    const maxSeconds = 1_000;
    const result = advanceGame(
      { character, progression: { experience: { currentSeconds: maxSeconds, maxSeconds }, completedTasks: 0, elapsedSeconds: 0 } },
      1000,
      new RandomGenerator('level-cause'),
    );

    const levelled = result.records.map(({ event }) => event).find((event) => event.type === 'level_gained');
    expect(levelled).toBeDefined();
    if (levelled?.type !== 'level_gained') throw new Error('unreachable');
    // The track that filled, not the one that replaced it.
    expect(levelled.reason?.experienceSeconds).toBe(maxSeconds);
  });

  it('leaves ordinary task starts without a cause', () => {
    const character = createNewCharacter('Plain Subject', 'Half Orc', 'Ur-Paladin', 808);
    character.PendingTasks = undefined;
    character.Task = { description: 'Executing a Rat...', durationMs: 1000, elapsedMs: 0, type: 'kill' };
    const result = advanceGame(
      { character, progression: { experience: { currentSeconds: 0, maxSeconds: 10_000 }, completedTasks: 0, elapsedSeconds: 0 } },
      1000,
      new RandomGenerator('plain-cause'),
    );
    const started = result.records
      .map(({ event }) => event)
      .filter((event): event is Extract<GameTransitionEvent, { type: 'task_started' }> => event.type === 'task_started');
    expect(started.length).toBeGreaterThan(0);
    for (const event of started) expect(event.reason).toBeUndefined();
  });
});

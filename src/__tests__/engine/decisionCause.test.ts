import { describe, expect, it } from 'vitest';
import { calculateEncumbranceMax } from '../../engine/math';
import { storageAllowance } from '../../engine/storage';
import { RandomGenerator } from '../../engine/prng';
import { calculateEncumbrance, createNewCharacter } from '../../engine/sim';
import { advanceGame, type GameTransitionState } from '../../engine/transition';

/**
 * The reasons attached at the transition seam must be the figures the engine actually compared,
 * not a plausible-looking restatement. These assert against the same helpers the decision uses.
 */

describe('decision causes at the transition seam', () => {
  it('attaches the encumbrance figures that sent the hero to market', () => {
    const character = createNewCharacter('Cause Subject', 'Half Daemon', 'Incident Paladin', 606);
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

  it('compares against the padded capacity, and reports the padded figure', () => {
    // The market branch reads capacity a second time, in `transition.ts`, and it was possible to
    // remove the padding from that one call while every other test stayed green — the storage suite
    // exercises `generateTaskDescription` in `sim.ts`, which is a different site computing the same
    // thing. Two derivations of one number is how they drift apart, so this pins the second.
    const character = createNewCharacter('Padded Cause', 'Half Daemon', 'Incident Paladin', 606);
    character.PendingTasks = undefined;
    character.Task = { description: 'Loading', durationMs: 1000, elapsedMs: 0, type: 'act_marker' };
    character.Equip = { ...character.Equip, Gambeson: 'Doomsday Vault' };

    const padded = calculateEncumbranceMax(character.Stats.STR, storageAllowance(character.Equip));
    expect(padded, 'the fixture must actually be padded, or this test asserts nothing')
      .toBeGreaterThan(calculateEncumbranceMax(character.Stats.STR));
    character.Inventory = [{ name: 'Gold', qty: 0 }, { name: 'ballast', qty: padded + 5 }];

    const result = advanceGame(
      { character, progression: { experience: { currentSeconds: 0, maxSeconds: 1000 }, completedTasks: 0, elapsedSeconds: 0 } },
      1000,
      new RandomGenerator('padded-market-cause'),
    );

    const started = result.records
      .map(({ event }) => event)
      .find((event) => event.type === 'task_started' && event.task.type === 'heading_to_market');
    expect(started, 'expected the hero to be routed to market').toBeDefined();
    if (started?.type !== 'task_started') throw new Error('unreachable');
    expect(started.reason!.capacityCubits).toBe(padded);
  });

  it('keeps a hero questing while the padding still has room', () => {
    // The other half, and the one that fails if the branch ignores the padding: a load that would
    // send a bare hero to market leaves a padded one out in the field.
    const laden = (Gambeson: string) => {
      const character = createNewCharacter('Roomy', 'Half Daemon', 'Incident Paladin', 606);
      character.PendingTasks = undefined;
      character.Task = { description: 'Loading', durationMs: 1000, elapsedMs: 0, type: 'act_marker' };
      character.Equip = { ...character.Equip, Gambeson };
      character.Inventory = [{ name: 'Gold', qty: 0 }, { name: 'ballast', qty: calculateEncumbranceMax(character.Stats.STR) }];
      const result = advanceGame(
        { character, progression: { experience: { currentSeconds: 0, maxSeconds: 1000 }, completedTasks: 0, elapsedSeconds: 0 } },
        1000,
        new RandomGenerator('roomy'),
      );
      return result.records.map(({ event }) => event)
        .some((event) => event.type === 'task_started' && event.task.type === 'heading_to_market');
    };

    expect(laden(''), 'a bare hero at capacity goes to market').toBe(true);
    expect(laden('Doomsday Vault'), 'a padded hero at the same load keeps questing').toBe(false);
  });

  it('attaches the experience track that filled to a level', () => {
    const character = createNewCharacter('Level Cause', 'Half Daemon', 'Incident Paladin', 707);
    character.PendingTasks = undefined;
    character.Task = { description: 'Executing a Nit...', durationMs: 1000, elapsedMs: 0, type: 'kill' };

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
    const character = createNewCharacter('Plain Subject', 'Half Daemon', 'Incident Paladin', 808);
    character.PendingTasks = undefined;
    character.Task = { description: 'Executing a Nit...', durationMs: 1000, elapsedMs: 0, type: 'kill' };
    const result = advanceGame(
      { character, progression: { experience: { currentSeconds: 0, maxSeconds: 10_000 }, completedTasks: 0, elapsedSeconds: 0 } },
      1000,
      new RandomGenerator('plain-cause'),
    );
    // Collected first, and counted, because the interesting failure is the engine emitting no
    // task start at all: a loop that only checks the starts it happens to find reports success
    // loudest exactly when there is nothing left to check.
    const starts = result.records.map(({ event }) => event).filter((event) => event.type === 'task_started');
    expect(starts.length, 'expected the tick to start at least one task').toBeGreaterThan(0);
    for (const start of starts) expect(start.reason).toBeUndefined();
  });

  it('refuses an elapsed span that is not a positive finite number', () => {
    // The caller-facing guard at transition.ts:229. Across the suite's 84 advanceGame call sites
    // the elapsed argument is always a positive finite literal, so nothing exercised it — and the
    // game clock is what feeds it, which can produce a zero delta and has a history of
    // misbehaving across tab-visibility changes.
    const character = createNewCharacter('Guard Subject', 'Half Daemon', 'Incident Paladin', 909);
    const state: GameTransitionState = {
      character,
      progression: { experience: { currentSeconds: 0, maxSeconds: 1000 }, completedTasks: 0, elapsedSeconds: 0 },
    };

    for (const refused of [0, -1, -1000, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const result = advanceGame(state, refused, new RandomGenerator('guard'));
      // Returned untouched, not merely unchanged-looking: the same object back is what tells the
      // caller nothing happened, and it is what lets the store skip a write and a render.
      expect(result.state, `${refused} should advance nothing`).toBe(state);
      expect(result.records).toEqual([]);
      expect(result.remainingElapsedMs).toBe(0);
    }
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import type { StatsMap } from '../../engine/types';
import { useGameStore } from '../../state/gameStore';

describe('Game Store State Machine', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame('TestHero', 'Double Hobbit', 'Ur-Paladin');
  });

  it('initializes character with level 1 and valid stats', () => {
    const { character } = useGameStore.getState();
    expect(character.Traits.Name).toBe('TestHero');
    expect(character.Traits.Level).toBe(1);
    expect(character.Traits.Race).toBe('Double Hobbit');
    expect(character.Traits.Class).toBe('Ur-Paladin');
    expect(character.Task).toBeDefined();
  });

  it('advances task progress on tick when not paused', () => {
    const store = useGameStore.getState();
    const initialElapsed = store.character.Task.elapsedMs;

    store.tick(500);

    const updatedChar = useGameStore.getState().character;
    expect(updatedChar.Task.elapsedMs).toBe(initialElapsed + 500);
  });

  it('does not advance tick when paused', () => {
    const store = useGameStore.getState();
    store.togglePause();
    const initialElapsed = store.character.Task.elapsedMs;

    store.tick(500);

    const updatedChar = useGameStore.getState().character;
    expect(updatedChar.Task.elapsedMs).toBe(initialElapsed);
  });

  it('completes task and transitions to new task when elapsed >= duration', () => {
    const store = useGameStore.getState();
    const duration = store.character.Task.durationMs;

    store.tick(duration + 100);

    const updatedChar = useGameStore.getState().character;
    expect(updatedChar.Task.elapsedMs).toBeLessThan(updatedChar.Task.durationMs);
    expect(useGameStore.getState().log.length).toBeGreaterThan(0);
  });

  it('uses and defensively copies an accepted complete stat roll', () => {
    const acceptedStats: StatsMap = { STR: 18, CON: 17, DEX: 16, INT: 15, WIS: 14, CHA: 13, 'HP Max': 35, 'MP Max': 27 };

    useGameStore.getState().resetGame('RolledHero', 'Double Hobbit', 'Ur-Paladin', acceptedStats);
    acceptedStats.STR = 1;

    expect(useGameStore.getState().character.Stats).toEqual({ STR: 18, CON: 17, DEX: 16, INT: 15, WIS: 14, CHA: 13, 'HP Max': 35, 'MP Max': 27 });
  });
});

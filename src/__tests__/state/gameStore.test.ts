import { beforeEach, describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import type { StatsMap } from '../../engine/types';
import { useGameStore } from '../../state/gameStore';

describe('Game Store State Machine', () => {
  beforeEach(() => {
    useGameStore.getState().startSession({ source: 'creation', name: 'TestHero', race: 'Double Hobbit', klass: 'Ur-Paladin', seed: 'test-session' });
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

    useGameStore.getState().startSession({ source: 'creation', name: 'RolledHero', race: 'Double Hobbit', klass: 'Ur-Paladin', seed: 'accepted-roll', stats: acceptedStats });
    acceptedStats.STR = 1;

    expect(useGameStore.getState().character.Stats).toEqual({ STR: 18, CON: 17, DEX: 16, INT: 15, WIS: 14, CHA: 13, 'HP Max': 35, 'MP Max': 27 });
  });

  it('replays creation deterministically from the explicit session seed', () => {
    const request = { source: 'creation', name: 'ReplayHero', race: 'Dung Elf', klass: 'Vermineer', seed: 'replay-seed' } as const;
    useGameStore.getState().startSession(request);
    const firstCharacter = structuredClone(useGameStore.getState().character);
    const firstRngState = useGameStore.getState().rng.getState();

    useGameStore.getState().startSession(request);

    expect(useGameStore.getState().character).toEqual(firstCharacter);
    expect(useGameStore.getState().rng.getState()).toEqual(firstRngState);
  });

  it('loads a character through a complete fresh game session', () => {
    const loaded = createNewCharacter('ImportedHero', 'Half Halfling', 'Ur-Paladin', new RandomGenerator('saved-character'));
    const previousRng = useGameStore.getState().rng;
    useGameStore.getState().togglePause();

    useGameStore.getState().startSession({ source: 'import', character: loaded });

    const session = useGameStore.getState();
    expect(session.character).toEqual(loaded);
    expect(session.character).not.toBe(loaded);
    expect(session.rng).not.toBe(previousRng);
    expect(session.isPaused).toBe(false);
    expect(session.log).toEqual(['Loaded character ImportedHero from save data.']);

    loaded.Gold = 999;
    expect(session.character.Gold).not.toBe(999);
  });
});

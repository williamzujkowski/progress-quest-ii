import { beforeEach, describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { levelUpTime } from '../../engine/math';
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

  it('does not advance tick when paused', () => {
    const store = useGameStore.getState();
    store.togglePause();
    const initialElapsed = store.character.Task.elapsedMs;

    store.tick(500);

    const updatedChar = useGameStore.getState().character;
    expect(updatedChar.Task.elapsedMs).toBe(initialElapsed);
  });

  it('installs one transition atomically and presents events newest first', () => {
    const character = structuredClone(useGameStore.getState().character);
    character.Inventory = [];
    character.Quest = { ...character.Quest, currentProgress: 0, maxProgress: 99, history: [character.Quest.description] };
    character.Task = {
      description: 'Executing test monster...',
      durationMs: 1,
      elapsedMs: 0,
      type: 'kill',
      loot: { type: 'fixed', item: 'rat tail' },
    };
    useGameStore.setState({ character, log: [], rng: new RandomGenerator('atomic-transition') });
    let notifications = 0;
    const unsubscribe = useGameStore.subscribe(() => { notifications += 1; });

    useGameStore.getState().tick(1);
    unsubscribe();

    const updated = useGameStore.getState();
    expect(notifications).toBe(1);
    expect(updated.character.Inventory).toEqual([{ name: 'rat tail', qty: 1 }]);
    expect(updated.log[0]).toBe(updated.character.Task.description);
    expect(updated.log[1]).toBe('Gained a rat tail');
  });

  it('drains bounded catch-up remainder on a later scheduler tick', () => {
    useGameStore.getState().tick(1_000_000_000);
    expect(useGameStore.getState().progression.completedTasks).toBe(100);

    useGameStore.getState().tick(1);

    expect(useGameStore.getState().progression.completedTasks).toBe(200);
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
    expect(session.progression).toEqual({
      experience: { currentSeconds: 0, maxSeconds: levelUpTime(loaded.Traits.Level) },
      completedTasks: 0,
      elapsedSeconds: 0,
    });

    loaded.Gold = 999;
    expect(session.character.Gold).not.toBe(999);
  });

  it('restores a validated complete session through one atomic store action', () => {
    const character = createNewCharacter('RestoredHero', 'Dung Elf', 'Vermineer', 704);
    const rng = new RandomGenerator('restored-rng');
    rng.random(100);
    const rngState = rng.getState();
    const progression = { experience: { currentSeconds: 4, maxSeconds: 9 }, completedTasks: 3, elapsedSeconds: 12 };

    useGameStore.getState().restoreSession({ character, rngState, progression, pendingElapsedMs: 37, isPaused: true, log: ['Restored event'] });
    const restored = useGameStore.getState();

    expect(restored.character).toEqual(character);
    expect(restored.character).not.toBe(character);
    expect(restored.rng.getState()).toEqual(rngState);
    expect(restored.progression).toEqual(progression);
    expect(restored.pendingElapsedMs).toBe(37);
    expect(restored.isPaused).toBe(true);
    expect(restored.log).toEqual(['Restored event']);
  });
});

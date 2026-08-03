import { beforeEach, describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { levelUpTime } from '../../engine/math';
import { createNewCharacter, generateLootItem } from '../../engine/sim';
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
    const initialProgression = structuredClone(store.progression);

    store.tick(500);

    const updatedChar = useGameStore.getState().character;
    expect(updatedChar.Task.elapsedMs).toBe(initialElapsed + 500);
    expect(useGameStore.getState().progression).toEqual(initialProgression);
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

  it('carries elapsed overshoot into the next task', () => {
    const duration = useGameStore.getState().character.Task.durationMs;

    useGameStore.getState().tick(duration + 100);

    expect(useGameStore.getState().character.Task.elapsedMs).toBe(100);
  });

  it('consumes multiple completed tasks from one delayed tick', () => {
    const duration = useGameStore.getState().character.Task.durationMs;
    const initialLogLength = useGameStore.getState().log.length;

    useGameStore.getState().tick(duration + 10_000);

    const updated = useGameStore.getState();
    expect(updated.character.Task.elapsedMs).toBeLessThan(updated.character.Task.durationMs);
    expect(updated.log.length).toBeGreaterThan(initialLogLength);
    expect(updated.progression.completedTasks).toBeGreaterThan(1);
  });

  it('bounds catch-up work for an extreme delayed tick', () => {
    useGameStore.getState().tick(1_000_000_000);

    const updated = useGameStore.getState();
    expect(updated.character.Task.elapsedMs).toBe(0);
    expect(updated.log.length).toBeLessThanOrEqual(50);
    expect(updated.progression.completedTasks).toBe(100);
  });

  it('chooses the next task from gold earned by the completed transition', () => {
    const character = structuredClone(useGameStore.getState().character);
    character.Gold = 0;
    character.Inventory = [
      { name: 'Gold', qty: 0 },
      { name: 'Ancient Widget', qty: 4 },
    ];
    character.Task = {
      description: 'Selling loot...',
      durationMs: 1,
      elapsedMs: 0,
      type: 'selling',
    };
    useGameStore.setState({ character, rng: new RandomGenerator('sale-transition') });

    useGameStore.getState().tick(1);

    const updated = useGameStore.getState().character;
    expect(updated.Gold).toBeGreaterThanOrEqual(35);
    expect(updated.Task.type).toBe('buying');
    expect(useGameStore.getState().progression).toMatchObject({ completedTasks: 1, elapsedSeconds: 0 });
  });

  it('chooses the next task from gold spent by the completed transition', () => {
    const character = structuredClone(useGameStore.getState().character);
    character.Gold = 35;
    character.Inventory = [{ name: 'Gold', qty: 0 }];
    character.Task = {
      description: 'Buying equipment...',
      durationMs: 1,
      elapsedMs: 0,
      type: 'buying',
    };
    useGameStore.setState({ character, rng: new RandomGenerator('purchase-transition') });

    useGameStore.getState().tick(1);

    const updated = useGameStore.getState().character;
    expect(updated.Gold).toBe(0);
    expect(updated.Task.type).toBe('kill');
  });

  it('does not mutate a previous inventory snapshot when loot stacks', () => {
    const lootSeed = 'stacked-loot';
    const lootName = generateLootItem(new RandomGenerator(lootSeed));
    const character = structuredClone(useGameStore.getState().character);
    character.Inventory = [
      { name: 'Gold', qty: 0 },
      { name: lootName, qty: 1 },
      { name: 'Unrelated Trinket', qty: 1 },
    ];
    character.Quest = { ...character.Quest, currentProgress: 0, maxProgress: 99 };
    character.Task = {
      description: 'Executing test monster...',
      durationMs: 1,
      elapsedMs: 0,
      type: 'kill',
    };
    const previousItem = character.Inventory[1];
    const unrelatedItem = character.Inventory[2];
    useGameStore.setState({ character, rng: new RandomGenerator(lootSeed) });

    useGameStore.getState().tick(1);

    const updatedItem = useGameStore.getState().character.Inventory.find((item) => item.name === lootName);
    expect(previousItem?.qty).toBe(1);
    expect(updatedItem?.qty).toBe(2);
    expect(updatedItem).not.toBe(previousItem);
    expect(useGameStore.getState().character.Inventory[2]).toBe(unrelatedItem);
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
});

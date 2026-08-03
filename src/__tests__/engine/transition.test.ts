import { describe, expect, it } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import { advanceGame } from '../../engine/transition';
import type { CharacterSheet } from '../../engine/types';
import { characterSheetSchema } from '../../state/schemas';
import oneKillFixture from '../fixtures/legacy/one-kill.json';
import levelUpFixture from '../fixtures/legacy/xp-level-up.json';
import questFixture from '../fixtures/legacy/quest-completion.json';

function stateFor(character: CharacterSheet) {
  return {
    character,
    progression: { experience: { currentSeconds: 0, maxSeconds: 10 }, completedTasks: 0, elapsedSeconds: 0 },
  };
}

describe('advanceGame', () => {
  it('advances an incomplete task without mutating the previous state', () => {
    const character = createNewCharacter('Seam Tester', 'Dung Elf', 'Vermineer', 801);
    const state = {
      character,
      progression: {
        experience: { currentSeconds: 0, maxSeconds: 10 },
        completedTasks: 0,
        elapsedSeconds: 0,
      },
    };
    const snapshot = structuredClone(state);

    const result = advanceGame(state, 500, new RandomGenerator('transition-progress'));

    expect(result).toEqual({
      state: {
        character: { ...character, Task: { ...character.Task, elapsedMs: 500 } },
        progression: state.progression,
      },
      events: [],
      remainingElapsedMs: 0,
    });
    expect(state).toEqual(snapshot);
  });

  it('matches the legacy one-kill state, events, remainder, and RNG continuation', () => {
    const sheet = oneKillFixture.input.sheet;
    const character: CharacterSheet = {
      Traits: structuredClone(sheet.Traits),
      Stats: structuredClone(sheet.Stats),
      Equip: structuredClone(sheet.Equips),
      Inventory: [],
      Spells: [],
      Gold: 0,
      Plot: { act: sheet.act, currentProgress: sheet.PlotBar.position, maxProgress: sheet.PlotBar.max },
      Quest: { description: sheet.bestquest, currentProgress: sheet.QuestBar.position, maxProgress: sheet.QuestBar.max, history: [...sheet.Quests] },
      Task: {
        description: sheet.kill,
        durationMs: sheet.TaskBar.max,
        elapsedMs: 0,
        type: 'kill',
        loot: { type: 'fixed', item: 'rat tail' },
      },
    };
    const state = {
      character,
      progression: {
        experience: { currentSeconds: sheet.ExpBar.position, maxSeconds: sheet.ExpBar.max },
        completedTasks: sheet.tasks,
        elapsedSeconds: sheet.elapsed,
      },
    };
    const snapshot = structuredClone(state);
    const rng = new RandomGenerator('legacy-one-kill');
    rng.setState([...sheet.seed] as [number, number, number, number]);

    const result = advanceGame(state, sheet.TaskBar.max + 100, rng);

    expect(result.state.progression).toEqual({
      experience: { currentSeconds: 6, maxSeconds: 1269 },
      completedTasks: 1,
      elapsedSeconds: 6,
    });
    expect(result.state.character).toMatchObject({
      Inventory: [{ name: 'rat tail', qty: 1 }],
      Quest: { currentProgress: 6, maxProgress: 100 },
      Plot: { currentProgress: 6, maxProgress: 1000 },
      Task: {
        description: 'Executing a Grid Bug...',
        durationMs: 6000,
        elapsedMs: 100,
        type: 'kill',
        loot: { type: 'fixed', item: 'grid bug carapace' },
      },
    });
    expect(result.events).toEqual([
      { type: 'item_gained', name: 'rat tail', quantity: 1 },
      { type: 'task_started', task: { ...result.state.character.Task, elapsedMs: 0 } },
    ]);
    expect(result.remainingElapsedMs).toBe(0);
    expect(rng.getState()).toEqual(oneKillFixture.expected.rng);
    expect(state).toEqual(snapshot);
    const taskEvent = result.events.find((event) => event.type === 'task_started');
    if (!taskEvent) throw new Error('Expected task-started event');
    taskEvent.task.elapsedMs = 999;
    if (taskEvent.task.loot?.type === 'fixed') taskEvent.task.loot.item = 'tampered';
    expect(result.state.character.Task).toMatchObject({ elapsedMs: 100, loot: { item: 'grid bug carapace' } });
  });

  it('emits structured legacy level-up facts without producing side effects', () => {
    const sheet = levelUpFixture.input.sheet;
    const character: CharacterSheet = {
      Traits: structuredClone(sheet.Traits),
      Stats: structuredClone(sheet.Stats),
      Equip: structuredClone(sheet.Equips),
      Inventory: [],
      Spells: [],
      Gold: 0,
      Plot: { act: sheet.act, currentProgress: sheet.PlotBar.position, maxProgress: sheet.PlotBar.max },
      Quest: { description: sheet.bestquest, currentProgress: sheet.QuestBar.position, maxProgress: sheet.QuestBar.max, history: [...sheet.Quests] },
      Task: { description: sheet.kill, durationMs: sheet.TaskBar.max, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } },
    };
    const state = {
      character,
      progression: {
        experience: { currentSeconds: sheet.ExpBar.position, maxSeconds: sheet.ExpBar.max },
        completedTasks: sheet.tasks,
        elapsedSeconds: sheet.elapsed,
      },
    };
    const rng = new RandomGenerator('legacy-level-up');
    rng.setState([...sheet.seed] as [number, number, number, number]);

    const result = advanceGame(state, sheet.TaskBar.max, rng);

    expect(result.state.character.Traits.Level).toBe(2);
    expect(result.state.character.Stats).toEqual({ STR: 10, CON: 10, DEX: 10, INT: 11, WIS: 10, CHA: 10, 'HP Max': 17, 'MP Max': 15 });
    expect(result.state.character.Spells).toEqual([{ name: 'Slime Finger', level: 1 }]);
    expect(result.state.progression.experience).toEqual({ currentSeconds: 0, maxSeconds: 1279 });
    expect(result.events).toEqual([
      { type: 'level_gained', level: 2 },
      { type: 'stat_gained', stat: 'HP Max', amount: 6 },
      { type: 'stat_gained', stat: 'MP Max', amount: 5 },
      { type: 'stat_gained', stat: 'INT', amount: 1 },
      { type: 'stat_gained', stat: 'HP Max', amount: 1 },
      { type: 'save_requested', characterName: 'Oracle' },
      { type: 'item_gained', name: 'rat tail', quantity: 1 },
      { type: 'task_started', task: result.state.character.Task },
    ]);
    expect(rng.getState()).toEqual(levelUpFixture.expected.rng);
  });

  it('matches the legacy quest-completion reward and event order', () => {
    const sheet = questFixture.input.sheet;
    const character: CharacterSheet = {
      Traits: structuredClone(sheet.Traits),
      Stats: structuredClone(sheet.Stats),
      Equip: structuredClone(sheet.Equips),
      Inventory: [],
      Spells: [],
      Gold: 0,
      Plot: { act: sheet.act, currentProgress: sheet.PlotBar.position, maxProgress: sheet.PlotBar.max },
      Quest: { description: sheet.bestquest, currentProgress: sheet.QuestBar.position, maxProgress: sheet.QuestBar.max, history: [...sheet.Quests] },
      Task: { description: sheet.kill, durationMs: sheet.TaskBar.max, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } },
    };
    const state = {
      character,
      progression: {
        experience: { currentSeconds: sheet.ExpBar.position, maxSeconds: sheet.ExpBar.max },
        completedTasks: sheet.tasks,
        elapsedSeconds: sheet.elapsed,
      },
    };
    const rng = new RandomGenerator('legacy-quest');
    rng.setState([...sheet.seed] as [number, number, number, number]);

    const result = advanceGame(state, sheet.TaskBar.max, rng);

    expect(result.state.character.Quest).toEqual({
      description: 'Exterminate the Swamp Elves',
      currentProgress: 0,
      maxProgress: 138,
      history: ['Test quest', 'Exterminate the Swamp Elves'],
      kind: 'exterminate',
      target: 'Swamp Elf|1|lilypad',
      targetIndex: 84,
    });
    expect(result.state.character.Spells).toEqual([{ name: 'Rabbit Punch', level: 1 }]);
    expect(result.events).toEqual([
      { type: 'quest_completed', description: 'Test quest' },
      { type: 'quest_started', description: 'Exterminate the Swamp Elves' },
      { type: 'save_requested', characterName: 'Oracle' },
      { type: 'item_gained', name: 'rat tail', quantity: 1 },
      { type: 'task_started', task: result.state.character.Task },
    ]);
    expect(rng.getState()).toEqual(questFixture.expected.rng);
  });

  it('sells inventory before choosing the next task', () => {
    const character = createNewCharacter('Merchant', 'Half Orc', 'Robot Monk', 802);
    character.Gold = 0;
    character.Inventory = [{ name: 'Ancient Widget', qty: 4 }];
    character.Task = { description: 'Selling loot...', durationMs: 1, elapsedMs: 0, type: 'selling' };
    const state = {
      character,
      progression: { experience: { currentSeconds: 0, maxSeconds: 10 }, completedTasks: 0, elapsedSeconds: 0 },
    };

    const result = advanceGame(state, 1, new RandomGenerator('sale-transition'));

    expect(result.state.character.Gold).toBeGreaterThanOrEqual(35);
    expect(result.state.character.Inventory).toEqual([]);
    expect(result.state.character.Task.type).toBe('buying');
    expect(result.events).toEqual([
      { type: 'inventory_sold', gold: result.state.character.Gold },
      { type: 'task_started', task: result.state.character.Task },
    ]);
  });

  it('buys equipment before choosing the next task', () => {
    const character = createNewCharacter('Buyer', 'Half Orc', 'Robot Monk', 803);
    character.Gold = 35;
    character.Inventory = [];
    character.Task = { description: 'Buying equipment...', durationMs: 1, elapsedMs: 0, type: 'buying' };

    const result = advanceGame(stateFor(character), 1, new RandomGenerator('purchase-transition'));

    expect(result.state.character.Gold).toBe(0);
    expect(result.state.character.Task.type).toBe('kill');
    expect(result.events[0]).toMatchObject({ type: 'equipment_purchased' });
  });

  it('starts the first real quest without rewarding the placeholder', () => {
    const character = createNewCharacter('Initiate', 'Half Orc', 'Robot Monk', 804);
    const initialSheet = structuredClone(character);
    character.Quest = { description: 'Heading to the killing fields...', currentProgress: 0, maxProgress: 5 };
    character.Task = { description: 'Executing test monster...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };

    const result = advanceGame(stateFor(character), 1, new RandomGenerator('first-quest'));

    expect(result.state.character.Quest.history).toEqual([result.state.character.Quest.description]);
    expect(result.events.some(({ type }) => type === 'quest_completed')).toBe(false);
    expect(result.state.character.Stats).toEqual(initialSheet.Stats);
    expect(result.state.character.Equip).toEqual(initialSheet.Equip);
    expect(result.state.character.Spells).toEqual(initialSheet.Spells);
    expect(result.state.character.Gold).toBe(initialSheet.Gold);
  });

  it('caps quest history at the legacy 100-entry boundary', () => {
    const character = createNewCharacter('Historian', 'Half Orc', 'Robot Monk', 805);
    character.Quest = {
      description: 'Newest quest',
      currentProgress: 1,
      maxProgress: 1,
      history: Array.from({ length: 100 }, (_, index) => `Quest ${index}`),
    };
    character.Task = { description: 'Executing test monster...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };

    const result = advanceGame(stateFor(character), 1, new RandomGenerator('quest-history-cap'));
    const history = result.state.character.Quest.history ?? [];

    expect(history).toHaveLength(100);
    expect(history[0]).toBe('Quest 1');
    expect(history.at(-1)).toBe(result.state.character.Quest.description);
  });

  it('returns elapsed time left after the bounded 100-task catch-up', () => {
    const character = createNewCharacter('Latecomer', 'Half Orc', 'Robot Monk', 806);
    const rng = new RandomGenerator('bounded-catch-up');

    const result = advanceGame(stateFor(character), 1_000_000_000, rng);

    expect(result.state.progression.completedTasks).toBe(100);
    expect(result.remainingElapsedMs).toBeGreaterThan(0);
    expect(result.state.character.Task.elapsedMs).toBe(0);
    const resumed = advanceGame(result.state, result.remainingElapsedMs, rng);
    expect(resumed.state.progression.completedTasks).toBe(200);
  });

  it('keeps an accepted lower-bound character valid through level-up', () => {
    const character = createNewCharacter('Boundary Hero', 'Half Orc', 'Robot Monk', 807);
    character.Stats = { STR: 1, CON: 1, DEX: 1, INT: 1, WIS: 1, CHA: 1, 'HP Max': 0.5, 'MP Max': 1.5 };
    character.Task = { description: 'Executing boundary monster...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'boundary receipt' } };
    const state = stateFor(character);
    state.progression.experience = { currentSeconds: 1, maxSeconds: 1 };
    expect(characterSheetSchema.safeParse(character).success).toBe(true);

    const result = advanceGame(state, 1, new RandomGenerator('boundary-level-up'));

    expect(result.state.character.Traits.Level).toBe(2);
    expect(characterSheetSchema.safeParse(result.state.character).success).toBe(true);
  });

  it('does not mutate the previous inventory when loot stacks', () => {
    const character = createNewCharacter('Collector', 'Half Orc', 'Robot Monk', 808);
    character.Inventory = [{ name: 'rat tail', qty: 1 }, { name: 'Unrelated Trinket', qty: 1 }];
    character.Quest = { ...character.Quest, currentProgress: 0, maxProgress: 99, history: [character.Quest.description] };
    character.Task = { description: 'Executing test monster...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };
    const snapshot = structuredClone(character.Inventory);

    const result = advanceGame(stateFor(character), 1, new RandomGenerator('stacked-loot'));

    expect(character.Inventory).toEqual(snapshot);
    expect(result.state.character.Inventory).toEqual([{ name: 'rat tail', qty: 2 }, { name: 'Unrelated Trinket', qty: 1 }]);
  });
});

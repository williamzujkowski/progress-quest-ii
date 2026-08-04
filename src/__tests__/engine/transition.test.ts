import { describe, expect, it, vi } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter, equipPrice } from '../../engine/sim';
import { advanceGame } from '../../engine/transition';
import type { CharacterSheet } from '../../engine/types';
import { MAX_PERSISTED_GOLD, MAX_PERSISTED_VALUE } from '../../data/limits';
import { activeCheckpointV1Schema, characterSheetSchema, MAX_PERSISTED_ITEMS } from '../../state/schemas';
import oneKillFixture from '../fixtures/legacy/one-kill.json';
import levelUpFixture from '../fixtures/legacy/xp-level-up.json';
import questFixture from '../fixtures/legacy/quest-completion.json';

function stateFor(character: CharacterSheet) {
  const isSequence = character.Task.type === 'loading' || character.Task.type === 'prologue' || character.Task.type === 'cinematic' || character.Task.type === 'act_marker';
  const sessionCharacter = isSequence || character.Plot.act !== 0
    ? character
    : { ...character, Plot: { act: 1, currentProgress: 0, maxProgress: 10 }, PendingTasks: undefined };
  return {
    character: sessionCharacter,
    progression: { experience: { currentSeconds: 0, maxSeconds: 10 }, completedTasks: 0, elapsedSeconds: 0 },
  };
}

describe('advanceGame', () => {
  it('creates a new session at the canonical Act 0 prologue', () => {
    const character = createNewCharacter('Prologue Oracle', 'Half Orc', 'Ur-Paladin', 800);

    expect(character).toMatchObject({
      Plot: { act: 0, currentProgress: 0, maxProgress: 26 },
      Quest: { description: 'Heading to the killing fields...', currentProgress: 0, maxProgress: 1 },
      Task: { description: 'Loading....', durationMs: 2000, elapsedMs: 0 },
      PendingTasks: [
        { description: 'Experiencing an enigmatic and foreboding night vision', durationMs: 10_000 },
        { description: "Much is revealed about that wise old bastard you'd underestimated", durationMs: 6000 },
        { description: 'A shocking series of events leaves you alone and bewildered, but resolute', durationMs: 6000 },
        { description: 'Drawing upon an unrealized reserve of determination, you set out on a long and dangerous journey', durationMs: 4000 },
        { description: 'Loading', durationMs: 2000, type: 'act_marker' },
      ],
    });
  });

  it('starts the first prologue step without advancing plot during initial loading', () => {
    const character = createNewCharacter('Prologue Oracle', 'Half Orc', 'Ur-Paladin', 800);

    const result = advanceGame(stateFor(character), 2000, new RandomGenerator('unused-prologue-rng'));

    expect(result.state.character.Plot).toEqual({ act: 0, currentProgress: 0, maxProgress: 26 });
    expect(result.state.character.Task).toMatchObject({
      description: 'Experiencing an enigmatic and foreboding night vision...',
      durationMs: 10_000,
      elapsedMs: 0,
      type: 'prologue',
    });
    expect(result.state.character.PendingTasks).toHaveLength(4);
  });

  it('runs the complete prologue through the Act I marker without consuming RNG', () => {
    const character = createNewCharacter('Prologue Oracle', 'Half Orc', 'Ur-Paladin', 800);
    const rng = new RandomGenerator('prologue-continuation');
    const initialRng = rng.getState();

    const atMarker = advanceGame(stateFor(character), 28_000, rng);

    expect(atMarker.state.progression).toMatchObject({ completedTasks: 5, elapsedSeconds: 28 });
    expect(atMarker.state.character.Plot).toEqual({ act: 1, currentProgress: 0, maxProgress: 21_600 });
    expect(atMarker.state.character.Task).toMatchObject({ description: 'Loading Act I...', durationMs: 2000, type: 'act_marker' });
    expect(atMarker.state.character.PendingTasks).toBeUndefined();
    expect(atMarker.events).toContainEqual({ type: 'act_completed', act: 0 });
    expect(rng.getState()).toEqual(initialRng);

    const afterMarker = advanceGame(atMarker.state, 2000, rng);

    expect(afterMarker.state.progression).toMatchObject({ completedTasks: 6, elapsedSeconds: 30 });
    expect(afterMarker.state.character.Task).toMatchObject({ description: 'Heading to the killing fields...', durationMs: 4000, type: 'heading' });
    expect(rng.getState()).toEqual(initialRng);
  });

  it.each([
    {
      condition: 'encumbered',
      arrange: (character: CharacterSheet) => {
        character.Inventory = [{ name: 'Bureaucratic Ballast', qty: 20 }];
      },
      expected: { description: 'Heading to market to sell loot...', durationMs: 4000, type: 'heading_to_market' },
    },
    {
      condition: 'wealthy',
      arrange: (character: CharacterSheet) => {
        character.Gold = equipPrice(character.Traits.Level) + 1;
      },
      expected: { description: 'Negotiating purchase of better equipment...', durationMs: 5000, type: 'buying' },
    },
  ])('schedules the canonical $condition route after an Act marker', ({ arrange, expected }) => {
    const character = createNewCharacter('Route Oracle', 'Half Orc', 'Ur-Paladin', 800);
    character.Plot = { act: 1, currentProgress: 0, maxProgress: 21_600 };
    character.Task = { description: 'Loading Act I...', durationMs: 1000, elapsedMs: 0, type: 'act_marker' };
    character.PendingTasks = undefined;
    arrange(character);

    const result = advanceGame(stateFor(character), 1000, new RandomGenerator('unused-route-rng'));

    expect(result.state.character.Task).toMatchObject(expected);
  });

  it('waits for the next kill after plot progress first reaches its maximum', () => {
    const character = createNewCharacter('Patient Oracle', 'Half Orc', 'Ur-Paladin', 800);
    character.Plot = { act: 1, currentProgress: 4, maxProgress: 5 };
    character.Quest = { description: 'Test quest', currentProgress: 0, maxProgress: 100, history: ['Test quest'] };
    character.Task = { description: 'Executing a Rat...', durationMs: 1000, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };
    character.PendingTasks = undefined;
    const rng = new RandomGenerator('plot-edge');

    const result = advanceGame(stateFor(character), 1000, rng);

    expect(result.state.character.Plot.currentProgress).toBe(5);
    expect(result.state.character.Task.type).toBe('kill');
    expect(result.state.character.PendingTasks).toBeUndefined();
  });

  it.each([
    {
      branch: 'oasis',
      rngState: [0.719665847485885, 0.8004722977057099, 0.017481706803664565, 1] as [number, number, number, number],
      first: 'Exhausted, you arrive at a friendly oasis in a hostile land...',
      pending: [
        'You greet old friends and meet new allies',
        'You are privy to a council of powerful do-gooders',
        'There is much to be done. You are chosen!',
        'Loading',
      ],
      finalRng: [0.8004722977057099, 0.017481706803664565, 0.15356952929869294, 1505281],
    },
    {
      branch: 'nemesis',
      rngState: [0.8487152096349746, 0.6674839127808809, 0.22826107195578516, 1] as [number, number, number, number],
      first: 'Your quarry is in sight, but a mighty enemy bars your path!...',
      pending: [
        'A desperate struggle commences with Oomuz the Hell Hound',
        'Oomuz the Hell Hound seems to have the upper hand',
        'Victory! Oomuz the Hell Hound is slain! Exhausted, you lose consciousness',
        'You awake in a friendly place, but the road awaits',
        'Loading',
      ],
      finalRng: [0.6513712389860302, 0.47102646343410015, 0.3233566232956946, 1335114],
    },
    {
      branch: 'double-dealer',
      rngState: [0.6487525827251375, 0.627493878826499, 0.8949407478794456, 1] as [number, number, number, number],
      first: "Oh sweet relief! You've reached the kind protection of King Frudem of Krabgrout...",
      pending: [
        'There is rejoicing, and an unnerving encounter with King Frudem of Krabgrout in private',
        'You forget your toothpick and go back to get it',
        "What's this!? You overhear something shocking!",
        'Could King Frudem of Krabgrout be a dirty double-dealer?',
        'Who can possibly be trusted with this news!? -- Oh yes, of course',
        'Loading',
      ],
      finalRng: [0.8845338865648955, 0.3499606167897582, 0.9144386406987906, 1343975],
    },
  ])('starts the canonical $branch interplot branch with legacy RNG order', ({ rngState, first, pending, finalRng }) => {
    const character = createNewCharacter('Oracle', 'Half Orc', 'Ur-Paladin', 800);
    character.Plot = { act: 1, currentProgress: 10, maxProgress: 10 };
    character.Quest = { description: 'Test quest', currentProgress: 0, maxProgress: 100, history: ['Test quest'] };
    character.Task = { description: 'Executing a Rat...', durationMs: 1000, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };
    character.PendingTasks = [];
    const rng = new RandomGenerator('interplot-oracle');
    rng.setState(rngState);

    const result = advanceGame(stateFor(character), 1000, rng);

    expect(result.state.character.Task).toMatchObject({ description: first, type: 'cinematic' });
    expect(result.state.character.PendingTasks?.map(({ description }) => description)).toEqual(pending);
    expect(rng.getState()).toEqual(finalRng);
  });

  it('keeps a maximum-Act nemesis sequence compact while replaying every canonical round', () => {
    const character = createNewCharacter('Endless Oracle', 'Half Orc', 'Ur-Paladin', 800);
    character.Plot = { act: MAX_PERSISTED_VALUE, currentProgress: 10, maxProgress: 10 };
    character.Quest = { description: 'Test quest', currentProgress: 0, maxProgress: 100, history: ['Test quest'] };
    character.Task = { description: 'Executing a Rat...', durationMs: 1000, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };
    character.PendingTasks = undefined;
    const rng = new RandomGenerator('endless-cinematic-oracle');
    rng.setState([0.8487152096349746, 0.6674839127808809, 0.22826107195578516, 1]);

    const opened = advanceGame(stateFor(character), 1000, rng);
    const cursor = opened.state.character.PendingTasks?.find(({ type }) => type === 'nemesis_cursor');
    expect(cursor).toMatchObject({ type: 'nemesis_cursor', rollLimit: MAX_PERSISTED_VALUE + 2 });
    if (!cursor || cursor.type !== 'nemesis_cursor') throw new Error('Expected a compact nemesis cursor');
    expect(cursor.remainingRounds).toBeGreaterThan(96);
    expect(opened.state.character.PendingTasks).toHaveLength(5);
    expect(characterSheetSchema.safeParse(opened.state.character).success).toBe(true);
    const canonicalContinuation = rng.getState();

    const atStruggle = advanceGame(opened.state, 1000, rng);
    const firstRound = advanceGame(atStruggle.state, 4000, rng);
    const nextCursor = firstRound.state.character.PendingTasks?.[0];
    expect(firstRound.state.character.Task.type).toBe('cinematic');
    expect(nextCursor).toMatchObject({
      type: 'nemesis_cursor',
      remainingRounds: cursor.remainingRounds - 1,
      continuationRngState: canonicalContinuation,
    });
    expect(rng.getState()).toEqual(canonicalContinuation);
    expect(characterSheetSchema.safeParse(firstRound.state.character).success).toBe(true);
  });

  it('awards random-star loot before generating the remaining nemesis cinematic', () => {
    const character = createNewCharacter('Oracle', 'Half Orc', 'Ur-Paladin', 800);
    character.Plot = { act: 1, currentProgress: 10, maxProgress: 10 };
    character.Quest = { description: 'Test quest', currentProgress: 0, maxProgress: 100, history: ['Test quest'] };
    character.Task = { description: 'Executing a Black Dragon...', durationMs: 1000, elapsedMs: 0, type: 'kill', loot: { type: 'random' } };
    character.PendingTasks = undefined;
    const rng = new RandomGenerator('random-star-cinematic');
    rng.setState([0.8487152096349746, 0.6674839127808809, 0.22826107195578516, 1]);

    const result = advanceGame(stateFor(character), 1000, rng);

    expect(result.state.character.Inventory).toContainEqual({ name: 'Proverbial Tome of Guile', qty: 1 });
    expect(result.state.character.PendingTasks?.map(({ description }) => description)).toEqual([
      'A desperate struggle commences with Zouvjaen the Wraith',
      'Zouvjaen the Wraith seems to have the upper hand',
      'Locked in grim combat with Zouvjaen the Wraith',
      'Victory! Zouvjaen the Wraith is slain! Exhausted, you lose consciousness',
      'You awake in a friendly place, but the road awaits',
      'Loading',
    ]);
    expect(rng.getState()).toEqual([0.03230942226946354, 0.7913503504823893, 0.7409795469138771, 678575]);
  });

  it('uses the canonical three-part item table for random-star loot', () => {
    const character = createNewCharacter('Oracle', 'Half Orc', 'Ur-Paladin', 800);
    character.Plot = { act: 1, currentProgress: 10, maxProgress: 10 };
    character.Quest = { description: 'Test quest', currentProgress: 0, maxProgress: 100, history: ['Test quest'] };
    character.Task = { description: 'Executing a Black Dragon...', durationMs: 1000, elapsedMs: 0, type: 'kill', loot: { type: 'random' } };
    character.PendingTasks = undefined;
    const rng = new RandomGenerator('random-star-item-oracle');
    rng.setState([0, 0, 0, 0]);

    const result = advanceGame(stateFor(character), 1000, rng);

    expect(result.state.character.Inventory).toContainEqual({ name: 'Golden Diadem of Foreboding', qty: 1 });
    expect(rng.getState()).toEqual([0, 0, 0, 0]);
  });

  it('completes Act I with typed reward events in canonical RNG order', () => {
    const character = createNewCharacter('Oracle', 'Half Orc', 'Ur-Paladin', 800);
    character.Plot = { act: 1, currentProgress: 1000, maxProgress: 1000 };
    character.Task = { description: 'There is much to be done. You are chosen!...', durationMs: 1000, elapsedMs: 0, type: 'cinematic' };
    character.PendingTasks = [{ description: 'Loading', durationMs: 1000, elapsedMs: 0, type: 'act_marker' }];
    character.Inventory = [];
    const rng = new RandomGenerator('act-reward-oracle');
    rng.setState([0.34067121776752174, 0.28646080009639263, 0.8245062702335417, 1]);

    const result = advanceGame(stateFor(character), 1000, rng);

    expect(result.state.character.Plot).toEqual({ act: 2, currentProgress: 0, maxProgress: 39_600 });
    expect(result.state.character.Inventory).toContainEqual({ name: 'Unearthly Candelabra of Silence', qty: 1 });
    expect(result.state.character.Equip.Helm).toBe('Lace');
    expect(result.events).toEqual([
      { type: 'act_completed', act: 1 },
      { type: 'item_gained', name: 'Unearthly Candelabra of Silence', quantity: 1 },
      { type: 'equipment_gained', slot: 'Helm', name: 'Lace' },
      { type: 'save_requested', characterName: 'Oracle' },
      { type: 'task_started', task: result.state.character.Task },
    ]);
    expect(rng.getState()).toEqual([0.06199767650105059, 0.7019953967537731, 0.5525467498227954, 439734]);

    const actTwo = structuredClone(result.state.character);
    actTwo.Plot.currentProgress = actTwo.Plot.maxProgress;
    actTwo.Task = { description: 'The sequel continues despite precedent...', durationMs: 1000, elapsedMs: 0, type: 'cinematic' };
    actTwo.PendingTasks = [{ description: 'Loading', durationMs: 1000, elapsedMs: 0, type: 'act_marker' }];
    const actThree = advanceGame({ character: actTwo, progression: result.state.progression }, 1000, rng);

    expect(actThree.state.character.Plot).toEqual({ act: 3, currentProgress: 0, maxProgress: 57_600 });
    expect(actThree.events).toContainEqual({ type: 'act_completed', act: 2 });
    expect(actThree.events.filter(({ type }) => type === 'item_gained' || type === 'gold_received')).toHaveLength(1);
    expect(actThree.events.filter(({ type }) => type === 'equipment_gained')).toHaveLength(1);
    expect(characterSheetSchema.safeParse(actThree.state.character).success).toBe(true);
  });

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

  it('reports the actual fractional secondary-stat gain during level-up', () => {
    const character = createNewCharacter('Fractional Hero', 'Half Orc', 'Robot Monk', 813);
    character.Stats = { STR: 10, CON: 10, DEX: 10, INT: 10, WIS: 10, CHA: 10, 'HP Max': 10.5, 'MP Max': 10 };
    character.Task = { description: 'Executing a fraction...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'partial receipt' } };
    const state = stateFor(character);
    state.progression.experience = { currentSeconds: 1, maxSeconds: 1 };
    const rng = new RandomGenerator('legacy-level-up');
    rng.setState([...levelUpFixture.input.sheet.seed] as [number, number, number, number]);

    const result = advanceGame(state, 1, rng);

    expect(result.events.filter((event) => event.type === 'stat_gained')).toEqual([
      { type: 'stat_gained', stat: 'HP Max', amount: 6 },
      { type: 'stat_gained', stat: 'MP Max', amount: 5 },
      { type: 'stat_gained', stat: 'INT', amount: 1 },
      { type: 'stat_gained', stat: 'HP Max', amount: 0.5 },
    ]);
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
    character.Plot = { act: 1, currentProgress: 0, maxProgress: 10 };
    character.PendingTasks = undefined;
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

  it('keeps an accepted maximum gold balance valid when selling inventory', () => {
    const character = createNewCharacter('Treasurer', 'Half Orc', 'Robot Monk', 810);
    character.Gold = MAX_PERSISTED_GOLD;
    character.Inventory = [{ name: 'Auditor bait', qty: MAX_PERSISTED_VALUE }];
    character.Task = { description: 'Selling loot...', durationMs: 1, elapsedMs: 0, type: 'selling' };
    character.Plot = { act: 1, currentProgress: 0, maxProgress: 10 };
    character.PendingTasks = undefined;
    expect(characterSheetSchema.safeParse(character).success).toBe(true);

    const result = advanceGame(stateFor(character), 1, new RandomGenerator('maximum-sale'));

    expect(result.state.character.Gold).toBe(MAX_PERSISTED_GOLD);
    expect(result.events[0]).toEqual({ type: 'inventory_sold', gold: 0 });
    expect(characterSheetSchema.safeParse(result.state.character).success).toBe(true);
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

  it('bounds next-task RNG work above the last finite progression level', () => {
    const expectedRandomCalls = 7_150;
    const generateAtMaximumLevel = () => {
      const character = createNewCharacter('Patient Hero', 'Half Orc', 'Robot Monk', 812);
      character.Traits.Level = MAX_PERSISTED_VALUE;
      character.Inventory = [];
      character.Gold = 0;
      character.Task = { description: 'Finishing administrative warm-up...', durationMs: 1, elapsedMs: 0, type: 'heading' };
      const rng = new RandomGenerator('bounded-monster-work');
      const originalRandom = rng.random.bind(rng);
      let randomCalls = 0;
      vi.spyOn(rng, 'random').mockImplementation((limit) => {
        randomCalls += 1;
        if (randomCalls > expectedRandomCalls) throw new RangeError('Monster-task RNG budget exceeded');
        return originalRandom(limit);
      });

      const result = advanceGame(stateFor(character), 1, rng);

      return { result, rngState: rng.getState(), randomCalls };
    };

    const first = generateAtMaximumLevel();
    const replay = generateAtMaximumLevel();

    expect(first.randomCalls).toBe(expectedRandomCalls);
    expect(characterSheetSchema.safeParse(first.result.state.character).success).toBe(true);
    expect(replay).toEqual(first);
  });

  it('keeps an accepted lower-bound character valid through level-up', () => {
    const character = createNewCharacter('Boundary Hero', 'Half Orc', 'Robot Monk', 807);
    character.Stats = { STR: 1, CON: 1, DEX: 1, INT: 1, WIS: 1, CHA: 1, 'HP Max': 0.5, 'MP Max': 1.5 };
    character.Task = { description: 'Executing boundary monster...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'boundary receipt' } };
    character.Plot = { act: 1, currentProgress: 0, maxProgress: 10 };
    character.PendingTasks = undefined;
    const state = stateFor(character);
    state.progression.experience = { currentSeconds: 1, maxSeconds: 1 };
    expect(characterSheetSchema.safeParse(character).success).toBe(true);

    const result = advanceGame(state, 1, new RandomGenerator('boundary-level-up'));

    expect(result.state.character.Traits.Level).toBe(2);
    expect(characterSheetSchema.safeParse(result.state.character).success).toBe(true);
  });

  it('keeps an accepted maximum session valid through level-up and loot', () => {
    const character = createNewCharacter('Boundary Hero', 'Half Orc', 'Robot Monk', 809);
    character.Traits.Level = MAX_PERSISTED_VALUE;
    character.Stats = {
      STR: MAX_PERSISTED_VALUE,
      CON: MAX_PERSISTED_VALUE,
      DEX: MAX_PERSISTED_VALUE,
      INT: MAX_PERSISTED_VALUE,
      WIS: MAX_PERSISTED_VALUE,
      CHA: MAX_PERSISTED_VALUE,
      'HP Max': MAX_PERSISTED_VALUE,
      'MP Max': MAX_PERSISTED_VALUE,
    };
    character.Inventory = [
      { name: 'rat tail', qty: MAX_PERSISTED_VALUE },
      { name: 'bureaucratic ballast', qty: MAX_PERSISTED_VALUE },
    ];
    character.Spells = Array.from({ length: MAX_PERSISTED_ITEMS }, () => ({ name: 'Already Accounted For', level: MAX_PERSISTED_VALUE }));
    character.Gold = MAX_PERSISTED_GOLD;
    character.Quest = {
      description: 'Remain numerically respectable',
      currentProgress: MAX_PERSISTED_VALUE,
      maxProgress: MAX_PERSISTED_VALUE,
      history: ['Remain numerically respectable'],
    };
    character.Plot = { act: MAX_PERSISTED_VALUE, currentProgress: MAX_PERSISTED_VALUE, maxProgress: MAX_PERSISTED_VALUE };
    character.PendingTasks = undefined;
    character.Task = { description: 'Executing a boundary condition...', durationMs: 1000, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };
    const state = {
      character,
      progression: {
        experience: { currentSeconds: 1, maxSeconds: 1 },
        completedTasks: MAX_PERSISTED_VALUE,
        elapsedSeconds: MAX_PERSISTED_VALUE,
      },
    };
    const rng = new RandomGenerator('maximum-transition');
    const checkpoint = () => ({
      schemaVersion: 1 as const,
      session: { ...state, rngState: rng.getState(), isPaused: false, log: [] },
    });
    expect(activeCheckpointV1Schema.safeParse(checkpoint()).success).toBe(true);

    const result = advanceGame(state, 1000, rng);

    const parsed = activeCheckpointV1Schema.safeParse({
      schemaVersion: 1,
      session: { ...result.state, rngState: rng.getState(), isPaused: false, log: [] },
    });
    expect(parsed.success, parsed.error?.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('\n')).toBe(true);
    expect(result.events.filter(({ type }) => type === 'level_gained' || type === 'stat_gained')).toEqual([]);
    expect(result.events.some((event) => event.type === 'item_gained' && event.name === 'rat tail')).toBe(false);

    const headroomState = structuredClone(state);
    headroomState.character.Traits.Level = MAX_PERSISTED_VALUE - 1;
    for (const stat of Object.keys(headroomState.character.Stats) as Array<keyof CharacterSheet['Stats']>) {
      headroomState.character.Stats[stat] = MAX_PERSISTED_VALUE / 2;
    }
    headroomState.character.Inventory = headroomState.character.Inventory.map((item) => ({ ...item, qty: MAX_PERSISTED_VALUE - 1 }));
    headroomState.progression.completedTasks = MAX_PERSISTED_VALUE - 1;
    headroomState.progression.elapsedSeconds = MAX_PERSISTED_VALUE - 1;
    const headroomRng = new RandomGenerator('maximum-transition');

    advanceGame(headroomState, 1000, headroomRng);

    expect(headroomRng.getState()).toEqual(rng.getState());
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

  it('keeps a full accepted inventory valid when new loot drops', () => {
    const character = createNewCharacter('Collector', 'Half Orc', 'Robot Monk', 811);
    character.Inventory = Array.from({ length: MAX_PERSISTED_ITEMS }, (_, index) => ({ name: `Item ${index}`, qty: 1 }));
    character.Task = { description: 'Executing test monster...', durationMs: 1, elapsedMs: 0, type: 'kill', loot: { type: 'fixed', item: 'one item too many' } };
    character.Plot = { act: 1, currentProgress: 0, maxProgress: 10 };
    character.PendingTasks = undefined;
    expect(characterSheetSchema.safeParse(character).success).toBe(true);

    const result = advanceGame(stateFor(character), 1, new RandomGenerator('full-inventory'));

    expect(result.state.character.Inventory).toHaveLength(MAX_PERSISTED_ITEMS);
    expect(characterSheetSchema.safeParse(result.state.character).success).toBe(true);
    expect(result.events.some(({ type }) => type === 'item_gained')).toBe(false);
  });
});

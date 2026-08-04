import { addInventoryItem, applyQuestReward, applySpellReward, calculateEncumbrance, equipPrice, generateEquipUpgrade, generateItemReward, generateQuest, generateStatReward, generateTaskDescription } from './sim';
import { BORING_ITEMS, IMPRESSIVE_TITLES, MONSTERS, RACES } from '../data/traits';
import { MAX_PENDING_TASKS, MAX_PERSISTED_GOLD, MAX_PERSISTED_VALUE } from '../data/limits';
import { calculateEncumbranceMax, generateName, levelUpTime } from './math';
import type { RandomGenerator } from './prng';
import { plural } from './text';
import type { CharacterSheet, EquipSlot, NemesisSequenceCursor, PendingSequenceEntry, ProgressionState, ProgressTask, SequenceTask, StatName } from './types';

export interface GameTransitionState {
  character: CharacterSheet;
  progression: ProgressionState;
}

export type GameTransitionEvent =
  | { type: 'level_gained'; level: number }
  | { type: 'stat_gained'; stat: StatName; amount: number }
  | { type: 'quest_completed'; description: string }
  | { type: 'quest_started'; description: string }
  | { type: 'save_requested'; characterName: string }
  | { type: 'item_gained'; name: string; quantity: number }
  | { type: 'gold_received'; amount: number }
  | { type: 'inventory_sold'; gold: number }
  | { type: 'equipment_purchased'; slot: EquipSlot; name: string }
  | { type: 'equipment_gained'; slot: EquipSlot; name: string }
  | { type: 'act_completed'; act: number }
  | { type: 'task_started'; task: ProgressTask };

export interface GameTransitionResult {
  state: GameTransitionState;
  events: GameTransitionEvent[];
  remainingElapsedMs: number;
}

const MAX_CATCH_UP_TASKS = 100;

type CinematicOpening =
  | { branch: 0; first: SequenceTask }
  | { branch: 1; first: SequenceTask }
  | { branch: 2; first: SequenceTask; patron: string };

function sequenceTask(description: string, durationSeconds: number, type: SequenceTask['type'] = 'cinematic'): SequenceTask {
  return { description, durationMs: durationSeconds * 1000, elapsedMs: 0, type };
}

function activeSequenceTask(task: SequenceTask): ProgressTask {
  return { ...task, description: `${task.description}...` };
}

function impressiveGuy(rng: RandomGenerator): string {
  if (rng.random(2)) return `the ${rng.pick(IMPRESSIVE_TITLES)} of the ${plural(rng.pick(RACES).name)}`;
  return `${rng.pick(IMPRESSIVE_TITLES)} ${generateName(rng)} of ${generateName(rng)}`;
}

function beginInterplotCinematic(rng: RandomGenerator): CinematicOpening {
  switch (rng.random(3)) {
    case 0: return { branch: 0, first: sequenceTask('Exhausted, you arrive at a friendly oasis in a hostile land', 1) };
    case 1: return { branch: 1, first: sequenceTask('Your quarry is in sight, but a mighty enemy bars your path!', 1) };
    case 2: {
      const patron = impressiveGuy(rng);
      return { branch: 2, patron, first: sequenceTask(`Oh sweet relief! You've reached the kind protection of ${patron}`, 2) };
    }
    default: throw new RangeError('Interplot branch is outside the legacy table');
  }
}

function namedMonster(rng: RandomGenerator, level: number): string {
  let best = rng.pick(MONSTERS);
  for (let attempt = 1; attempt < 5; attempt += 1) {
    const candidate = rng.pick(MONSTERS);
    if (Math.abs(level - candidate.level) < Math.abs(level - best.level)) best = candidate;
  }
  return `${generateName(rng)} the ${best.name}`;
}

function nemesisRoundTask(nemesis: string, advantageMod3: number): SequenceTask {
  if (advantageMod3 === 0) return sequenceTask(`Locked in grim combat with ${nemesis}`, 2);
  if (advantageMod3 === 1) return sequenceTask(`${nemesis} seems to have the upper hand`, 2);
  return sequenceTask(`You seem to gain the advantage over ${nemesis}`, 2);
}

function replayNemesisRound(cursor: NemesisSequenceCursor, rng: RandomGenerator): { task?: SequenceTask; cursor?: NemesisSequenceCursor } {
  rng.setState(cursor.replayRngState);
  if (cursor.round > rng.random(cursor.rollLimit)) return {};
  const advantageMod3 = (cursor.advantageMod3 + 1 + rng.random(2)) % 3;
  return {
    task: nemesisRoundTask(cursor.nemesis, advantageMod3),
    cursor: {
      ...cursor,
      round: cursor.round + 1,
      advantageMod3,
      replayRngState: rng.getState(),
    },
  };
}

function finishInterplotCinematic(rng: RandomGenerator, act: number, level: number, opening: CinematicOpening): PendingSequenceEntry[] {
  if (opening.branch === 0) {
    return [
      sequenceTask('You greet old friends and meet new allies', 2),
      sequenceTask('You are privy to a council of powerful do-gooders', 2),
      sequenceTask('There is much to be done. You are chosen!', 1),
      sequenceTask('Loading', 1, 'act_marker'),
    ];
  }
  if (opening.branch === 1) {
    const nemesis = namedMonster(rng, level + 3);
    let advantageMod3 = rng.random(3);
    const materializedRounds: SequenceTask[] = [];
    const maxRounds = MAX_PENDING_TASKS - 4;
    for (let round = 1; round < maxRounds; round += 1) {
      if (round > rng.random(act + 2)) {
        return [
          sequenceTask(`A desperate struggle commences with ${nemesis}`, 4),
          ...materializedRounds,
          sequenceTask(`Victory! ${nemesis} is slain! Exhausted, you lose consciousness`, 3),
          sequenceTask('You awake in a friendly place, but the road awaits', 2),
          sequenceTask('Loading', 1, 'act_marker'),
        ];
      }
      advantageMod3 = (advantageMod3 + 1 + rng.random(2)) % 3;
      materializedRounds.push(nemesisRoundTask(nemesis, advantageMod3));
    }
    const ending = [
      sequenceTask(`Victory! ${nemesis} is slain! Exhausted, you lose consciousness`, 3),
      sequenceTask('You awake in a friendly place, but the road awaits', 2),
      sequenceTask('Loading', 1, 'act_marker'),
    ];
    const openingTask = sequenceTask(`A desperate struggle commences with ${nemesis}`, 4);
    return [openingTask, ...materializedRounds, {
      description: `Continuing the regrettably extensive struggle with ${nemesis}`,
      type: 'nemesis_cursor',
      nemesis,
      round: maxRounds,
      advantageMod3,
      rollLimit: act + 2,
      replayRngState: rng.getState(),
    }, ...ending];
  }
  return [
    sequenceTask(`There is rejoicing, and an unnerving encounter with ${opening.patron} in private`, 3),
    sequenceTask(`You forget your ${rng.pick(BORING_ITEMS)} and go back to get it`, 2),
    sequenceTask("What's this!? You overhear something shocking!", 2),
    sequenceTask(`Could ${opening.patron} be a dirty double-dealer?`, 2),
    sequenceTask('Who can possibly be trusted with this news!? -- Oh yes, of course', 3),
    sequenceTask('Loading', 1, 'act_marker'),
  ];
}

function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [[10_000, 'T'], [9000, 'MT'], [5000, 'A'], [4000, 'MA'], [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let remaining = value;
  let result = '';
  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      remaining -= amount;
      result += numeral;
    }
  }
  return result || 'N';
}

function actLabel(act: number): string {
  // ponytail: legacy Roman output is unbounded; decimal keeps accepted synthetic Acts within save limits.
  return act > 10_000 ? String(act) : toRoman(act);
}

export function advanceGame(state: GameTransitionState, elapsedMs: number, rng: RandomGenerator): GameTransitionResult {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return { state, events: [], remainingElapsedMs: 0 };

  let current = state;
  let remainingElapsedMs = elapsedMs;
  const events: GameTransitionEvent[] = [];

  for (let completedTasks = 0; completedTasks < MAX_CATCH_UP_TASKS; completedTasks += 1) {
    const { character, progression } = current;
    const task = { ...character.Task, elapsedMs: character.Task.elapsedMs + remainingElapsedMs };
    if (task.elapsedMs < task.durationMs) {
      return {
        state: { character: { ...character, Task: task }, progression },
        events,
        remainingElapsedMs: 0,
      };
    }

    remainingElapsedMs = task.elapsedMs - task.durationMs;
    const progressDelta = task.durationMs / 1000;
    let traits = { ...character.Traits };
    let stats = { ...character.Stats };
    let spells = [...character.Spells];
    let experience = { ...progression.experience };
    if (task.type === 'kill') {
      if (experience.currentSeconds < experience.maxSeconds) {
        experience.currentSeconds = Math.min(experience.maxSeconds, experience.currentSeconds + progressDelta);
      } else {
        const nextLevel = Math.min(MAX_PERSISTED_VALUE, traits.Level + 1);
        if (nextLevel > traits.Level) events.push({ type: 'level_gained', level: nextLevel });
        traits.Level = nextLevel;

        const hpGain = Math.floor(stats.CON / 3) + 1 + rng.random(4);
        const nextHpMax = Math.min(MAX_PERSISTED_VALUE, stats['HP Max'] + hpGain);
        if (nextHpMax > stats['HP Max']) events.push({ type: 'stat_gained', stat: 'HP Max', amount: nextHpMax - stats['HP Max'] });
        stats['HP Max'] = nextHpMax;

        const mpGain = Math.floor(stats.INT / 3) + 1 + rng.random(4);
        const nextMpMax = Math.min(MAX_PERSISTED_VALUE, stats['MP Max'] + mpGain);
        if (nextMpMax > stats['MP Max']) events.push({ type: 'stat_gained', stat: 'MP Max', amount: nextMpMax - stats['MP Max'] });
        stats['MP Max'] = nextMpMax;

        for (let upgrades = 0; upgrades < 2; upgrades += 1) {
          const stat = generateStatReward(rng, stats);
          const nextStat = Math.min(MAX_PERSISTED_VALUE, Math.trunc(stats[stat]) + 1);
          if (nextStat !== stats[stat]) events.push({ type: 'stat_gained', stat, amount: nextStat - stats[stat] });
          stats[stat] = nextStat;
        }

        spells = applySpellReward(rng, traits.Level, stats.WIS, spells);
        experience = { currentSeconds: 0, maxSeconds: levelUpTime(traits.Level) };
        events.push({ type: 'save_requested', characterName: traits.Name });
      }
    }
    const nextProgression: ProgressionState = {
      experience,
      completedTasks: Math.min(MAX_PERSISTED_VALUE, progression.completedTasks + 1),
      elapsedSeconds: Math.min(MAX_PERSISTED_VALUE, progression.elapsedSeconds + Math.floor(progressDelta)),
    };
    let quest = { ...character.Quest };
    let plot = { ...character.Plot };
    let inventory = character.Inventory;
    let gold = character.Gold;
    let equip = { ...character.Equip };
    let pendingTasks = [...(character.PendingTasks ?? [])];
    let cinematicOpening: CinematicOpening | undefined;

    if (task.type === 'kill') {
      const questHistory = quest.history ?? [];
      const questWasComplete = quest.currentProgress >= quest.maxProgress || questHistory.length === 0;
      if (!questWasComplete) {
        quest.currentProgress = Math.min(quest.maxProgress, quest.currentProgress + progressDelta);
      } else {
        const completedQuest = quest.description;
        quest.currentProgress = 0;
        quest.maxProgress = 50 + rng.random(100);
        if (questHistory.length > 0) {
          events.push({ type: 'quest_completed', description: completedQuest });
          const reward = applyQuestReward(rng, {
            ...character,
            Traits: traits,
            Stats: stats,
            Equip: equip,
            Spells: spells,
            Inventory: inventory,
            Gold: gold,
            Quest: quest,
            Plot: plot,
            Task: task,
          });
          stats = reward.character.Stats;
          equip = reward.character.Equip;
          spells = reward.character.Spells;
          inventory = reward.character.Inventory;
          gold = reward.character.Gold;
          if (reward.effect?.type === 'stat') events.push({ type: 'stat_gained', stat: reward.effect.stat, amount: reward.effect.amount });
          else if (reward.effect?.type === 'item') events.push({ type: 'item_gained', name: reward.effect.name, quantity: reward.effect.quantity });
          else if (reward.effect?.type === 'gold') events.push({ type: 'gold_received', amount: reward.effect.amount });
        }

        const generatedQuest = generateQuest(rng, traits.Level);
        const history = [...questHistory];
        while (history.length > 99) history.shift();
        history.push(generatedQuest.description);
        quest = {
          description: generatedQuest.description,
          currentProgress: 0,
          maxProgress: quest.maxProgress,
          history,
          kind: generatedQuest.kind,
          ...('target' in generatedQuest ? { target: generatedQuest.target } : {}),
          ...('targetIndex' in generatedQuest ? { targetIndex: generatedQuest.targetIndex } : {}),
        };
        events.push({ type: 'quest_started', description: generatedQuest.description });
        events.push({ type: 'save_requested', characterName: traits.Name });
      }
      if (plot.currentProgress >= plot.maxProgress) {
        cinematicOpening = beginInterplotCinematic(rng);
        pendingTasks.push(cinematicOpening.first);
      } else {
        plot.currentProgress = Math.min(plot.maxProgress, plot.currentProgress + progressDelta);
      }

      const itemName = task.loot?.type === 'fixed'
        ? task.loot.item
        : generateItemReward(rng, ['Gold', ...inventory.filter(({ name }) => name !== 'Gold').map(({ name }) => name)]);
      if (itemName === 'Gold') {
        if (gold < MAX_PERSISTED_GOLD) {
          gold += 1;
          events.push({ type: 'gold_received', amount: 1 });
        }
      } else {
        const addedItem = addInventoryItem(inventory, itemName);
        inventory = addedItem.inventory;
        if (addedItem.added) events.push({ type: 'item_gained', name: itemName, quantity: 1 });
      }
      if (cinematicOpening) pendingTasks.push(...finishInterplotCinematic(rng, plot.act, traits.Level, cinematicOpening));
    } else if (task.type === 'selling') {
      let earned = 0;
      inventory = inventory.filter((item) => {
        if (item.name !== 'Gold') {
          earned += item.qty * (10 + rng.random(20));
          return false;
        }
        return true;
      });
      const previousGold = gold;
      gold = Math.min(MAX_PERSISTED_GOLD, gold + earned);
      events.push({ type: 'inventory_sold', gold: gold - previousGold });
    } else if (task.type === 'buying') {
      const price = equipPrice(traits.Level);
      if (gold >= price) {
        gold -= price;
        const upgrade = generateEquipUpgrade(rng, traits.Level);
        equip = { ...equip, [upgrade.slot]: upgrade.name };
        events.push({ type: 'equipment_purchased', slot: upgrade.slot, name: upgrade.name });
      }
    }
    if (task.type === 'prologue' && plot.act === 0 && plot.currentProgress < plot.maxProgress) {
      plot.currentProgress = Math.min(plot.maxProgress, plot.currentProgress + progressDelta);
    }

    let transitionedCharacter: CharacterSheet = { ...character, Traits: traits, Stats: stats, Equip: equip, Spells: spells, Inventory: inventory, Gold: gold, Quest: quest, Plot: plot, Task: task, PendingTasks: pendingTasks };
    let nextTask: ProgressTask;
    if (pendingTasks.length > 0) {
      let queuedTask = pendingTasks[0];
      if (!queuedTask) throw new Error('Pending task queue became empty while dequeuing');
      pendingTasks = pendingTasks.slice(1);
      while (queuedTask.type === 'nemesis_cursor') {
        const replayed = replayNemesisRound(queuedTask, rng);
        if (replayed.task && replayed.cursor) {
          pendingTasks = [replayed.cursor, ...pendingTasks];
          nextTask = activeSequenceTask(replayed.task);
          break;
        }
        queuedTask = pendingTasks[0];
        if (!queuedTask) throw new Error('Nemesis cursor requires a following sequence task');
        pendingTasks = pendingTasks.slice(1);
      }
      if (queuedTask.type === 'act_marker') {
        const completedAct = plot.act;
        const nextAct = Math.min(MAX_PERSISTED_VALUE, plot.act + 1);
        plot = {
          act: nextAct,
          currentProgress: 0,
          maxProgress: Math.min(MAX_PERSISTED_VALUE, 60 * 60 * (1 + 5 * nextAct)),
        };
        events.push({ type: 'act_completed', act: completedAct });
        if (nextAct > 1) {
          const itemName = generateItemReward(rng, ['Gold', ...inventory.filter(({ name }) => name !== 'Gold').map(({ name }) => name)]);
          if (itemName === 'Gold') {
            if (gold < MAX_PERSISTED_GOLD) {
              gold += 1;
              events.push({ type: 'gold_received', amount: 1 });
            }
          } else {
            const addedItem = addInventoryItem(inventory, itemName);
            inventory = addedItem.inventory;
            if (addedItem.added) events.push({ type: 'item_gained', name: itemName, quantity: 1 });
          }
          const upgrade = generateEquipUpgrade(rng, traits.Level);
          equip = { ...equip, [upgrade.slot]: upgrade.name };
          events.push({ type: 'equipment_gained', slot: upgrade.slot, name: upgrade.name });
        }
        events.push({ type: 'save_requested', characterName: traits.Name });
        nextTask = { ...queuedTask, description: `Loading Act ${actLabel(nextAct)}...` };
      } else if (queuedTask.type !== 'nemesis_cursor') {
        nextTask = activeSequenceTask(queuedTask);
      }
    } else if (task.type === 'act_marker') {
      if (calculateEncumbrance(inventory) >= calculateEncumbranceMax(stats.STR)) {
        nextTask = { description: 'Heading to market to sell loot...', durationMs: 4000, elapsedMs: 0, type: 'heading_to_market' };
      } else if (gold > equipPrice(traits.Level)) {
        nextTask = { description: 'Negotiating purchase of better equipment...', durationMs: 5000, elapsedMs: 0, type: 'buying' };
      } else {
        nextTask = { description: 'Heading to the killing fields...', durationMs: 4000, elapsedMs: 0, type: 'heading' };
      }
    } else {
      const nextTaskInfo = generateTaskDescription(rng, transitionedCharacter);
      nextTask = { ...nextTaskInfo, elapsedMs: 0 };
    }
    transitionedCharacter = { ...transitionedCharacter, Equip: equip, Inventory: inventory, Gold: gold, Plot: plot, PendingTasks: pendingTasks };
    if (pendingTasks.length === 0) delete transitionedCharacter.PendingTasks;
    events.push({ type: 'task_started', task: structuredClone(nextTask) });
    current = { character: { ...transitionedCharacter, Task: nextTask }, progression: nextProgression };

    if (remainingElapsedMs === 0) return { state: current, events, remainingElapsedMs: 0 };
  }

  return { state: current, events, remainingElapsedMs };
}

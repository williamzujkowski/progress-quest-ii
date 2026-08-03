import { applyQuestReward, applySpellReward, equipPrice, generateEquipUpgrade, generateLootItem, generateQuest, generateStatReward, generateTaskDescription } from './sim';
import { MAX_PERSISTED_GOLD, MAX_PERSISTED_ITEMS, MAX_PERSISTED_VALUE } from '../data/limits';
import { levelUpTime } from './math';
import type { RandomGenerator } from './prng';
import type { CharacterSheet, EquipSlot, ProgressionState, ProgressTask, StatName } from './types';

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
  | { type: 'task_started'; task: ProgressTask };

export interface GameTransitionResult {
  state: GameTransitionState;
  events: GameTransitionEvent[];
  remainingElapsedMs: number;
}

const MAX_CATCH_UP_TASKS = 100;

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
      if (plot.currentProgress < plot.maxProgress) plot.currentProgress = Math.min(plot.maxProgress, plot.currentProgress + progressDelta);

      const itemName = task.loot?.type === 'fixed' ? task.loot.item : generateLootItem(rng);
      const existingIndex = inventory.findIndex((item) => item.name === itemName);
      const existingItem = inventory[existingIndex];
      let itemGained = false;
      if (existingItem && existingItem.qty < MAX_PERSISTED_VALUE) {
        inventory = inventory.map((item, index) => index === existingIndex ? { ...item, qty: item.qty + 1 } : item);
        itemGained = true;
      } else if (existingIndex < 0 && inventory.length < MAX_PERSISTED_ITEMS) {
        inventory = [...inventory, { name: itemName, qty: 1 }];
        itemGained = true;
      }
      if (itemGained) events.push({ type: 'item_gained', name: itemName, quantity: 1 });
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

    const transitionedCharacter: CharacterSheet = { ...character, Traits: traits, Stats: stats, Equip: equip, Spells: spells, Inventory: inventory, Gold: gold, Quest: quest, Plot: plot, Task: task };
    const nextTaskInfo = generateTaskDescription(rng, transitionedCharacter);
    const nextTask: ProgressTask = { ...nextTaskInfo, elapsedMs: 0 };
    events.push({ type: 'task_started', task: structuredClone(nextTask) });
    current = { character: { ...transitionedCharacter, Task: nextTask }, progression: nextProgression };

    if (remainingElapsedMs === 0) return { state: current, events, remainingElapsedMs: 0 };
  }

  return { state: current, events, remainingElapsedMs };
}

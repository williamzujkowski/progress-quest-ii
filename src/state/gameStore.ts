import { create } from 'zustand';
import { calculateEncumbranceMax, levelUpTime } from '../engine/math';
import { RandomGenerator } from '../engine/prng';
import { calculateEncumbrance, createNewCharacter, generateTaskDescription } from '../engine/sim';
import { CharacterSheet, InventoryItem, ProgressTask } from '../engine/types';

export interface GameStore {
  character: CharacterSheet;
  log: string[];
  isPaused: boolean;
  rng: RandomGenerator;
  
  // Actions
  tick: (elapsedMs: number) => void;
  togglePause: () => void;
  resetGame: (name: string, race: string, klass: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialRng = new RandomGenerator('default-seed');
  const initialChar = createNewCharacter('Krg', 'Hob-Hobbit', 'Robot Monk', initialRng);

  return {
    character: initialChar,
    log: [`Welcome to Progress Quest! ${initialChar.Traits.Name} the ${initialChar.Traits.Race} ${initialChar.Traits.Class} sets out on an adventure.`],
    isPaused: false,
    rng: initialRng,

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    resetGame: (name: string, race: string, klass: string) => {
      const rng = new RandomGenerator(name + Date.now());
      const character = createNewCharacter(name, race, klass, rng);
      set({
        character,
        rng,
        log: [`Character ${name} created!`],
        isPaused: false,
      });
    },

    tick: (elapsedMs: number) => {
      const { character, isPaused, rng, log } = get();
      if (isPaused) return;

      const task = { ...character.Task };
      task.elapsedMs += elapsedMs;

      if (task.elapsedMs < task.durationMs) {
        set({
          character: {
            ...character,
            Task: task,
          },
        });
        return;
      }

      // Task complete! Process outcome
      let newLog = [...log];
      let newInventory = [...character.Inventory];
      let newGold = character.Gold;
      let newQuest = { ...character.Quest };
      let newPlot = { ...character.Plot };
      let newTraits = { ...character.Traits };
      let newStats = { ...character.Stats };

      if (task.type === 'kill') {
        const itemLoot = rng.pick(['gland', 'tail', 'claw', 'fang', 'pelt', 'bone']);
        const existing = newInventory.find((i) => i.name === itemLoot);
        if (existing) {
          existing.qty += 1;
        } else {
          newInventory.push({ name: itemLoot, qty: 1 });
        }
        newLog.unshift(`Defeated monster and looted ${itemLoot}.`);

        newQuest.currentProgress += 1;
        if (newQuest.currentProgress >= newQuest.maxProgress) {
          newQuest.currentProgress = 0;
          newQuest.maxProgress = Math.floor(newQuest.maxProgress * 1.2) + 1;
          newLog.unshift(`Quest Completed: ${newQuest.description}!`);

          newPlot.currentProgress += 1;
          if (newPlot.currentProgress >= newPlot.maxProgress) {
            newPlot.act += 1;
            newPlot.currentProgress = 0;
            newPlot.maxProgress = Math.floor(newPlot.maxProgress * 1.5);
            newLog.unshift(`Act ${newPlot.act} Unlocked!`);
          }

          newTraits.Level += 1;
          newStats.STR += 1;
          newStats.CON += 1;
          newStats['HP Max'] += 5;
          newLog.unshift(`LEVEL UP! Advanced to level ${newTraits.Level}!`);
        }
      } else if (task.type === 'selling') {
        let earned = 0;
        newInventory = newInventory.filter((item) => {
          if (item.name !== 'Gold') {
            earned += item.qty * (10 + rng.random(20));
            return false;
          }
          return true;
        });
        newGold += earned;
        newLog.unshift(`Sold loot at market for ${earned} gold!`);
      }

      // Generate next task
      const nextTaskInfo = generateTaskDescription(rng, {
        ...character,
        Inventory: newInventory,
        Stats: newStats,
        Traits: newTraits,
      });

      const nextTask: ProgressTask = {
        description: nextTaskInfo.description,
        durationMs: nextTaskInfo.durationMs,
        elapsedMs: 0,
        type: nextTaskInfo.type,
      };

      set({
        character: {
          ...character,
          Traits: newTraits,
          Stats: newStats,
          Inventory: newInventory,
          Gold: newGold,
          Quest: newQuest,
          Plot: newPlot,
          Task: nextTask,
        },
        log: newLog.slice(0, 50),
      });
    },
  };
});

import { create } from 'zustand';
import { ALL_STATS, PRIME_STATS } from '../data/traits';
import { soundFX } from './audio';
import { RandomGenerator, type PRNGSeed } from '../engine/prng';
import { createNewCharacter, equipPrice, generateEquipUpgrade, generateLootItem, generateSpellReward, generateSpellUpgrade, generateTaskDescription } from '../engine/sim';
import { indefinite } from '../engine/text';
import { levelUpTime } from '../engine/math';
import type { CharacterSheet, ProgressionState, ProgressTask, StatsMap } from '../engine/types';

type StartSessionRequest =
  | { source: 'creation'; name: string; race: string; klass: string; seed: PRNGSeed; stats?: StatsMap }
  | { source: 'import' | 'roster'; character: CharacterSheet };

export interface GameStore {
  character: CharacterSheet;
  log: string[];
  isPaused: boolean;
  rng: RandomGenerator;
  progression: ProgressionState;
  
  // Actions
  tick: (elapsedMs: number) => void;
  togglePause: () => void;
  startSession: (request: StartSessionRequest) => void;
}

const MAX_CATCH_UP_TASKS = 100;

function createProgression(level: number): ProgressionState {
  return {
    experience: { currentSeconds: 0, maxSeconds: levelUpTime(level) },
    completedTasks: 0,
    elapsedSeconds: 0,
  };
}

function gained(value: string, quantity = 1): string {
  return `Gained ${indefinite(value, quantity)}`;
}

function chooseStatUpgrade(rng: RandomGenerator, stats: StatsMap): keyof StatsMap {
  if (rng.random(2) < 1) return rng.pick(ALL_STATS);
  let roll = rng.random(PRIME_STATS.reduce((total, stat) => total + stats[stat] ** 2, 0));
  for (const stat of PRIME_STATS) {
    roll -= stats[stat] ** 2;
    if (roll < 0) return stat;
  }
  return PRIME_STATS.at(-1) ?? 'STR';
}

function upgradeSpell(rng: RandomGenerator, level: number, wisdom: number, spells: CharacterSheet['Spells']): CharacterSheet['Spells'] {
  const spellName = generateSpellReward(rng, level, wisdom);
  const existing = spells.find((spell) => spell.name === spellName);
  return existing
    ? spells.map((spell) => spell.name === spellName ? { ...spell, level: spell.level + 1 } : spell)
    : [...spells, { name: spellName, level: 1 }];
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialRng = new RandomGenerator('default-seed');
  const initialChar = createNewCharacter('Krg', 'Hob-Hobbit', 'Robot Monk', initialRng);

  return {
    character: initialChar,
    log: [`Welcome to Progress Quest! ${initialChar.Traits.Name} the ${initialChar.Traits.Race} ${initialChar.Traits.Class} sets out on an adventure.`],
    isPaused: false,
    rng: initialRng,
    progression: createProgression(initialChar.Traits.Level),

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    startSession: (request: StartSessionRequest) => {
      let character: CharacterSheet;
      let rng: RandomGenerator;
      let message: string;

      if (request.source === 'creation') {
        rng = new RandomGenerator(request.seed);
        const generated = createNewCharacter(request.name, request.race, request.klass, rng);
        character = request.stats ? { ...generated, Stats: { ...request.stats } } : generated;
        message = `Character ${request.name} created!`;
      } else {
        character = structuredClone(request.character);
        rng = new RandomGenerator(JSON.stringify(character));
        message = `Loaded character ${character.Traits.Name} from ${request.source === 'import' ? 'save data' : 'roster'}.`;
      }

      set({
        character,
        rng,
        log: [message],
        isPaused: false,
        progression: createProgression(character.Traits.Level),
      });
    },

    tick: (elapsedMs: number) => {
      if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;

      let remainingMs = elapsedMs;
      // ponytail: cap synchronous catch-up; drop older excess instead of freezing a resumed tab.
      for (let completedTasks = 0; completedTasks < MAX_CATCH_UP_TASKS; completedTasks += 1) {
        const { character, isPaused, rng, log, progression } = get();
        if (isPaused) return;

        const task = { ...character.Task };
        task.elapsedMs += remainingMs;

        if (task.elapsedMs < task.durationMs) {
          set({
            character: {
              ...character,
              Task: task,
            },
          });
          return;
        }

        remainingMs = task.elapsedMs - task.durationMs;
        const progressDelta = task.durationMs / 1000;
        let newProgression: ProgressionState = {
          experience: { ...progression.experience },
          completedTasks: progression.completedTasks + 1,
          elapsedSeconds: progression.elapsedSeconds + Math.floor(progressDelta),
        };

        // Task complete! Process outcome
        let newLog = [...log];
        let newInventory = character.Inventory;
        let newGold = character.Gold;
        let newQuest = { ...character.Quest };
        let newPlot = { ...character.Plot };
        let newTraits = { ...character.Traits };
        let newStats = { ...character.Stats };
        let newSpells = [...character.Spells];
        let newEquip = { ...character.Equip };

        if (task.type === 'kill') {
          if (newProgression.experience.currentSeconds < newProgression.experience.maxSeconds) {
            newProgression = {
              ...newProgression,
              experience: {
                ...newProgression.experience,
                currentSeconds: Math.min(newProgression.experience.maxSeconds, newProgression.experience.currentSeconds + progressDelta),
              },
            };
          } else {
            newTraits.Level += 1;
            newLog.unshift(gained('Level'));

            const hpGain = Math.floor(newStats.CON / 3) + 1 + rng.random(4);
            newStats['HP Max'] += hpGain;
            newLog.unshift(gained('HP Max', hpGain));

            const mpGain = Math.floor(newStats.INT / 3) + 1 + rng.random(4);
            newStats['MP Max'] += mpGain;
            newLog.unshift(gained('MP Max', mpGain));

            for (let upgrades = 0; upgrades < 2; upgrades += 1) {
              const stat = chooseStatUpgrade(rng, newStats);
              newStats[stat] += 1;
              newLog.unshift(gained(stat));
            }

            newSpells = upgradeSpell(rng, newTraits.Level, newStats.WIS, newSpells);
            newProgression = {
              ...newProgression,
              experience: { currentSeconds: 0, maxSeconds: levelUpTime(newTraits.Level) },
            };
            newLog.unshift(`Saving game: ${newTraits.Name}`);
            soundFX.playLevelUp();
          }
          const questWasComplete = newQuest.currentProgress >= newQuest.maxProgress;
          if (!questWasComplete) {
            newQuest.currentProgress = Math.min(newQuest.maxProgress, newQuest.currentProgress + progressDelta);
          } else {
            newQuest.currentProgress = 0;
            newQuest.maxProgress = 50 + rng.random(100);
            newQuest.history = [...(newQuest.history ?? []), newQuest.description].slice(-100);
            newLog.unshift(`Quest Completed: ${newQuest.description}!`);
            soundFX.playQuestComplete();
            newSpells = generateSpellUpgrade(rng, newSpells);

          }

          if (newPlot.currentProgress < newPlot.maxProgress) {
            newPlot.currentProgress = Math.min(newPlot.maxProgress, newPlot.currentProgress + progressDelta);
          }

          const itemLoot = task.loot?.type === 'fixed' ? task.loot.item : generateLootItem(rng);
          const existingIndex = newInventory.findIndex((item) => item.name === itemLoot);
          if (existingIndex >= 0) {
            newInventory = newInventory.map((item, index) => (index === existingIndex ? { ...item, qty: item.qty + 1 } : item));
          } else {
            newInventory = [...newInventory, { name: itemLoot, qty: 1 }];
          }
          newLog.unshift(gained(itemLoot));
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
          soundFX.playSellLoot();
        } else if (task.type === 'buying') {
          const price = equipPrice(newTraits.Level);
          if (newGold >= price) {
            newGold -= price;
            const upgrade = generateEquipUpgrade(rng, newTraits.Level);
            newEquip = { ...newEquip, [upgrade.slot]: upgrade.name };
            newLog.unshift(`Negotiated purchase: Equipped ${upgrade.name} in ${upgrade.slot} slot!`);
            soundFX.playSellLoot();
          }
        }

        // Generate next task
        const transitionedCharacter: CharacterSheet = {
          ...character,
          Traits: newTraits,
          Stats: newStats,
          Equip: newEquip,
          Spells: newSpells,
          Inventory: newInventory,
          Gold: newGold,
          Quest: newQuest,
          Plot: newPlot,
          Task: task,
        };
        const nextTaskInfo = generateTaskDescription(rng, transitionedCharacter);

        const nextTask: ProgressTask = {
          description: nextTaskInfo.description,
          durationMs: nextTaskInfo.durationMs,
          elapsedMs: 0,
          type: nextTaskInfo.type,
          loot: nextTaskInfo.loot,
        };

        newLog.unshift(nextTask.description);

        set({
          character: {
            ...transitionedCharacter,
            Task: nextTask,
          },
          log: newLog.slice(0, 50),
          progression: newProgression,
        });

        if (remainingMs === 0) return;
      }
    },
  };
});

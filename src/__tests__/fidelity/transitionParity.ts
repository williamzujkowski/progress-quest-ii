import { EQUIP_SLOTS } from '../../data/traits';
import { RandomGenerator } from '../../engine/prng';
import { calculateEncumbrance } from '../../engine/sim';
import { calculateEncumbranceMax } from '../../engine/math';
import { advanceGame } from '../../engine/transition';
import type { CharacterSheet, CharacterTraits, EquipSlot, ProgressionState, ProgressTask, StatName } from '../../engine/types';
import { describeGameEvent } from '../../state/gameEventAdapter';

type AleaState = [number, number, number, number];
type Pair<T> = [string, T];

interface LegacySheet {
  Traits: CharacterTraits;
  Stats: Record<StatName, number>;
  Equips: Record<EquipSlot, string>;
  Inventory: Pair<number>[];
  Spells: [string, string][];
  Quests: string[];
  act: number;
  bestplot: string;
  bestquest: string;
  task: string;
  queue: string[];
  tasks: number;
  elapsed: number;
  kill: string;
  PlotBar: { position: number; max: number };
  QuestBar: { position: number; max: number };
  ExpBar: { position: number; max: number };
  EncumBar: { position: number; max: number };
  TaskBar: { position: number; max: number };
  seed: AleaState;
}

interface LegacyExpected {
  counters: { tasks: number; elapsedSeconds: number };
  character: { traits: CharacterTraits; stats: Pair<number>[] };
  task: { tag: string; caption: string; maxMs: number };
  xp: { positionSeconds: number; maxSeconds: number };
  encumbrance: { positionCubits: number; maxCubits: number };
  quest: { caption: string; positionSeconds: number; maxSeconds: number; history: string[]; monster: string | null; monsterIndex: number | null };
  plot: { act: number; positionSeconds: number; maxSeconds: number };
  inventory: Pair<number>[];
  equipment: Pair<string>[];
  spells: [string, string, number][];
  log: string[];
  rng: AleaState;
}

export interface LegacyTransitionFixture {
  input: { sheet: LegacySheet };
  expected: LegacyExpected;
}

export interface EncounterTransitionObservation {
  traits: CharacterTraits;
  stats: Pair<number>[];
  inventory: Pair<number>[];
  equipment: Pair<string>[];
  spells: Pair<number>[];
  nextTask: { caption: string; durationMs: number; type: ProgressTask['type']; loot: ProgressTask['loot'] };
  events: string[];
  rng: AleaState;
  progression: {
    counters: { completedTasks: number; elapsedSeconds: number };
    experience: { currentSeconds: number; maxSeconds: number };
    encumbrance: { currentCubits: number; maxCubits: number };
    quest: { description: string; currentSeconds: number; maxSeconds: number; history: string[]; target: string | null; targetIndex: number | null };
    plot: { act: number; currentSeconds: number; maxSeconds: number };
  };
}

function assertCompletedTask(sheet: LegacySheet): void {
  if (sheet.task !== '' && sheet.task !== 'sell' && sheet.task !== 'buying' && !sheet.task.startsWith('kill|')) throw new RangeError(`Unsupported legacy task tag: ${sheet.task}`);
  if (sheet.TaskBar.position !== sheet.TaskBar.max) throw new TypeError('Legacy fixture TaskBar must start at exactly one completed task');
  if (sheet.seed.length !== 4 || !sheet.seed.every(Number.isFinite)) throw new TypeError('Legacy fixture seed must be a finite Alea tuple');
}

function romanToNumber(value: string): number {
  const digits: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1_000 };
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = digits[value[index] ?? ''] ?? 0;
    const next = digits[value[index + 1] ?? ''] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

function lootFromLegacyTask(taskTag: string): ProgressTask['loot'] {
  if (!taskTag.startsWith('kill|')) return undefined;
  const [, monsterName, , monsterDrop] = taskTag.split('|');
  if (!monsterName || !monsterDrop) throw new TypeError('Legacy fixture kill task must contain a monster and drop');
  return monsterDrop === '*'
    ? { type: 'random' }
    : { type: 'fixed', item: `${monsterName} ${monsterDrop}`.toLowerCase() };
}

function typeFromLegacyTask(task: LegacyExpected['task']): ProgressTask['type'] {
  if (task.tag.startsWith('kill|')) return 'kill';
  if (task.tag === 'sell') return 'selling';
  if (task.tag === 'buying' || task.tag === 'heading') return task.tag;
  if (task.tag === 'market') return 'heading_to_market';
  return task.caption.startsWith('Loading Act ') ? 'act_marker' : 'cinematic';
}

export function observeLegacyEncounterTransition(fixture: LegacyTransitionFixture): EncounterTransitionObservation {
  assertCompletedTask(fixture.input.sheet);
  const { expected } = fixture;
  return {
    traits: structuredClone(expected.character.traits),
    stats: structuredClone(expected.character.stats),
    inventory: structuredClone(expected.inventory),
    equipment: structuredClone(expected.equipment),
    spells: expected.spells.map(([name, , level]) => [name, level]),
    nextTask: { caption: expected.task.caption, durationMs: expected.task.maxMs, type: typeFromLegacyTask(expected.task), loot: lootFromLegacyTask(expected.task.tag) },
    events: expected.log.filter((line) => !line.startsWith('Spent ')),
    rng: [...expected.rng],
    progression: {
      counters: { completedTasks: expected.counters.tasks, elapsedSeconds: expected.counters.elapsedSeconds },
      experience: { currentSeconds: expected.xp.positionSeconds, maxSeconds: expected.xp.maxSeconds },
      encumbrance: { currentCubits: expected.encumbrance.positionCubits, maxCubits: expected.encumbrance.maxCubits },
      quest: {
        description: expected.quest.caption,
        currentSeconds: expected.quest.positionSeconds,
        maxSeconds: expected.quest.maxSeconds,
        history: [...expected.quest.history],
        target: expected.quest.monster || null,
        targetIndex: expected.quest.monsterIndex,
      },
      plot: { act: expected.plot.act, currentSeconds: expected.plot.positionSeconds, maxSeconds: expected.plot.maxSeconds },
    },
  };
}

export function observeModernEncounterTransition(fixture: LegacyTransitionFixture): EncounterTransitionObservation {
  const sheet = fixture.input.sheet;
  assertCompletedTask(sheet);
  const fixtureSnapshot = JSON.stringify(fixture);
  const rng = new RandomGenerator('legacy-fixture');
  rng.setState([...sheet.seed]);
  const gold = sheet.Inventory.find(([name]) => name === 'Gold')?.[1];
  if (gold === undefined) throw new TypeError('Legacy fixture Inventory must contain Gold');

  const pendingTasks = sheet.queue.map((entry) => {
    const [type, durationSeconds, description] = entry.split('|');
    return { description, durationMs: Number(durationSeconds) * 1000, elapsedMs: 0, type: type === 'plot' ? 'act_marker' : 'cinematic' };
  });
  const character = {
    Traits: structuredClone(sheet.Traits),
    Stats: structuredClone(sheet.Stats),
    Equip: structuredClone(sheet.Equips),
    Inventory: sheet.Inventory.filter(([name]) => name !== 'Gold').map(([name, qty]) => ({ name, qty })),
    Spells: sheet.Spells.map(([name, level]) => ({ name, level: romanToNumber(level) })),
    Gold: gold,
    Plot: { act: sheet.act, currentProgress: sheet.PlotBar.position, maxProgress: sheet.PlotBar.max },
    Quest: { description: sheet.bestquest, currentProgress: sheet.QuestBar.position, maxProgress: sheet.QuestBar.max, history: [...sheet.Quests] },
    Task: {
      description: sheet.kill,
      durationMs: sheet.TaskBar.max,
      elapsedMs: 0,
      type: sheet.task.startsWith('kill|') ? 'kill' : sheet.task === 'sell' ? 'selling' : sheet.task === 'buying' ? 'buying' : 'cinematic',
      loot: lootFromLegacyTask(sheet.task),
    },
    PendingTasks: pendingTasks,
  } as CharacterSheet;

  const input = {
    character,
    progression: {
      experience: { currentSeconds: sheet.ExpBar.position, maxSeconds: sheet.ExpBar.max },
      completedTasks: sheet.tasks,
      elapsedSeconds: sheet.elapsed,
    },
  };
  const inputSnapshot = structuredClone(input);
  const result = advanceGame(input, sheet.TaskBar.max, rng);
  const progression: ProgressionState = result.state.progression;
  const transitioned = result.state.character;
  if (result.remainingElapsedMs !== 0 || transitioned.Task.elapsedMs !== 0) throw new Error('Modern transition must complete exactly one task without overshoot');
  if (JSON.stringify(fixture) !== fixtureSnapshot) throw new Error('Modern transition mutated its legacy fixture');
  if (JSON.stringify(input) !== JSON.stringify(inputSnapshot)) throw new Error('Modern transition mutated its input state');
  return {
    traits: structuredClone(transitioned.Traits),
    stats: Object.entries(transitioned.Stats) as Pair<number>[],
    inventory: [['Gold', transitioned.Gold], ...transitioned.Inventory.map(({ name, qty }) => [name, qty] as Pair<number>)],
    equipment: EQUIP_SLOTS.map((slot) => [slot, transitioned.Equip[slot]]),
    spells: transitioned.Spells.map(({ name, level }) => [name, level]),
    nextTask: { caption: transitioned.Task.description, durationMs: transitioned.Task.durationMs, type: transitioned.Task.type, loot: transitioned.Task.loot },
    events: result.events
      .filter(({ type }) => type !== 'act_completed' && type !== 'equipment_gained' && type !== 'equipment_purchased')
      .map(describeGameEvent),
    rng: [...rng.getState()],
    progression: {
      counters: { completedTasks: progression.completedTasks, elapsedSeconds: progression.elapsedSeconds },
      experience: structuredClone(progression.experience),
      encumbrance: {
        currentCubits: calculateEncumbrance(transitioned.Inventory),
        maxCubits: calculateEncumbranceMax(transitioned.Stats.STR),
      },
      quest: {
        description: transitioned.Quest.description,
        currentSeconds: transitioned.Quest.currentProgress,
        maxSeconds: transitioned.Quest.maxProgress,
        history: [...(transitioned.Quest.history ?? [])],
        target: transitioned.Quest.target ?? null,
        targetIndex: transitioned.Quest.targetIndex ?? null,
      },
      plot: {
        act: transitioned.Plot.act,
        currentSeconds: transitioned.Plot.currentProgress,
        maxSeconds: transitioned.Plot.maxProgress,
      },
    },
  };
}

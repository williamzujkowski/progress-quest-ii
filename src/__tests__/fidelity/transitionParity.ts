import { EQUIP_SLOTS } from '../../data/traits';
import { RandomGenerator } from '../../engine/prng';
import type { CharacterSheet, CharacterTraits, EquipSlot, StatName } from '../../engine/types';
import { soundFX } from '../../state/audio';
import { useGameStore } from '../../state/gameStore';

type AleaState = [number, number, number, number];
type Pair<T> = [string, T];

interface LegacySheet {
  Traits: CharacterTraits;
  Stats: Record<StatName, number>;
  Equips: Record<EquipSlot, string>;
  Inventory: Pair<number>[];
  Spells: [string, string][];
  act: number;
  bestplot: string;
  bestquest: string;
  task: string;
  kill: string;
  PlotBar: { position: number; max: number };
  QuestBar: { position: number; max: number };
  TaskBar: { position: number; max: number };
  seed: AleaState;
}

interface LegacyExpected {
  character: { traits: CharacterTraits; stats: Pair<number>[] };
  task: { caption: string; maxMs: number };
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
  nextTask: { caption: string; durationMs: number };
  events: string[];
  rng: AleaState;
}

function assertCompletedKill(sheet: LegacySheet): void {
  if (!sheet.task.startsWith('kill|')) throw new RangeError(`Unsupported legacy task tag: ${sheet.task}`);
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

export function observeLegacyEncounterTransition(fixture: LegacyTransitionFixture): EncounterTransitionObservation {
  assertCompletedKill(fixture.input.sheet);
  const { expected } = fixture;
  return {
    traits: structuredClone(expected.character.traits),
    stats: structuredClone(expected.character.stats),
    inventory: structuredClone(expected.inventory),
    equipment: structuredClone(expected.equipment),
    spells: expected.spells.map(([name, , level]) => [name, level]),
    nextTask: { caption: expected.task.caption, durationMs: expected.task.maxMs },
    events: [...expected.log],
    rng: [...expected.rng],
  };
}

export function observeModernEncounterTransition(fixture: LegacyTransitionFixture): EncounterTransitionObservation {
  const sheet = fixture.input.sheet;
  assertCompletedKill(sheet);
  const fixtureSnapshot = JSON.stringify(fixture);
  const previousStore = useGameStore.getState();
  const previousSnapshot = {
    character: structuredClone(previousStore.character),
    log: [...previousStore.log],
    rng: previousStore.rng.getState(),
  };
  const wasMuted = soundFX.getMuted();
  const rng = new RandomGenerator('legacy-fixture');
  rng.setState([...sheet.seed]);
  const gold = sheet.Inventory.find(([name]) => name === 'Gold')?.[1];
  if (gold === undefined) throw new TypeError('Legacy fixture Inventory must contain Gold');
  const [, monsterName, , monsterDrop] = sheet.task.split('|');
  if (!monsterName || !monsterDrop) throw new TypeError('Legacy fixture kill task must contain a monster and drop');

  const character: CharacterSheet = {
    Traits: structuredClone(sheet.Traits),
    Stats: structuredClone(sheet.Stats),
    Equip: structuredClone(sheet.Equips),
    Inventory: sheet.Inventory.filter(([name]) => name !== 'Gold').map(([name, qty]) => ({ name, qty })),
    Spells: sheet.Spells.map(([name, level]) => ({ name, level: romanToNumber(level) })),
    Gold: gold,
    Plot: { act: sheet.act, currentProgress: sheet.PlotBar.position, maxProgress: sheet.PlotBar.max },
    Quest: { description: sheet.bestquest, currentProgress: sheet.QuestBar.position, maxProgress: sheet.QuestBar.max },
    Task: {
      description: sheet.kill,
      durationMs: sheet.TaskBar.max,
      elapsedMs: 0,
      type: 'kill',
      loot: monsterDrop === '*'
        ? { type: 'random' }
        : { type: 'fixed', item: `${monsterName} ${monsterDrop}`.toLowerCase() },
    },
  };

  if (!wasMuted) soundFX.toggleMute();
  try {
    useGameStore.setState({ character, log: [], isPaused: false, rng });
    useGameStore.getState().tick(sheet.TaskBar.max);
    const result = useGameStore.getState();
    if (result.character.Task.elapsedMs !== 0) throw new Error('Modern transition must complete exactly one task without overshoot');
    if (JSON.stringify(fixture) !== fixtureSnapshot) throw new Error('Modern transition mutated its legacy fixture');
    if (JSON.stringify(previousStore.character) !== JSON.stringify(previousSnapshot.character)
      || JSON.stringify(previousStore.log) !== JSON.stringify(previousSnapshot.log)
      || JSON.stringify(previousStore.rng.getState()) !== JSON.stringify(previousSnapshot.rng)) {
      throw new Error('Modern transition mutated the previous Zustand state');
    }
    return {
      traits: structuredClone(result.character.Traits),
      stats: Object.entries(result.character.Stats) as Pair<number>[],
      inventory: [['Gold', result.character.Gold], ...result.character.Inventory.map(({ name, qty }) => [name, qty] as Pair<number>)],
      equipment: EQUIP_SLOTS.map((slot) => [slot, result.character.Equip[slot]]),
      spells: result.character.Spells.map(({ name, level }) => [name, level]),
      nextTask: { caption: result.character.Task.description, durationMs: result.character.Task.durationMs },
      events: [...result.log].reverse(),
      rng: [...result.rng.getState()],
    };
  } finally {
    useGameStore.setState(previousStore, true);
    if (!wasMuted) soundFX.toggleMute();
  }
}

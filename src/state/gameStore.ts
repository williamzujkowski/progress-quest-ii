import { create } from 'zustand';
import { soundFX } from './audio';
import { describeGameEvent, soundCueForGameEvent } from './gameEventAdapter';
import { RandomGenerator, type PRNGSeed } from '../engine/prng';
import { createNewCharacter } from '../engine/sim';
import { levelUpTime } from '../engine/math';
import { advanceGame, type GameTransitionEvent } from '../engine/transition';
import type { CharacterSheet, ProgressionState, StatsMap } from '../engine/types';
import { MAX_PENDING_ELAPSED_MS, MAX_WORLD_NOTICES } from '../data/limits';
import { projectWorld, type WorldNotice } from './worldContext';

type StartSessionRequest =
  | { source: 'creation'; name: string; race: string; klass: string; seed: PRNGSeed; stats?: StatsMap }
  | { source: 'import' | 'roster'; character: CharacterSheet };

export interface GameStore {
  character: CharacterSheet;
  log: ActivityEntry[];
  worldNotices: WorldNotice[];
  nextActivityId: number;
  isPaused: boolean;
  rng: RandomGenerator;
  progression: ProgressionState;
  pendingElapsedMs: number;
  
  // Actions
  tick: (elapsedMs: number) => void;
  togglePause: () => void;
  startSession: (request: StartSessionRequest) => void;
  restoreSession: (session: {
    character: CharacterSheet;
    rngState: [number, number, number, number];
    progression: ProgressionState;
    pendingElapsedMs: number;
    isPaused: boolean;
    log: string[];
  }) => void;
}

export interface ActivityEntry {
  readonly id: number;
  readonly message: string;
}

export function createActivityEntries(messages: readonly string[], firstId: number): ActivityEntry[] {
  return messages.map((message, index) => ({ id: firstId + index, message }));
}

function createProgression(level: number): ProgressionState {
  return {
    experience: { currentSeconds: 0, maxSeconds: levelUpTime(level) },
    completedTasks: 0,
    elapsedSeconds: 0,
  };
}

function playEventSound(event: GameTransitionEvent): void {
  const cue = soundCueForGameEvent(event);
  if (cue === 'level_up') void soundFX.playLevelUp();
  else if (cue === 'quest_complete') void soundFX.playQuestComplete();
  else if (cue === 'market') void soundFX.playSellLoot();
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialRng = new RandomGenerator('default-seed');
  const initialChar = createNewCharacter('Krg', 'Hob-Hobbit', 'Robot Monk', initialRng);

  return {
    character: initialChar,
    log: createActivityEntries([`Welcome to Progress Quest II! ${initialChar.Traits.Name} the ${initialChar.Traits.Race} ${initialChar.Traits.Class} sets out on an adventure.`], 0),
    worldNotices: [],
    nextActivityId: 1,
    isPaused: false,
    rng: initialRng,
    progression: createProgression(initialChar.Traits.Level),
    pendingElapsedMs: 0,

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    startSession: (request: StartSessionRequest) => {
      const { nextActivityId } = get();
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
        log: createActivityEntries([message], nextActivityId),
        worldNotices: [],
        nextActivityId: nextActivityId + 1,
        isPaused: false,
        progression: createProgression(character.Traits.Level),
        pendingElapsedMs: 0,
      });
    },

    restoreSession: (session) => {
      const { nextActivityId } = get();
      const rng = new RandomGenerator('restored-session');
      rng.setState([...session.rngState]);
      set({
        character: structuredClone(session.character),
        rng,
        progression: structuredClone(session.progression),
        isPaused: session.isPaused,
        log: createActivityEntries(session.log.toReversed(), nextActivityId).reverse(),
        worldNotices: [],
        nextActivityId: nextActivityId + session.log.length,
        pendingElapsedMs: session.pendingElapsedMs,
      });
    },

    tick: (elapsedMs: number) => {
      if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
      const { character, isPaused, rng, log, worldNotices, nextActivityId, progression, pendingElapsedMs } = get();
      if (isPaused) return;
      const elapsedBudgetMs = Math.min(MAX_PENDING_ELAPSED_MS, pendingElapsedMs + elapsedMs);
      const result = advanceGame({ character, progression }, elapsedBudgetMs, rng);
      const sources = result.records.map((record, index) => ({ activityId: nextActivityId + index, record }));
      for (const { record } of sources) playEventSound(record.event);
      const activity = sources.map(({ activityId: id, record }) => ({ id, message: describeGameEvent(record.event) })).reverse();
      const projectedWorldNotices = sources.flatMap((source) => projectWorld({ kind: 'transition', source }).notices).toReversed();
      set({
        ...result.state,
        pendingElapsedMs: result.remainingElapsedMs,
        log: [...activity, ...log].slice(0, 50),
        worldNotices: [...projectedWorldNotices, ...worldNotices].slice(0, MAX_WORLD_NOTICES),
        nextActivityId: nextActivityId + activity.length,
      });
    },
  };
});

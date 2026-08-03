import { create } from 'zustand';
import { soundFX } from './audio';
import { describeGameEvent, soundCueForGameEvent } from './gameEventAdapter';
import { RandomGenerator, type PRNGSeed } from '../engine/prng';
import { createNewCharacter } from '../engine/sim';
import { levelUpTime } from '../engine/math';
import { advanceGame, type GameTransitionEvent } from '../engine/transition';
import type { CharacterSheet, ProgressionState, StatsMap } from '../engine/types';

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
  restoreSession: (session: {
    character: CharacterSheet;
    rngState: [number, number, number, number];
    progression: ProgressionState;
    isPaused: boolean;
    log: string[];
  }) => void;
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
  let pendingElapsedMs = 0;

  return {
    character: initialChar,
    log: [`Welcome to Progress Quest II! ${initialChar.Traits.Name} the ${initialChar.Traits.Race} ${initialChar.Traits.Class} sets out on an adventure.`],
    isPaused: false,
    rng: initialRng,
    progression: createProgression(initialChar.Traits.Level),

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    startSession: (request: StartSessionRequest) => {
      pendingElapsedMs = 0;
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

    restoreSession: (session) => {
      pendingElapsedMs = 0;
      const rng = new RandomGenerator('restored-session');
      rng.setState([...session.rngState]);
      set({
        character: structuredClone(session.character),
        rng,
        progression: structuredClone(session.progression),
        isPaused: session.isPaused,
        log: [...session.log],
      });
    },

    tick: (elapsedMs: number) => {
      if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
      const { character, isPaused, rng, log, progression } = get();
      if (isPaused) return;
      const result = advanceGame({ character, progression }, pendingElapsedMs + elapsedMs, rng);
      pendingElapsedMs = result.remainingElapsedMs;
      for (const event of result.events) playEventSound(event);
      const activity = result.events.map(describeGameEvent).reverse();
      set({ ...result.state, log: [...activity, ...log].slice(0, 50) });
    },
  };
});

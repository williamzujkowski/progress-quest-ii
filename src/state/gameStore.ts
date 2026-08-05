import { create } from 'zustand';
import { soundFX } from './audio';
import { describeDecisionReason, describeGameEvent, soundCueForGameEvent } from './gameEventAdapter';
import { RandomGenerator, type PRNGSeed } from '../engine/prng';
import { createNewCharacter } from '../engine/sim';
import { levelUpTime } from '../engine/math';
import { advanceGame, type GameTransitionEvent } from '../engine/transition';
import type { CharacterSheet, ProgressionState, StatsMap } from '../engine/types';
import { MAX_PENDING_ELAPSED_MS, MAX_SOCIAL_ENTRIES, MAX_WORLD_NOTICES } from '../data/limits';
import { projectWorld, type WorldNotice } from './worldContext';
import { projectSocialBatch, type SocialEntry } from './socialProjection';
import { EMPTY_COMMENDATIONS, mergeEvents, mergeExhibit, readCommendations, writeCommendations, type Commendations } from './commendations';

// Read once at module load, the same way the roster is read: a ledger that cannot be read is
// simply an empty one, never a reason for the game not to start.
const initialCommendations = readCommendations(
  typeof window === 'undefined' ? undefined : (() => { try { return window.localStorage; } catch { return undefined; } })(),
);

// What is believed to be on disk. Seeded with the ledger just read, so an untouched session
// never rewrites an identical copy.
let lastPersistedCommendations = initialCommendations;

type StartSessionRequest =
  | { source: 'creation'; name: string; race: string; klass: string; seed: PRNGSeed; stats?: StatsMap }
  | { source: 'import' | 'roster'; character: CharacterSheet };

export interface GameStore {
  character: CharacterSheet;
  log: ActivityEntry[];
  worldNotices: WorldNotice[];
  socialEntries: SocialEntry[];
  commendations: Commendations;
  nextActivityId: number;
  sessionGeneration: number;
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
  /** Optional and supplemental: the chronological line stands on its own without it. */
  readonly reason?: string;
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

function retainWholeSocialScenes(entries: readonly SocialEntry[]): SocialEntry[] {
  const retained: SocialEntry[] = [];
  for (let start = 0; start < entries.length;) {
    const sceneId = entries[start]?.sceneId;
    let end = start + 1;
    while (end < entries.length && entries[end]?.sceneId === sceneId) end += 1;
    if (retained.length + end - start > MAX_SOCIAL_ENTRIES) break;
    retained.push(...entries.slice(start, end));
    start = end;
  }
  return retained;
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialRng = new RandomGenerator('default-seed');
  const initialChar = createNewCharacter('Krg', 'Hob-Hobbit', 'Robot Monk', initialRng);

  return {
    character: initialChar,
    log: createActivityEntries([`Welcome to Progress Quest II! ${initialChar.Traits.Name} the ${initialChar.Traits.Race} ${initialChar.Traits.Class} sets out on an adventure.`], 0),
    worldNotices: [],
    socialEntries: [],
    commendations: initialCommendations,
    nextActivityId: 1,
    sessionGeneration: 0,
    isPaused: false,
    rng: initialRng,
    progression: createProgression(initialChar.Traits.Level),
    pendingElapsedMs: 0,

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    startSession: (request: StartSessionRequest) => {
      const { nextActivityId, sessionGeneration } = get();
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
        socialEntries: [],
        commendations: get().commendations ?? EMPTY_COMMENDATIONS,
        nextActivityId: nextActivityId + 1,
        sessionGeneration: sessionGeneration + 1,
        isPaused: false,
        progression: createProgression(character.Traits.Level),
        pendingElapsedMs: 0,
      });
    },

    restoreSession: (session) => {
      const { nextActivityId, sessionGeneration } = get();
      const rng = new RandomGenerator('restored-session');
      rng.setState([...session.rngState]);
      set({
        character: structuredClone(session.character),
        rng,
        progression: structuredClone(session.progression),
        isPaused: session.isPaused,
        log: createActivityEntries(session.log.toReversed(), nextActivityId).reverse(),
        worldNotices: [],
        socialEntries: [],
        commendations: get().commendations ?? EMPTY_COMMENDATIONS,
        nextActivityId: nextActivityId + session.log.length,
        sessionGeneration: sessionGeneration + 1,
        pendingElapsedMs: session.pendingElapsedMs,
      });
    },

    tick: (elapsedMs: number) => {
      if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
      const { character, isPaused, rng, log, worldNotices, socialEntries, nextActivityId, progression, pendingElapsedMs } = get();
      if (isPaused) return;
      const elapsedBudgetMs = Math.min(MAX_PENDING_ELAPSED_MS, pendingElapsedMs + elapsedMs);
      const result = advanceGame({ character, progression }, elapsedBudgetMs, rng);
      const sources = result.records.map((record, index) => ({ activityId: nextActivityId + index, record }));
      for (const { record } of sources) playEventSound(record.event);
      const activity = sources.map(({ activityId: id, record }) => {
        const reason = describeDecisionReason(record.event);
        return reason === undefined
          ? { id, message: describeGameEvent(record.event) }
          : { id, message: describeGameEvent(record.event), reason };
      }).reverse();
      // One projection per record, used for both the world notices and the exhibit case, rather
      // than classifying the same equipment twice.
      const projections = sources.map((source) => ({ source, projection: projectWorld({ kind: 'transition', source }) }));
      const projectedWorldNotices = projections.flatMap(({ projection }) => projection.notices).toReversed();
      // Records are a maximum over events, so this returns the same object on the overwhelming
      // majority of ticks of ordinary play.
      let nextCommendations = mergeEvents(get().commendations, sources.map(({ record }) => record.event));
      for (const { source, projection } of projections) {
        const event = source.record.event;
        // The classification belongs to the equipment this record awarded, so pair them here
        // rather than trying to reconstruct which item it described later.
        if (event.type === 'equipment_gained' && projection.equipment) {
          nextCommendations = mergeExhibit(nextCommendations, event.slot, event.name, projection.equipment);
        }
      }
      // Held back until the backlog is drained. Catching up on a long absence replays many levels
      // and quests per tick, and questsCompleted/actsCompleted count rather than compare, so a new
      // record lands on nearly every tick of a drain — a synchronous stringify and localStorage
      // write roughly eighteen times a second, on the thread already running the engine and the
      // render. The in-memory ledger stays current either way, so the panel is never stale; only
      // the persisted copy waits. A tab closed mid-drain loses that interval's records, which is
      // the right thing for a decorative ledger to lose to keep the drain smooth.
      //
      // Compared against what was last written rather than against the previous tick, because the
      // tick that finishes a drain need not be one that set a record — and everything banked
      // during the drain has to land on the first opportunity after it, not linger until the next
      // record happens along.
      if (result.remainingElapsedMs === 0 && nextCommendations !== lastPersistedCommendations) {
        lastPersistedCommendations = nextCommendations;
        writeCommendations(typeof window === 'undefined' ? undefined : window.localStorage, nextCommendations);
      }
      const projectedSocialEntries = projectSocialBatch(sources).toReversed();
      set({
        ...result.state,
        pendingElapsedMs: result.remainingElapsedMs,
        log: [...activity, ...log].slice(0, 50),
        worldNotices: [...projectedWorldNotices, ...worldNotices].slice(0, MAX_WORLD_NOTICES),
        socialEntries: retainWholeSocialScenes([...projectedSocialEntries, ...socialEntries]),
        nextActivityId: nextActivityId + activity.length,
        commendations: nextCommendations,
      });
    },
  };
});

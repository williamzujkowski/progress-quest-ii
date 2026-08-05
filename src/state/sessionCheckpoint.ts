import { MAX_PENDING_ELAPSED_MS, MAX_STORED_PAYLOAD_LENGTH } from '../data/limits';
import { useGameStore } from './gameStore';
import { activeCheckpointV1Schema, type ActiveCheckpointV1 } from './schemas';
import { diagnostics, isDOMExceptionNamed } from './diagnostics';
import { loadMostRecentRosterCharacter } from './saveManager';

export const ACTIVE_CHECKPOINT_KEY = 'progquest_active_session_v1';
export const ACTIVE_CHECKPOINT_LKG_KEY = 'progquest_active_session_lkg_v1';
// The shared payload cap, re-exported under the name this module's callers already use. The
// limit is not the checkpoint's own; every reader of local storage is held to the same one.
export const MAX_CHECKPOINT_SERIALIZED_LENGTH = MAX_STORED_PAYLOAD_LENGTH;

type CheckpointErrorCode =
  | 'invalid_schema'
  | 'storage_unavailable'
  | 'storage_corrupt'
  | 'storage_full'
  | 'storage_failed'
  | 'storage_conflict';

export type CheckpointResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: CheckpointErrorCode; message: string } };

export type CheckpointLoad =
  | { status: 'missing'; canPersist: true; expectedPrimaryRaw: null }
  | { status: 'loaded'; canPersist: true; checkpoint: ActiveCheckpointV1; expectedPrimaryRaw: string }
  | { status: 'recovered_lkg'; canPersist: false; canRepair: boolean; repairLabel: string; checkpoint: ActiveCheckpointV1; expectedPrimaryRaw: string | null; message: string }
  | { status: 'corrupt'; canPersist: false; canRepair: false; message: string }
  | { status: 'corrupt'; canPersist: false; canRepair: true; expectedPrimaryRaw: string; message: string }
  | { status: 'unsupported' | 'unavailable'; canPersist: false; message: string };

function failure(code: CheckpointErrorCode, message: string): CheckpointResult<never> {
  return { ok: false, error: { code, message } };
}

function readRaw(storage: Pick<Storage, 'getItem'>, key: string): CheckpointResult<string | null> {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return failure('storage_unavailable', 'Browser storage could not be read. Automatic checkpoints are paused.');
  }
}

function parseCheckpoint(raw: string): CheckpointResult<ActiveCheckpointV1> & { unsupported?: boolean } {
  if (raw.length > MAX_CHECKPOINT_SERIALIZED_LENGTH) {
    return failure('storage_corrupt', 'The saved session is too large to process. Automatic checkpoints are paused.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return failure('storage_corrupt', 'The saved session is unreadable. Automatic checkpoints are paused.');
  }
  if (typeof parsed === 'object' && parsed !== null && 'schemaVersion' in parsed && parsed.schemaVersion !== 1) {
    return { ...failure('storage_corrupt', 'This saved session uses an unsupported version. Automatic checkpoints are paused.'), unsupported: true };
  }
  const result = activeCheckpointV1Schema.safeParse(parsed);
  return result.success
    ? { ok: true, value: result.data }
    : failure('storage_corrupt', 'The saved session is unreadable. Automatic checkpoints are paused.');
}

function writeError(error: unknown): CheckpointResult<never> {
  if (isDOMExceptionNamed(error, 'QuotaExceededError')) {
    return failure('storage_full', 'Browser storage is full. Automatic checkpoints are paused.');
  }
  return failure('storage_failed', 'Browser storage could not save the active session. Automatic checkpoints are paused.');
}

function serializeCheckpoint(checkpoint: ActiveCheckpointV1): CheckpointResult<string> {
  const parsed = activeCheckpointV1Schema.safeParse(checkpoint);
  if (!parsed.success) return failure('invalid_schema', 'The active session is invalid and was not checkpointed.');
  try {
    const raw = JSON.stringify(parsed.data);
    return raw.length <= MAX_CHECKPOINT_SERIALIZED_LENGTH
      ? { ok: true, value: raw }
      : failure('invalid_schema', 'The active session is too large and was not checkpointed.');
  } catch {
    return failure('invalid_schema', 'The active session could not be serialized and was not checkpointed.');
  }
}

export function captureActiveSession(nowMs: number = Date.now()): ActiveCheckpointV1 {
  const state = useGameStore.getState();
  return {
    schemaVersion: 1,
    session: {
      character: structuredClone(state.character),
      rngState: [...state.rng.getState()],
      progression: structuredClone(state.progression),
      pendingElapsedMs: state.pendingElapsedMs,
      savedAtMs: nowMs,
      isPaused: state.isPaused,
      log: state.log.slice(0, 50).map(({ message }) => message),
    },
  };
}

/**
 * Time the app was closed, converted once into elapsed milliseconds the engine can spend.
 *
 * Pure so the awkward cases are testable without a clock: a checkpoint written before this
 * field existed credits nothing, a rolled-back or future clock credits nothing rather than
 * negative or absurd time, and the total is capped by the same ceiling live accrual uses so a
 * long absence cannot hand the engine an unbounded backlog.
 */
export function creditClosedElapsed(
  session: Pick<ActiveCheckpointV1['session'], 'pendingElapsedMs' | 'savedAtMs' | 'isPaused'>,
  nowMs: number,
): number {
  // A paused session asked for time to stop. Honour that across a close as well as a tab switch.
  if (session.isPaused) return session.pendingElapsedMs;
  if (session.savedAtMs === undefined || !Number.isFinite(nowMs)) return session.pendingElapsedMs;
  const closedMs = Math.max(0, nowMs - session.savedAtMs);
  return Math.min(MAX_PENDING_ELAPSED_MS, session.pendingElapsedMs + closedMs);
}

/** Deadpan and approximate on purpose: an exact figure would imply the absence was supervised. */
export function describeAbsence(closedMs: number): string {
  const minutes = Math.floor(closedMs / 60_000);
  if (minutes < 1) return 'A brief absence was filed and required no processing.';
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const span = days >= 1
    ? `${days} day${days === 1 ? '' : 's'}`
    : hours >= 1
      ? `${hours} hour${hours === 1 ? '' : 's'}`
      : `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `Absence of ${span} filed. Progress continued regardless.`;
}

export function restoreActiveSession(checkpoint: ActiveCheckpointV1, nowMs: number = Date.now()): void {
  const parsed = activeCheckpointV1Schema.parse(checkpoint);
  const pendingElapsedMs = creditClosedElapsed(parsed.session, nowMs);
  const creditedMs = pendingElapsedMs - parsed.session.pendingElapsedMs;
  useGameStore.getState().restoreSession({
    ...parsed.session,
    pendingElapsedMs,
    // A line in the feed, not a modal. It reports what already happened and blocks nothing;
    // the progress applies whether or not anyone reads it.
    log: creditedMs > 0 ? [describeAbsence(creditedMs), ...parsed.session.log].slice(0, 50) : parsed.session.log,
  });
}

export function loadActiveCheckpoint(storage: Pick<Storage, 'getItem'>): CheckpointLoad {
  const primary = readRaw(storage, ACTIVE_CHECKPOINT_KEY);
  if (!primary.ok) return { status: 'unavailable', canPersist: false, message: primary.error.message };
  if (primary.value === null) {
    const orphanedBackup = readRaw(storage, ACTIVE_CHECKPOINT_LKG_KEY);
    if (!orphanedBackup.ok) return { status: 'unavailable', canPersist: false, message: orphanedBackup.error.message };
    if (orphanedBackup.value === null) return { status: 'missing', canPersist: true, expectedPrimaryRaw: null };
    const parsedBackup = parseCheckpoint(orphanedBackup.value);
    if (parsedBackup.ok) {
      return {
        status: 'recovered_lkg',
        canPersist: false,
        canRepair: true,
        repairLabel: 'Adopt recovered checkpoint',
        checkpoint: parsedBackup.value,
        expectedPrimaryRaw: null,
        message: 'Recovered an orphaned last known good session. Automatic checkpoints are paused until you adopt it.',
      };
    }
    return parsedBackup.unsupported
      ? { status: 'unsupported', canPersist: false, message: parsedBackup.error.message }
      : { status: 'corrupt', canPersist: false, canRepair: false, message: parsedBackup.error.message };
  }

  const parsed = parseCheckpoint(primary.value);
  if (parsed.ok) return { status: 'loaded', canPersist: true, checkpoint: parsed.value, expectedPrimaryRaw: primary.value };

  const backup = readRaw(storage, ACTIVE_CHECKPOINT_LKG_KEY);
  if (!backup.ok) return { status: 'unavailable', canPersist: false, message: backup.error.message };
  if (backup.ok && backup.value !== null) {
    const parsedBackup = parseCheckpoint(backup.value);
    if (parsedBackup.ok) {
      return {
        status: 'recovered_lkg',
        canPersist: false,
        canRepair: !parsed.unsupported,
        repairLabel: 'Replace unreadable checkpoint',
        checkpoint: parsedBackup.value,
        expectedPrimaryRaw: primary.value,
        message: 'Recovered the last known good session. Automatic checkpoints are paused until you replace the unreadable checkpoint.',
      };
    }
  }
  return parsed.unsupported
    ? { status: 'unsupported', canPersist: false, message: parsed.error.message }
    : { status: 'corrupt', canPersist: false, canRepair: true, expectedPrimaryRaw: primary.value, message: parsed.error.message };
}

export function writeActiveCheckpoint(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  checkpoint: ActiveCheckpointV1,
  expectedPrimaryRaw: string | null,
): CheckpointResult<{ raw: string }> {
  const serialized = serializeCheckpoint(checkpoint);
  if (!serialized.ok) return serialized;
  const current = readRaw(storage, ACTIVE_CHECKPOINT_KEY);
  if (!current.ok) return current;
  if (current.value !== expectedPrimaryRaw) {
    return failure('storage_conflict', 'Another tab changed the saved session. Automatic checkpoints are paused in this tab.');
  }
  if (current.value !== null) {
    const parsedCurrent = parseCheckpoint(current.value);
    if (!parsedCurrent.ok) return parsedCurrent;
  }
  try {
    if (current.value !== null) storage.setItem(ACTIVE_CHECKPOINT_LKG_KEY, current.value);
    storage.setItem(ACTIVE_CHECKPOINT_KEY, serialized.value);
    return { ok: true, value: { raw: serialized.value } };
  } catch (error) {
    return writeError(error);
  }
}

export function repairActiveCheckpoint(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  checkpoint: ActiveCheckpointV1,
  expectedPrimaryRaw: string | null,
): CheckpointResult<{ raw: string }> {
  const serialized = serializeCheckpoint(checkpoint);
  if (!serialized.ok) return serialized;
  const current = readRaw(storage, ACTIVE_CHECKPOINT_KEY);
  if (!current.ok) return current;
  if (current.value !== expectedPrimaryRaw) {
    return failure('storage_conflict', 'Another tab changed the saved session. Automatic checkpoints are paused in this tab.');
  }
  try {
    storage.setItem(ACTIVE_CHECKPOINT_KEY, serialized.value);
    return { ok: true, value: { raw: serialized.value } };
  } catch (error) {
    return writeError(error);
  }
}

export interface CheckpointNotice {
  kind: 'status' | 'alert';
  message: string;
  canRepair: boolean;
  repairLabel?: string;
}

export interface SessionCheckpointController {
  readonly requiresCharacterCreation: boolean;
  getNotice: () => CheckpointNotice | null;
  subscribe: (listener: () => void) => () => void;
  repair: () => void;
  dispose: () => void;
}

interface VisibilityTarget {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: EventListener): void;
  removeEventListener(type: 'visibilitychange', listener: EventListener): void;
}

interface LifecycleTarget {
  addEventListener(type: 'pagehide' | 'storage', listener: EventListener): void;
  removeEventListener(type: 'pagehide' | 'storage', listener: EventListener): void;
}

interface SessionCheckpointOptions {
  storage?: Storage;
  visibilityTarget?: VisibilityTarget;
  pagehideTarget?: LifecycleTarget;
  intervalMs?: number;
  /** The one place wall-clock enters. Injectable so tests can pin that boundary. */
  now?: () => number;
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function startSessionCheckpoints({
  storage = defaultStorage(),
  visibilityTarget = typeof document === 'undefined' ? undefined : document,
  pagehideTarget = typeof window === 'undefined' ? undefined : window,
  intervalMs = 1_000,
  // Injectable so tests can pin the boundary where wall-clock enters. Everything downstream of
  // this call takes elapsed milliseconds, never a clock.
  now = () => Date.now(),
}: SessionCheckpointOptions = {}): SessionCheckpointController {
  const listeners = new Set<() => void>();
  let notice: CheckpointNotice | null = null;
  let canPersist = false;
  let dirty = false;
  let expectedPrimaryRaw: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failureRecorded = false;
  let repairAllowed = false;
  let requiresCharacterCreation = false;
  let repairSuccessMessage = 'The active-session checkpoint was replaced. Automatic checkpoints resumed.';

  const publish = (next: CheckpointNotice | null) => {
    notice = next;
    for (const listener of listeners) listener();
  };
  const block = (message: string, operation: 'read' | 'write' = 'write', allowRepair = false) => {
    canPersist = false;
    repairAllowed = allowRepair;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!failureRecorded) {
      failureRecorded = true;
      diagnostics.record({ code: 'session_checkpoint_failed', severity: 'warning', subsystem: 'storage', operation, outcome: 'failed', source: 'session-checkpoint' });
    }
    publish({ kind: 'alert', message, canRepair: repairAllowed, ...(repairAllowed ? { repairLabel: 'Replace unreadable checkpoint' } : {}) });
  };
  const flush = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!dirty || !canPersist || storage === undefined) return;
    const result = writeActiveCheckpoint(storage, captureActiveSession(now()), expectedPrimaryRaw);
    if (!result.ok) {
      block(result.error.message);
      return;
    }
    expectedPrimaryRaw = result.value.raw;
    dirty = false;
  };
  const schedule = () => {
    dirty = true;
    if (canPersist && timer === undefined) timer = setTimeout(flush, intervalMs);
  };

  if (storage === undefined) {
    block('Browser storage is unavailable. Automatic checkpoints are paused.', 'read');
  } else {
    const loaded = loadActiveCheckpoint(storage);
    if (loaded.status === 'loaded') {
      restoreActiveSession(loaded.checkpoint, now());
      expectedPrimaryRaw = loaded.expectedPrimaryRaw;
      canPersist = true;
      // Write straight back with a fresh timestamp. Without this, a reload before the first
      // debounced save would find the same savedAtMs still on disk and credit the same absence
      // a second time.
      //
      // Marked dirty by hand because the store subscription below is not attached yet, so the
      // set() inside restoreActiveSession notified nobody and flush would otherwise decline as
      // a no-op. The claim is true regardless of who observed it: the store now differs from
      // what is on disk.
      dirty = true;
      flush();
    } else if (loaded.status === 'missing') {
      const mostRecentRosterCharacter = loadMostRecentRosterCharacter(storage);
      if (!mostRecentRosterCharacter.ok) {
        requiresCharacterCreation = true;
        block(`${mostRecentRosterCharacter.error.message} Automatic checkpoints are paused.`, 'read');
      } else if (mostRecentRosterCharacter.value) {
        canPersist = true;
        useGameStore.getState().startSession({ source: 'roster', character: mostRecentRosterCharacter.value });
      } else {
        canPersist = true;
        requiresCharacterCreation = true;
      }
    } else if (loaded.status === 'recovered_lkg') {
      restoreActiveSession(loaded.checkpoint, now());
      expectedPrimaryRaw = loaded.expectedPrimaryRaw;
      repairAllowed = loaded.canRepair;
      if (loaded.expectedPrimaryRaw === null) repairSuccessMessage = 'The recovered active session was adopted. Automatic checkpoints resumed.';
      publish({ kind: 'alert', message: loaded.message, canRepair: loaded.canRepair, ...(loaded.canRepair ? { repairLabel: loaded.repairLabel } : {}) });
      diagnostics.record({ code: 'session_checkpoint_recovered', severity: 'warning', subsystem: 'storage', operation: 'recover', outcome: 'recovered', source: 'session-checkpoint' });
    } else {
      if (loaded.status === 'corrupt' && loaded.canRepair) expectedPrimaryRaw = loaded.expectedPrimaryRaw;
      block(loaded.message, 'read', loaded.status === 'corrupt' && loaded.canRepair);
    }
  }

  const unsubscribeStore = useGameStore.subscribe(schedule);
  const handleVisibility = () => {
    if (visibilityTarget?.hidden) flush();
  };
  const handlePagehide = () => flush();
  const handleStorage = (event: Event) => {
    if (!(event instanceof StorageEvent) || event.key !== ACTIVE_CHECKPOINT_KEY) return;
    if (event.newValue !== expectedPrimaryRaw) block('Another tab changed the saved session. Automatic checkpoints are paused in this tab.');
  };
  visibilityTarget?.addEventListener('visibilitychange', handleVisibility);
  pagehideTarget?.addEventListener('pagehide', handlePagehide);
  pagehideTarget?.addEventListener('storage', handleStorage);

  return {
    requiresCharacterCreation,
    getNotice: () => notice,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    repair: () => {
      if (storage === undefined || !repairAllowed) return;
      const result = repairActiveCheckpoint(storage, captureActiveSession(now()), expectedPrimaryRaw);
      if (!result.ok) {
        block(result.error.message);
        return;
      }
      expectedPrimaryRaw = result.value.raw;
      canPersist = true;
      dirty = false;
      failureRecorded = false;
      repairAllowed = false;
      publish({ kind: 'status', message: repairSuccessMessage, canRepair: false });
    },
    dispose: () => {
      if (timer !== undefined) clearTimeout(timer);
      unsubscribeStore();
      visibilityTarget?.removeEventListener('visibilitychange', handleVisibility);
      pagehideTarget?.removeEventListener('pagehide', handlePagehide);
      pagehideTarget?.removeEventListener('storage', handleStorage);
      listeners.clear();
    },
  };
}

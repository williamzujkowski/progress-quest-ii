// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RandomGenerator } from '../../engine/prng';
import { createNewCharacter } from '../../engine/sim';
import { useGameStore } from '../../state/gameStore';
import { diagnostics } from '../../state/diagnostics';
import { saveToRoster } from '../../state/saveManager';
import {
  ACTIVE_CHECKPOINT_KEY,
  ACTIVE_CHECKPOINT_LKG_KEY,
  captureActiveSession,
  loadActiveCheckpoint,
  repairActiveCheckpoint,
  restoreActiveSession,
  startSessionCheckpoints,
  writeActiveCheckpoint,
} from '../../state/sessionCheckpoint';

const originalState = useGameStore.getState();

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  useGameStore.setState(originalState, true);
  vi.restoreAllMocks();
});

describe('active session checkpoint boundary', () => {
  it('requires character creation when no active session or roster exists', () => {
    const controller = startSessionCheckpoints({ storage: localStorage });

    expect(controller.requiresCharacterCreation).toBe(true);
    controller.dispose();
  });

  it('starts the most recently saved roster character when no active session exists', () => {
    saveToRoster(createNewCharacter('Earlier Roster', 'Half Orc', 'Robot Monk', 704));
    saveToRoster(createNewCharacter('Latest Roster', 'Dung Elf', 'Vermineer', 705));

    const controller = startSessionCheckpoints({ storage: localStorage });

    expect(controller.requiresCharacterCreation).toBe(false);
    expect(useGameStore.getState().character.Traits.Name).toBe('Latest Roster');
    expect(useGameStore.getState().log).toEqual(['Loaded character Latest Roster from roster.']);
    controller.dispose();
  });

  it('restores the active checkpoint before considering the roster', () => {
    const active = createNewCharacter('Active Wins', 'Half Orc', 'Robot Monk', 706);
    useGameStore.setState({ character: active });
    expect(writeActiveCheckpoint(localStorage, captureActiveSession(), null)).toMatchObject({ ok: true });
    saveToRoster(createNewCharacter('Roster Loses', 'Dung Elf', 'Vermineer', 707));
    useGameStore.setState(originalState, true);

    const controller = startSessionCheckpoints({ storage: localStorage });

    expect(controller.requiresCharacterCreation).toBe(false);
    expect(useGameStore.getState().character.Traits.Name).toBe('Active Wins');
    controller.dispose();
  });

  it('blocks startup without replacing an unreadable roster', () => {
    vi.useFakeTimers();
    const corruptRoster = '{broken';
    localStorage.setItem('progquest_roster_v1', corruptRoster);

    const controller = startSessionCheckpoints({ storage: localStorage, intervalMs: 1 });

    expect(controller.requiresCharacterCreation).toBe(true);
    expect(controller.getNotice()).toMatchObject({ kind: 'alert', canRepair: false });
    expect(controller.getNotice()?.message).toContain('saved roster is unreadable');
    useGameStore.setState({ log: ['The placeholder must not become authoritative.'] });
    vi.runAllTimers();
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBeNull();
    expect(localStorage.getItem('progquest_roster_v1')).toBe(corruptRoster);
    controller.dispose();
  });

  it('round-trips the complete deterministic session through a strict v1 envelope', () => {
    const character = createNewCharacter('Checkpoint', 'Dung Elf', 'Vermineer', 701);
    character.Task.elapsedMs = 123;
    const rng = new RandomGenerator('checkpoint-rng');
    rng.random(99);
    useGameStore.setState({
      character,
      rng,
      isPaused: true,
      log: ['Newest event', 'Older event'],
      progression: { experience: { currentSeconds: 7, maxSeconds: 11 }, completedTasks: 9, elapsedSeconds: 42 },
    });
    const checkpoint = captureActiveSession();

    expect(writeActiveCheckpoint(localStorage, checkpoint, null)).toMatchObject({ ok: true });
    const loaded = loadActiveCheckpoint(localStorage);
    expect(loaded).toMatchObject({ status: 'loaded', checkpoint });

    useGameStore.getState().startSession({ source: 'creation', name: 'Replacement', race: 'Half Orc', klass: 'Robot Monk', seed: 702 });
    if (loaded.status !== 'loaded') throw new Error('Expected a loaded checkpoint');
    restoreActiveSession(loaded.checkpoint);
    const restored = useGameStore.getState();
    expect(restored.character).toEqual(character);
    expect(restored.rng.getState()).toEqual(rng.getState());
    expect(restored.isPaused).toBe(true);
    expect(restored.log).toEqual(['Newest event', 'Older event']);
    expect(restored.progression).toEqual({ experience: { currentSeconds: 7, maxSeconds: 11 }, completedTasks: 9, elapsedSeconds: 42 });
  });

  it('recovers a valid last-known-good checkpoint without replacing corrupt primary bytes', () => {
    const checkpoint = captureActiveSession();
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, '{broken');
    localStorage.setItem(ACTIVE_CHECKPOINT_LKG_KEY, JSON.stringify(checkpoint));
    const primary = localStorage.getItem(ACTIVE_CHECKPOINT_KEY);

    const result = loadActiveCheckpoint(localStorage);

    expect(result).toMatchObject({ status: 'recovered_lkg', checkpoint, canPersist: false });
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe(primary);
  });

  it('recovers an orphaned last-known-good checkpoint instead of treating it as a fresh session', () => {
    const checkpoint = captureActiveSession();
    const backupRaw = JSON.stringify(checkpoint);
    localStorage.setItem(ACTIVE_CHECKPOINT_LKG_KEY, backupRaw);

    const loaded = loadActiveCheckpoint(localStorage);

    expect(loaded).toMatchObject({ status: 'recovered_lkg', checkpoint, canPersist: false });
    vi.useFakeTimers();
    const controller = startSessionCheckpoints({ storage: localStorage, intervalMs: 1 });
    expect(controller.getNotice()).toMatchObject({ repairLabel: 'Adopt recovered checkpoint' });
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBeNull();
    controller.repair();
    expect(controller.getNotice()).toMatchObject({
      kind: 'status',
      message: 'The recovered active session was adopted. Automatic checkpoints resumed.',
    });
    useGameStore.setState({ log: ['Do not replace the orphan'] });
    vi.runAllTimers();
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).not.toBeNull();
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_LKG_KEY)).toBe(backupRaw);
    controller.dispose();
  });

  it('blocks without authorizing repair when an orphaned LKG is corrupt', () => {
    localStorage.setItem(ACTIVE_CHECKPOINT_LKG_KEY, '{broken-backup');

    const controller = startSessionCheckpoints({ storage: localStorage });

    expect(controller.getNotice()).toMatchObject({ kind: 'alert', canRepair: false });
    controller.repair();
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBeNull();
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_LKG_KEY)).toBe('{broken-backup');
    controller.dispose();
  });

  it('requires explicit repair before replacing an unreadable primary', () => {
    const checkpoint = captureActiveSession();
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, '{broken');

    expect(writeActiveCheckpoint(localStorage, checkpoint, '{broken')).toMatchObject({ ok: false, error: { code: 'storage_corrupt' } });
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe('{broken');
    expect(repairActiveCheckpoint(localStorage, checkpoint, '{broken')).toMatchObject({ ok: true });
    expect(loadActiveCheckpoint(localStorage)).toMatchObject({ status: 'loaded', checkpoint });
  });

  it('rotates a valid primary before writing its replacement', () => {
    const first = captureActiveSession();
    const firstWrite = writeActiveCheckpoint(localStorage, first, null);
    if (!firstWrite.ok) throw new Error('Expected first checkpoint write');
    useGameStore.setState({ log: ['Changed'] });
    const second = captureActiveSession();

    expect(writeActiveCheckpoint(localStorage, second, firstWrite.value.raw)).toMatchObject({ ok: true });
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_LKG_KEY)).toBe(firstWrite.value.raw);
    expect(loadActiveCheckpoint(localStorage)).toMatchObject({ status: 'loaded', checkpoint: second });
  });

  it('blocks a stale tab instead of overwriting a changed primary', () => {
    const checkpoint = captureActiveSession();
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, 'other-tab');

    expect(writeActiveCheckpoint(localStorage, checkpoint, null)).toMatchObject({ ok: false, error: { code: 'storage_conflict' } });
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe('other-tab');
  });

  it('rejects unsupported, unknown, and invalid Alea state without mutating the session', () => {
    const checkpoint = captureActiveSession();
    const before = useGameStore.getState();
    for (const candidate of [
      { ...checkpoint, schemaVersion: 2 },
      { ...checkpoint, surprise: true },
      { ...checkpoint, session: { ...checkpoint.session, rngState: [0.1, 0.2, 0.3, -1] } },
    ]) {
      localStorage.setItem(ACTIVE_CHECKPOINT_KEY, JSON.stringify(candidate));
      expect(loadActiveCheckpoint(localStorage).canPersist).toBe(false);
      expect(useGameStore.getState()).toBe(before);
    }
  });

  it('blocks automatic writes after a corrupt read and reports one redacted failure episode', () => {
    vi.useFakeTimers();
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, '{broken');
    const original = localStorage.getItem(ACTIVE_CHECKPOINT_KEY);
    const beforeDiagnostics = diagnostics.snapshot().length;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const controller = startSessionCheckpoints({ storage: localStorage, intervalMs: 1 });

    useGameStore.setState({ log: ['Must not overwrite'] });
    vi.runAllTimers();

    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe(original);
    expect(setItem.mock.calls.filter(([key]) => key === ACTIVE_CHECKPOINT_KEY)).toHaveLength(0);
    expect(controller.getNotice()).toMatchObject({ kind: 'alert', canRepair: true });
    expect(diagnostics.snapshot().slice(beforeDiagnostics).filter(({ code }) => code === 'session_checkpoint_failed')).toHaveLength(1);
    expect(diagnostics.exportReport()).not.toContain('{broken');
    controller.dispose();
  });

  it('does not authorize repair for unsupported or unavailable checkpoint reads', () => {
    const checkpoint = captureActiveSession();
    const unsupportedRaw = JSON.stringify({ ...checkpoint, schemaVersion: 2 });
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, unsupportedRaw);
    const unsupported = startSessionCheckpoints({ storage: localStorage });

    expect(unsupported.getNotice()).toMatchObject({ kind: 'alert', canRepair: false });
    unsupported.repair();
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe(unsupportedRaw);
    unsupported.dispose();

    const denied = {
      getItem: () => { throw new DOMException('Denied', 'SecurityError'); },
      setItem: vi.fn(),
    } as unknown as Storage;
    const unavailable = startSessionCheckpoints({ storage: denied });
    expect(unavailable.getNotice()).toMatchObject({ kind: 'alert', canRepair: false });
    unavailable.repair();
    expect(denied.setItem).not.toHaveBeenCalled();
    unavailable.dispose();
  });

  it('does not authorize repair when the primary is corrupt but the LKG read is unavailable', () => {
    let reads = 0;
    const setItem = vi.fn();
    const storage = {
      getItem: () => {
        reads += 1;
        if (reads === 1) return '{broken-primary';
        throw new DOMException('Denied', 'SecurityError');
      },
      setItem,
    } as unknown as Storage;

    const controller = startSessionCheckpoints({ storage });
    expect(controller.getNotice()).toMatchObject({ kind: 'alert', canRepair: false });
    controller.repair();
    expect(setItem).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('disables further repair after an explicit repair write fails', () => {
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, '{broken');
    const original = localStorage.getItem(ACTIVE_CHECKPOINT_KEY);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    const controller = startSessionCheckpoints({ storage: localStorage });
    expect(controller.getNotice()).toMatchObject({ canRepair: true });

    controller.repair();
    expect(controller.getNotice()).toMatchObject({ canRepair: false });
    controller.repair();

    expect(setItem).toHaveBeenCalledOnce();
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe(original);
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_LKG_KEY)).toBeNull();
    controller.dispose();
  });

  it('does not let a stale tab repair over a newer cross-tab checkpoint', () => {
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, '{broken');
    const controller = startSessionCheckpoints({ storage: localStorage, pagehideTarget: window });
    const newer = JSON.stringify(captureActiveSession());
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, newer);

    expect(controller.getNotice()).toMatchObject({ kind: 'alert', canRepair: true });
    controller.repair();

    expect(controller.getNotice()).toMatchObject({ kind: 'alert', canRepair: false });
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe(newer);
    controller.dispose();
  });

  it('preserves primary bytes when either step of checkpoint rotation fails', () => {
    const first = captureActiveSession();
    const firstWrite = writeActiveCheckpoint(localStorage, first, null);
    if (!firstWrite.ok) throw new Error('Expected first checkpoint write');
    useGameStore.setState({ log: ['Replacement'] });
    const replacement = captureActiveSession();
    const nativeSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    setItem.mockImplementationOnce(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(writeActiveCheckpoint(localStorage, replacement, firstWrite.value.raw)).toMatchObject({ ok: false, error: { code: 'storage_full' } });
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe(firstWrite.value.raw);

    setItem.mockImplementationOnce((key, value) => nativeSetItem.call(localStorage, key, value));
    setItem.mockImplementationOnce(() => { throw new Error('Primary failed'); });
    expect(writeActiveCheckpoint(localStorage, replacement, firstWrite.value.raw)).toMatchObject({ ok: false, error: { code: 'storage_failed' } });
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_KEY)).toBe(firstWrite.value.raw);
    expect(localStorage.getItem(ACTIVE_CHECKPOINT_LKG_KEY)).toBe(firstWrite.value.raw);
  });

  it('continues with the exact same next transition and Alea state after restore', () => {
    const character = createNewCharacter('Continuation', 'Half Orc', 'Robot Monk', 703);
    character.Quest.history = [character.Quest.description];
    character.Task = { description: 'Executing rat...', durationMs: 100, elapsedMs: 75, type: 'kill', loot: { type: 'fixed', item: 'rat tail' } };
    const rng = new RandomGenerator('continuation-rng');
    useGameStore.setState({ character, rng, isPaused: false, log: ['Before'], progression: { experience: { currentSeconds: 0, maxSeconds: 10 }, completedTasks: 0, elapsedSeconds: 0 } });
    const checkpoint = captureActiveSession();

    useGameStore.getState().tick(25);
    const uninterrupted = captureActiveSession();
    restoreActiveSession(checkpoint);
    useGameStore.getState().tick(25);

    expect(captureActiveSession()).toEqual(uninterrupted);
  });

  it('coalesces continuous changes and flushes the latest snapshot when hidden', () => {
    vi.useFakeTimers();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const visibilityTarget = new EventTarget() as EventTarget & { hidden: boolean };
    visibilityTarget.hidden = false;
    const pagehideTarget = new EventTarget();
    const controller = startSessionCheckpoints({ storage: localStorage, visibilityTarget, pagehideTarget, intervalMs: 1_000 });

    for (let index = 0; index < 20; index += 1) useGameStore.setState({ log: [`Event ${index}`] });
    vi.advanceTimersByTime(999);
    expect(setItem.mock.calls.filter(([key]) => key === ACTIVE_CHECKPOINT_KEY)).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(setItem.mock.calls.filter(([key]) => key === ACTIVE_CHECKPOINT_KEY)).toHaveLength(1);
    expect(loadActiveCheckpoint(localStorage)).toMatchObject({ status: 'loaded', checkpoint: { session: { log: ['Event 19'] } } });

    useGameStore.setState({ log: ['Hidden latest'] });
    visibilityTarget.hidden = true;
    visibilityTarget.dispatchEvent(new Event('visibilitychange'));
    expect(loadActiveCheckpoint(localStorage)).toMatchObject({ status: 'loaded', checkpoint: { session: { log: ['Hidden latest'] } } });

    useGameStore.setState({ log: ['Pagehide latest'] });
    pagehideTarget.dispatchEvent(new Event('pagehide'));
    expect(loadActiveCheckpoint(localStorage)).toMatchObject({ status: 'loaded', checkpoint: { session: { log: ['Pagehide latest'] } } });
    controller.dispose();
  });
});

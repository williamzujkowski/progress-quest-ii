// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerPwa, type PwaNotice } from '../pwa';
import { diagnostics } from '../state/diagnostics';

async function mockWaitingUpdate() {
  vi.stubEnv('DEV', false);
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

  const worker = new EventTarget() as EventTarget & { state: ServiceWorkerState; postMessage: ReturnType<typeof vi.fn> };
  worker.state = 'installed';
  worker.postMessage = vi.fn();
  const registration = new EventTarget() as EventTarget & {
    installing: ServiceWorker | null;
    waiting: ServiceWorker | null;
  };
  registration.installing = worker as unknown as ServiceWorker;
  registration.waiting = worker as unknown as ServiceWorker;
  const serviceWorker = new EventTarget() as EventTarget & {
    controller: ServiceWorker | null;
    register: ReturnType<typeof vi.fn>;
  };
  serviceWorker.controller = {} as ServiceWorker;
  serviceWorker.register = vi.fn().mockResolvedValue(registration);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });

  const notices: PwaNotice[] = [];
  const dispose = registerPwa((notice) => notices.push(notice));
  await Promise.resolve();
  const update = notices.at(-1);
  expect(update?.kind).toBe('update');
  if (update?.kind !== 'update') throw new Error('Expected a waiting update notice.');
  return { dispose, notices, update, worker };
}

describe('PWA update activation', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('announces a waiting update without obscuring the required action', async () => {
    const { dispose, update } = await mockWaitingUpdate();

    expect(update.message).toBe('A new edition is ready. The bureaucracy requests a reload.');
    expect(update.apply).toBeTypeOf('function');
    dispose();
  });

  it('records one redacted failure when an approved activation stalls', async () => {
    const { dispose, notices, update, worker } = await mockWaitingUpdate();
    const failuresBefore = diagnostics.snapshot().filter(({ code }) => code === 'pwa_update_failed').length;
    update.apply();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(notices.at(-1)?.kind).toBe('retry');
    worker.state = 'redundant';
    worker.dispatchEvent(new Event('statechange'));

    const failures = diagnostics.snapshot().filter(({ code }) => code === 'pwa_update_failed');
    expect(failures).toHaveLength(failuresBefore + 1);
    expect(failures.at(-1)?.details).toEqual({ errorType: 'Error' });
    expect(diagnostics.exportReport()).not.toContain('Service worker activation timed out.');
    expect(notices.at(-1)?.kind).toBe('error');
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('does not offer retry when the applying worker becomes redundant', async () => {
    const { dispose, notices, update, worker } = await mockWaitingUpdate();
    const failuresBefore = diagnostics.snapshot().filter(({ code }) => code === 'pwa_update_failed').length;
    update.apply();
    worker.state = 'redundant';
    worker.dispatchEvent(new Event('statechange'));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(notices.at(-1)?.kind).toBe('error');
    expect(notices.some(({ kind }) => kind === 'retry')).toBe(false);
    expect(diagnostics.snapshot().filter(({ code }) => code === 'pwa_update_failed')).toHaveLength(failuresBefore + 1);
    dispose();
  });
});

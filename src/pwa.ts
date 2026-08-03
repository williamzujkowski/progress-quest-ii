import { diagnostics } from './state/diagnostics';

const REGISTRATION_FAILURE = 'Offline mode is unavailable. Questing may require civilization.';
const UPDATE_FAILURE = 'The update declined its promotion. The current edition remains in office.';
const UPDATE_APPLYING = 'Applying the new edition. Please hold while progress is reclassified.';
const ACTIVATION_TIMEOUT_MS = 10_000;

export type PwaNotice =
  | { kind: 'error'; message: string }
  | { kind: 'applying'; message: string }
  | { kind: 'retry' | 'update'; message: string; apply: () => void };

export function registerPwa(onNotice: (notice: PwaNotice) => void): () => void {
  // ponytail: public/sw.js is a build template; register only after Vite has generated dist/sw.js.
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return () => undefined;

  let disposed = false;
  let registration: ServiceWorkerRegistration | undefined;
  let installing: ServiceWorker | null = null;
  let applying = false;
  let activationRequested = false;
  let activationTimeout: number | undefined;
  let activationStartedAt: number | undefined;
  let activationRemainingMs = ACTIVATION_TIMEOUT_MS;

  const fail = (code: 'pwa_registration_failed' | 'pwa_update_failed', operation: 'initialize' | 'update', message: string, error: unknown) => {
    if (disposed) return;
    diagnostics.record({ code, severity: 'warning', subsystem: 'pwa', operation, outcome: 'failed', source: 'pwa-lifecycle', error });
    onNotice({ kind: 'error', message });
  };

  const pauseActivationTimeout = () => {
    if (activationTimeout !== undefined) window.clearTimeout(activationTimeout);
    activationTimeout = undefined;
    if (activationStartedAt !== undefined) {
      activationRemainingMs = Math.max(0, activationRemainingMs - (performance.now() - activationStartedAt));
      activationStartedAt = undefined;
    }
  };
  const failActivation = (error: unknown, mayStillActivate = false) => {
    if (!applying || disposed) return;
    applying = false;
    activationRequested = mayStillActivate;
    pauseActivationTimeout();
    diagnostics.record({ code: 'pwa_update_failed', severity: 'warning', subsystem: 'pwa', operation: 'update', outcome: 'failed', source: 'pwa-lifecycle', error });
    onNotice({ kind: 'retry', message: UPDATE_FAILURE, apply: applyUpdate });
  };
  const startActivationTimeout = () => {
    pauseActivationTimeout();
    if (!applying || document.visibilityState !== 'visible') return;
    if (activationRemainingMs <= 0) {
      failActivation(new Error('Service worker activation timed out.'), true);
      return;
    }
    activationStartedAt = performance.now();
    activationTimeout = window.setTimeout(() => {
      if (document.visibilityState === 'visible') failActivation(new Error('Service worker activation timed out.'), true);
    }, activationRemainingMs);
  };
  function applyUpdate(): void {
    if (applying) return;
    try {
      if (!registration?.waiting) throw new Error('No waiting service worker.');
      applying = true;
      activationRequested = true;
      activationRemainingMs = ACTIVATION_TIMEOUT_MS;
      onNotice({ kind: 'applying', message: UPDATE_APPLYING });
      registration.waiting.postMessage({ type: 'pwa_apply_update' });
      startActivationTimeout();
    } catch (error) {
      if (applying) failActivation(error);
      else fail('pwa_update_failed', 'update', UPDATE_FAILURE, error);
    }
  }
  const announceWaitingUpdate = () => {
    if (!registration?.waiting || !navigator.serviceWorker.controller || disposed) return;
    onNotice({
      kind: 'update',
      message: 'A new edition is ready. The bureaucracy requests a reload.',
      apply: applyUpdate,
    });
  };
  const handleStateChange = () => {
    if (installing?.state === 'installed') announceWaitingUpdate();
    if (installing?.state === 'redundant') {
      const isUpdate = Boolean(navigator.serviceWorker.controller);
      const error = new Error('Service worker install failed.');
      if (isUpdate && activationRequested) {
        if (applying) {
          applying = false;
          activationRequested = false;
          pauseActivationTimeout();
          fail('pwa_update_failed', 'update', UPDATE_FAILURE, error);
        } else {
          activationRequested = false;
          onNotice({ kind: 'error', message: UPDATE_FAILURE });
        }
        return;
      }
      fail(
        isUpdate ? 'pwa_update_failed' : 'pwa_registration_failed',
        isUpdate ? 'update' : 'initialize',
        isUpdate ? UPDATE_FAILURE : REGISTRATION_FAILURE,
        error,
      );
    }
  };
  const handleUpdateFound = () => {
    installing?.removeEventListener('statechange', handleStateChange);
    installing = registration?.installing ?? null;
    installing?.addEventListener('statechange', handleStateChange);
    handleStateChange();
  };
  const handleControllerChange = () => {
    if (!activationRequested) return;
    activationRequested = false;
    applying = false;
    pauseActivationTimeout();
    window.location.reload();
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') pauseActivationTimeout();
    else startActivationTimeout();
  };

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  void navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .then((registered) => {
      if (disposed) return;
      registration = registered;
      registration.addEventListener('updatefound', handleUpdateFound);
      handleUpdateFound();
      announceWaitingUpdate();
    })
    .catch((error: unknown) => fail('pwa_registration_failed', 'initialize', REGISTRATION_FAILURE, error));

  return () => {
    disposed = true;
    installing?.removeEventListener('statechange', handleStateChange);
    registration?.removeEventListener('updatefound', handleUpdateFound);
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    pauseActivationTimeout();
  };
}

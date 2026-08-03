import { diagnostics } from './state/diagnostics';

const REGISTRATION_FAILURE = 'Offline mode is unavailable. Questing may require civilization.';
const UPDATE_FAILURE = 'The update declined its promotion. The current edition remains in office.';

export type PwaNotice =
  | { kind: 'error'; message: string }
  | { kind: 'update'; message: string; apply: () => void };

export function registerPwa(onNotice: (notice: PwaNotice) => void): () => void {
  // ponytail: public/sw.js is a build template; register only after Vite has generated dist/sw.js.
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return () => undefined;

  let disposed = false;
  let registration: ServiceWorkerRegistration | undefined;
  let installing: ServiceWorker | null = null;
  let applying = false;

  const fail = (code: 'pwa_registration_failed' | 'pwa_update_failed', operation: 'initialize' | 'update', message: string, error: unknown) => {
    if (disposed) return;
    diagnostics.record({ code, severity: 'warning', subsystem: 'pwa', operation, outcome: 'failed', source: 'pwa-lifecycle', error });
    onNotice({ kind: 'error', message });
  };
  const applyUpdate = () => {
    try {
      if (!registration?.waiting) throw new Error('No waiting service worker.');
      applying = true;
      registration.waiting.postMessage({ type: 'pwa_apply_update' });
    } catch (error) {
      applying = false;
      fail('pwa_update_failed', 'update', UPDATE_FAILURE, error);
    }
  };
  const announceWaitingUpdate = () => {
    if (!registration?.waiting || disposed) return;
    onNotice({
      kind: 'update',
      message: 'A new edition is ready. The bureaucracy requests a reload.',
      apply: applyUpdate,
    });
  };
  const handleStateChange = () => {
    if (!navigator.serviceWorker.controller) return;
    if (installing?.state === 'installed') announceWaitingUpdate();
    if (installing?.state === 'redundant') {
      fail('pwa_update_failed', 'update', UPDATE_FAILURE, new Error('Service worker update install failed.'));
    }
  };
  const handleUpdateFound = () => {
    installing?.removeEventListener('statechange', handleStateChange);
    installing = registration?.installing ?? null;
    installing?.addEventListener('statechange', handleStateChange);
    handleStateChange();
  };
  const handleControllerChange = () => {
    if (applying) window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
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
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

/**
 * Exercises the service worker's message handler, which decides whether an update is applied.
 *
 * Static analysis flags this handler as having no origin check, because it looks for
 * `event.origin` — the property a window message carries. A service worker message has no such
 * property; the sender is `event.source`, a Client, and its origin comes from `source.url`. The
 * handler does check it, and this file is the difference between saying so and showing it.
 *
 * The template is loaded rather than the built worker, so this covers what ships regardless of
 * which build produced it.
 */

async function loadMessageHandler() {
  const template = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const source = template
    .replace('__PRECACHE_URLS__', JSON.stringify(['./index.html']))
    .replace('__BUILD_ID__', 'test');

  const listeners = new Map();
  let skipWaitingCalls = 0;
  const context = {
    self: {
      registration: { scope: 'https://example.test/app/' },
      addEventListener: (type, handler) => listeners.set(type, handler),
      skipWaiting: () => { skipWaitingCalls += 1; return Promise.resolve(); },
    },
    caches: { open: async () => ({ addAll: async () => {} }), keys: async () => [], delete: async () => {} },
    URL,
    Request,
    Set,
    console,
  };
  context.globalThis = context;
  runInNewContext(source, context);

  const handler = listeners.get('message');
  assert.ok(handler, 'The worker registered no message handler, so this test proves nothing.');
  return { handler, applied: () => skipWaitingCalls };
}

const APPLY = { type: 'pwa_apply_update' };
const inScope = { type: 'window', url: 'https://example.test/app/index.html' };

test('applies an update requested from a page inside its own scope', async () => {
  const { handler, applied } = await loadMessageHandler();
  handler({ data: APPLY, source: inScope });
  assert.equal(applied(), 1);
});

test('refuses a request from another origin', async () => {
  const { handler, applied } = await loadMessageHandler();
  handler({ data: APPLY, source: { type: 'window', url: 'https://attacker.test/app/index.html' } });
  assert.equal(applied(), 0, 'A cross-origin page was able to trigger an update.');
});

test('refuses a request from outside its scope on the same origin', async () => {
  // Two applications sharing a host must not be able to update each other.
  const { handler, applied } = await loadMessageHandler();
  handler({ data: APPLY, source: { type: 'window', url: 'https://example.test/other/index.html' } });
  assert.equal(applied(), 0);
});

test('refuses a sender that is not a window', async () => {
  const { handler, applied } = await loadMessageHandler();
  for (const source of [{ type: 'worker', url: 'https://example.test/app/w.js' }, undefined, null]) {
    handler({ data: APPLY, source });
  }
  assert.equal(applied(), 0);
});

test('refuses anything that is not exactly the update request', async () => {
  const { handler, applied } = await loadMessageHandler();
  for (const data of [
    null,
    'pwa_apply_update',
    { type: 'pwa_apply_update', extra: true },
    { type: 'something_else' },
    {},
  ]) {
    handler({ data, source: inScope });
  }
  assert.equal(applied(), 0);
});

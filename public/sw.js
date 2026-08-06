// Deliberately still the old slug, after the move to /progress-quest-iii/. Caches are keyed per
// origin rather than per scope, so this prefix is what the cleanup filter matches on: renaming it
// would leave every cache an installed copy already wrote unmatched and therefore never collected.
// It is a storage key that happens to read like a name, and storage keys do not get renamed here.
const CACHE_PREFIX = 'progress-quest-ii-shell-';
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_ID__`;
const PRECACHE_URLS = __PRECACHE_URLS__;
const SCOPE_URL = new URL('./', self.registration.scope);
const INDEX_URL = new URL('./index.html', SCOPE_URL);
const PRECACHE_PATHS = new Set(PRECACHE_URLS.map((path) => new URL(path, SCOPE_URL).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(PRECACHE_URLS.map((path) => new Request(new URL(path, SCOPE_URL), {
          cache: 'reload',
          credentials: 'same-origin',
        })));
      } catch (error) {
        await caches.delete(CACHE_NAME);
        throw error;
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim()
      .then(() => caches.keys())
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      )),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  const sourceUrl = event.source?.type === 'window' ? new URL(event.source.url) : null;
  if (
    sourceUrl?.origin === SCOPE_URL.origin
    && sourceUrl.pathname.startsWith(SCOPE_URL.pathname)
    && typeof data === 'object'
    && data !== null
    && Object.keys(data).length === 1
    && data.type === 'pwa_apply_update'
  ) void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== SCOPE_URL.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(INDEX_URL)) ?? Response.error();
    }));
    return;
  }

  if (url.search || !PRECACHE_PATHS.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(request)) ?? fetch(request)));
});

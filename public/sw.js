const CACHE_PREFIX = 'progquest-shell-';
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_ID__`;
const PRECACHE_URLS = __PRECACHE_URLS__;
const SCOPE_URL = new URL('./', self.registration.scope);
const INDEX_URL = new URL('./index.html', SCOPE_URL);
const PRECACHE_PATHS = new Set(PRECACHE_URLS.map((path) => new URL(path, SCOPE_URL).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(
      PRECACHE_URLS.map((path) => new Request(new URL(path, SCOPE_URL), {
        cache: 'reload',
        credentials: 'same-origin',
      })),
    )),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'pwa_apply_update') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== SCOPE_URL.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(INDEX_URL)) ?? Response.error()));
    return;
  }

  if (url.search || !PRECACHE_PATHS.has(url.pathname)) return;
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});

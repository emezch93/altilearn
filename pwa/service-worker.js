// ─── AltiLearn Service Worker ───────────────────────────────────────────────
// Strategy:
//   HTML pages      → Network First  (always fresh, fallback to cache)
//   Static assets   → Cache First    (CSS, JS, fonts, icons)
//   API calls       → Network Only   (never cache /api/* routes)
//   Offline fallback→ offline.html   (shown when network + cache both fail)
//
// NOTE: this file lives at the SITE ROOT (same level as index.html), not
// inside /pwa/. A service worker's scope defaults to the folder it's served
// from, so keeping it in /pwa/ would only ever control pages under /pwa/ —
// never the actual site. All paths below are relative for the same reason:
// this works whether the site is served from a domain root or a GitHub
// Pages subpath like username.github.io/altilearn/.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'altilearn-v2';

const PRE_CACHE = [
  './',
  'index.html',
  'offline.html',
  'pwa/manifest.json',
  'pwa/icons/icon-192.png',
  'pwa/icons/icon-512.png',
  'sub-homepages/courses.html',
  'sub-homepages/paths.html',
  'sub-homepages/login.html',
  'sub-homepages/signup.html',
];

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/api/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

// ─── STRATEGIES ──────────────────────────────────────────────────────────────

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match('offline.html');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then(response => {
      if (response.ok) cache.put(request, response);
    }).catch(() => {});
    return cached;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ error: 'You are offline. Please reconnect and try again.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

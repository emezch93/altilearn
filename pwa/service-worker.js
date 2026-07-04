// ─── AltiLearn Service Worker ───────────────────────────────────────────────
// Strategy:
//   HTML pages      → Network First  (always fresh, fallback to cache)
//   Static assets   → Cache First    (CSS, JS, fonts, icons)
//   API calls       → Network Only   (never cache /api/* routes)
//   Offline fallback→ /offline.html  (shown when network + cache both fail)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'altilearn-v1';

const PRE_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/pwa/manifest.json',
  '/pwa/icons/icon-192.png',
  '/pwa/icons/icon-512.png',
  '/sub-homepages/courses.html',
  '/sub-homepages/paths.html',
  '/sub-homepages/login.html',
  '/sub-homepages/signup.html',
];

// ─── INSTALL ─────────────────────────────────────────────────────────────────
// Pre-cache core assets so the app shell is available immediately offline.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting()) // activate new SW immediately
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
// Delete any old cache versions left over from previous SW installs.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // take control of open tabs immediately
  );
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests (POST, PUT, DELETE — let them go straight to network)
  if (request.method !== 'GET') return;

  // 2. Skip cross-origin requests (CDNs, analytics, payment iframes)
  if (url.origin !== self.location.origin) return;

  // 3. API calls — Network Only, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 4. HTML pages — Network First, fallback to cache, then offline.html
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 5. Everything else (CSS, JS, images, fonts) — Cache First
  event.respondWith(cacheFirst(request));
});

// ─── STRATEGIES ──────────────────────────────────────────────────────────────

// Network First: try network → cache → offline fallback
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const networkResponse = await fetch(request);
    // Only cache valid responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last resort: show offline page
    return cache.match('/offline.html');
  }
}

// Cache First: try cache → network (and update cache in background)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in background so next visit gets the latest
    fetch(request).then(response => {
      if (response.ok) cache.put(request, response);
    }).catch(() => {}); // silence network errors on background refresh
    return cached;
  }
  // Not in cache — fetch and store
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // No cache, no network — nothing we can do for non-HTML assets
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

// Network Only: straight to network, fail naturally
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
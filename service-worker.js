// Root-level loader. Required because a service worker's scope defaults to
// the folder it's registered from — a worker living in /pwa/ could never
// control the whole site. GitHub Pages doesn't support the
// Service-Worker-Allowed header that would let us widen scope another way,
// so this tiny shim is the workaround: it registers at root (full-site scope)
// and simply imports the real, unmoved logic from pwa/service-worker.js.
importScripts('pwa/service-worker.js');

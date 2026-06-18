/* GET /sw.js — service worker for PWA offline support.
   Registered only when PWA is enabled (see PwaRegistration client component).
   Strategy: cache-first for the app shell (static assets), network-first for
   everything else, with a stale-while-revalidate fallback. */
export async function GET() {
  const sw = `
const CACHE = 'piforum-v2';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge ALL old caches (including the old 'piforum-v1') so stale chunks
  // from a previous SW session are evicted immediately.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never cache API or admin requests
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // Network-first for navigation (HTML), fallback to cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Network-first for _next/static dev chunks — Turbopack reuses chunk URLs
  // in dev so cache-first would serve stale intermediate builds. Always go
  // to the network first, fall back to cache only when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || Response.error()))
  );
});
`;
  return new Response(sw, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    },
  });
}

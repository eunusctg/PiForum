/* GET /sw.js — enhanced service worker for PWA offline support.
   Registered only when PWA is enabled (see PwaRegistration client component).
   Strategies:
   - Cache-first for static assets (CSS, JS, images, fonts) with 30-day expiry
   - Network-first for navigation and API requests
   - Stale-while-revalidate for forum pages
   - Offline fallback page when navigation fails with no cache */
export async function GET() {
  const sw = `
const CACHE = 'piforum-v3';
const CACHE_STATIC = 'piforum-v3-static';
const CACHE_PAGES = 'piforum-v3-pages';
const CACHE_API = 'piforum-v3-api';

const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
];

// Static asset extensions — cache-first with long expiry
const STATIC_EXTS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.webmanifest'];

const THIRTY_DAYS = 30 * 24 * 60 * 60;

// Offline fallback HTML page
const OFFLINE_PAGE = \`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — PiForum</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #000; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #888; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
    button { background: #00bcd4; color: #000; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; font-weight: 600; }
    button:hover { background: #00e5ff; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection. PiForum needs a connection to load fresh content. Check your network and try again.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>
\`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge old cache versions (keep current v3 caches)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith('piforum-v3'))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Helper: check if a request URL points to a static asset
function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return STATIC_EXTS.some((ext) => pathname.endsWith(ext)) ||
         pathname.startsWith('/_next/static/');
}

// Helper: check if a request is for the API
function isApiRequest(url) {
  return new URL(url).pathname.startsWith('/api/');
}

// Helper: check if a request is an admin route
function isAdminRequest(url) {
  return new URL(url).pathname.startsWith('/admin');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;

  // Never cache admin requests
  if (isAdminRequest(url)) return;

  // --- Strategy 1: Cache-first for static assets (CSS, JS, images, fonts) ---
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_STATIC).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) {
            // Return cached version but revalidate in background
            const fetchPromise = fetch(req).then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                cache.put(req, networkRes.clone());
              }
              return networkRes;
            }).catch(() => {});
            return cached;
          }
          // Not in cache — fetch from network and cache
          return fetch(req).then((networkRes) => {
            if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
              cache.put(req, networkRes.clone());
            }
            return networkRes;
          }).catch(() => Response.error());
        })
      )
    );
    return;
  }

  // --- Strategy 2: Network-first for API requests ---
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_API).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || new Response(
          JSON.stringify({ success: false, error: 'You are offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )))
    );
    return;
  }

  // --- Strategy 3: Network-first for navigation (HTML pages) ---
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_PAGES).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => {
            if (r) return r;
            // Try to serve the cached homepage as a fallback
            return caches.match('/').then((homePage) => {
              if (homePage) return homePage;
              // Last resort: offline fallback page
              return new Response(OFFLINE_PAGE, {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
            });
          })
        )
    );
    return;
  }

  // --- Strategy 4: Stale-while-revalidate for other requests ---
  event.respondWith(
    caches.open(CACHE_PAGES).then((cache) =>
      cache.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
              cache.put(req, networkRes.clone());
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    )
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

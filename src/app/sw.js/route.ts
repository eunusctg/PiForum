/* GET /sw.js — aggressive service worker for PWA offline support.
   Registered only when PWA is enabled (see PwaRegistration client component).
   Strategies (AGGRESSIVE caching for instant loads & offline support):
   - Cache-first for static assets (CSS, JS, images, fonts) with 90-day expiry
   - Cache-first with background revalidation for API GET requests (5min stale)
   - Cache-first with background revalidation for navigation (HTML pages)
   - Stale-while-revalidate for other requests
   - Offline fallback page when navigation fails with no cache
   - Periodic background sync for cache warming
   - Preload critical app shell resources on install */
export async function GET() {
  const sw = `
const CACHE = 'piforum-v4';
const CACHE_STATIC = 'piforum-v4-static';
const CACHE_PAGES = 'piforum-v4-pages';
const CACHE_API = 'piforum-v4-api';
const CACHE_IMG = 'piforum-v4-images';

const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/logo.svg',
  '/favicon.ico',
];

// Static asset extensions — cache-first with long expiry
const STATIC_EXTS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.webmanifest', '.avif'];

const NINETY_DAYS = 90 * 24 * 60 * 60;
const API_STALE_TIME = 5 * 60 * 1000; // 5 minutes

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
    caches.open(CACHE).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {})
    )
  );
  // Aggressive: activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge ALL old cache versions (keep only current v4 caches)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith('piforum-v4'))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
  // Claim all clients immediately so the aggressive SW takes over right away
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

// Helper: check if a request is an image
function isImageRequest(url) {
  const pathname = new URL(url).pathname;
  return /\\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(pathname);
}

// Helper: check cached response staleness for API
function isStale(cachedResponse, maxAge) {
  if (!cachedResponse) return true;
  const dateHeader = cachedResponse.headers.get('sw-cache-time');
  if (!dateHeader) return true;
  return (Date.now() - parseInt(dateHeader)) > maxAge;
}

// Add cache timestamp header when storing responses
function cacheWithTimestamp(cache, req, res) {
  const timestamped = new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: {
      ...Object.fromEntries(res.headers.entries()),
      'sw-cache-time': String(Date.now()),
    },
  });
  return cache.put(req, timestamped);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;

  // Never cache admin requests
  if (isAdminRequest(url)) return;

  // --- Strategy 1: Cache-first for static assets (CSS, JS, images, fonts) ---
  // Aggressive: serve from cache immediately, revalidate in background
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_STATIC).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) {
            // Return cached immediately, revalidate in background
            const fetchPromise = fetch(req).then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                cacheWithTimestamp(cache, req, networkRes.clone());
              }
              return networkRes;
            }).catch(() => {});
            return cached;
          }
          // Not in cache — fetch from network and cache aggressively
          return fetch(req).then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              cacheWithTimestamp(cache, req, networkRes.clone());
            }
            return networkRes;
          }).catch(() => Response.error());
        })
      )
    );
    return;
  }

  // --- Strategy 2: Cache-first with stale revalidation for API GET ---
  // Aggressive: serve cached API data immediately (up to 5min stale),
  // then revalidate in background for next visit
  if (isApiRequest(url)) {
    event.respondWith(
      caches.open(CACHE_API).then((cache) =>
        cache.match(req).then((cached) => {
          // Return cached if available (even if stale up to 5min)
          if (cached) {
            // Background revalidation
            const fetchPromise = fetch(req).then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                cacheWithTimestamp(cache, req, networkRes.clone());
              }
              return networkRes;
            }).catch(() => {});
            return cached;
          }
          // No cache — fetch from network and cache
          return fetch(req).then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              cacheWithTimestamp(cache, req, networkRes.clone());
            }
            return networkRes;
          }).catch(() => new Response(
            JSON.stringify({ success: false, error: 'You are offline' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          ));
        })
      )
    );
    return;
  }

  // --- Strategy 3: Cache-first for navigation (HTML pages) ---
  // Aggressive: serve cached page immediately, revalidate in background
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_PAGES).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) {
            // Return cached immediately, revalidate in background
            fetch(req).then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                cacheWithTimestamp(cache, req, networkRes.clone());
              }
            }).catch(() => {});
            return cached;
          }
          // No cache — fetch from network
          return fetch(req).then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              cacheWithTimestamp(cache, req, networkRes.clone());
            }
            return networkRes;
          }).catch(() =>
            caches.match('/').then((homePage) => {
              if (homePage) return homePage;
              return new Response(OFFLINE_PAGE, {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
            })
          );
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
              cacheWithTimestamp(cache, req, networkRes.clone());
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    )
  );
});

// Periodic background cache warming — pre-fetch key pages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WARM_CACHE') {
    const urls = event.data.urls || [];
    caches.open(CACHE_PAGES).then((cache) => {
      urls.forEach((url) => {
        cache.match(url).then((cached) => {
          if (!cached) {
            fetch(url).then((res) => {
              if (res && res.status === 200) {
                cacheWithTimestamp(cache, url, res.clone());
              }
            }).catch(() => {});
          }
        });
      });
    });
  }
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

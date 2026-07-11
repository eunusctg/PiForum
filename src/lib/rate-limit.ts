/**
 * Simple in-memory rate limiter using a Map with TTL cleanup.
 *
 * Each entry tracks { count, resetAt }. When the current time exceeds
 * resetAt the entry is considered expired and the counter resets.
 *
 * A periodic cleanup runs every 60 seconds to evict stale entries
 * and prevent unbounded memory growth.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // unix ms
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup — remove expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);
}

/**
 * Check whether a request identified by `key` is within the allowed `limit`
 * over a sliding `windowMs` window.
 *
 * @param key     Unique identifier (e.g. IP address, user ID)
 * @param limit   Maximum number of requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns `{ success: boolean, remaining: number }`
 *          success=true means the request is allowed; remaining shows how
 *          many more requests are permitted in the current window.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // No entry or expired — start a new window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  // Entry exists and is within the window
  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count };
}

/**
 * Helper to extract a client IP from the request headers.
 * Falls back to 'unknown' if no IP header is found.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Convenience: return a 429 error response when rate-limited.
 */
export function rateLimitResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests. Please try again later.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
        'Retry-After': '60',
      },
    },
  );
}

/**
 * Shared cached wrapper for base44.auth.me().
 *
 * Problem: Multiple components (Layout, Home1, Avatar, etc.) each call
 * base44.auth.me() independently on page load, causing N+1 redundant
 * API requests visible in Sentry breadcrumbs.
 *
 * Solution: Single-flight + short TTL cache so that concurrent callers
 * share one network request, while still allowing fresh data when the
 * cache expires.
 */
import { base44 } from "@/api/base44Client";

let _inflight = null;   // Promise while a request is in-flight
let _cached = null;      // { data, ts }
const CACHE_TTL_MS = 3000; // 3 seconds — enough to deduplicate mount-time bursts

/**
 * Returns the current user, deduplicating concurrent calls and caching
 * the result for a short window.
 *
 * @param {{ force?: boolean }} options  Set force:true after updateMe() to bust cache
 * @returns {Promise<object>} user object from base44.auth.me()
 */
export async function cachedAuthMe({ force = false } = {}) {
  // Return cached value if still fresh
  if (!force && _cached && (Date.now() - _cached.ts) < CACHE_TTL_MS) {
    return _cached.data;
  }

  // Single-flight: if a request is already running, piggyback on it
  if (_inflight) {
    return _inflight;
  }

  _inflight = base44.auth.me()
    .then(user => {
      _cached = { data: user, ts: Date.now() };
      return user;
    })
    .finally(() => {
      _inflight = null;
    });

  return _inflight;
}

/**
 * Invalidates the cached user so the next cachedAuthMe() call
 * will hit the network. Call this after base44.auth.updateMe().
 */
export function invalidateAuthCache() {
  _cached = null;
}

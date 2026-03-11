import { base44 } from "@/api/base44Client";

/**
 * Lightweight usage analytics tracker.
 * Writes events to the UserActivity Base44 entity.
 *
 * Usage:
 *   import { trackEvent, trackPageView, initSession } from "@/lib/activityTracker";
 *
 *   initSession();                                    // call once on app load
 *   trackPageView("Home1");                           // on navigation
 *   trackEvent("feature_use", "MathGames1", { game: "addition" });
 */

let sessionId = null;
let currentUser = null;

/** Generate a simple session ID */
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Initialize a new session. Call once on app load. */
export function initSession() {
  sessionId = generateSessionId();
}

/** Set user context for all tracked events. */
export function setActivityUser(user) {
  currentUser = user;
}

/**
 * Track a generic event.
 *
 * @param {string} eventType - e.g. "page_view", "feature_use", "session_start", "error"
 * @param {string} [page] - page name
 * @param {Object} [metadata] - extra data
 */
export async function trackEvent(eventType, page, metadata = {}) {
  try {
    const entity = base44.entities?.UserActivity;
    if (!entity) return;

    await entity.create({
      user_email: currentUser?.email || "anonymous",
      user_name: currentUser?.full_name || "anonymous",
      event_type: eventType,
      page: page || window.location.pathname.replace("/", "") || "unknown",
      session_id: sessionId,
      metadata,
    });
  } catch {
    // Analytics should never break the app
  }
}

/** Track a page view. */
export function trackPageView(pageName) {
  trackEvent("page_view", pageName);
}

/** Track a session start. */
export function trackSessionStart() {
  trackEvent("session_start", window.location.pathname.replace("/", "") || "Home1", {
    user_agent: navigator.userAgent,
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language,
  });
}

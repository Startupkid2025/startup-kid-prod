import { Sentry } from "./sentry";
import { BUILD_ENV } from "./version";

/**
 * Crash Logger — central error reporting for Startup Kid.
 *
 * - Human-readable console output (always)
 * - Sentry reporting (when DSN is configured)
 * - Captures: user, page, action, error, timestamp
 *
 * Usage:
 *   import { logCrash, setUser, addBreadcrumb } from "@/lib/crashLogger";
 *
 *   // Set user context after login
 *   setUser({ id: "abc", email: "kid@school.com", name: "דני" });
 *
 *   // Log a caught error
 *   logCrash(error, { page: "Home1", action: "loadData" });
 *
 *   // Add breadcrumb before risky operations
 *   addBreadcrumb("Fetching investments", { count: 5 });
 */

let currentUser = null;

/**
 * Set the logged-in user for crash context.
 * Call this once after login / auth resolution.
 */
export function setUser(user) {
  currentUser = user;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, username: user.full_name });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Log a crash / caught error.
 *
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context
 * @param {string} context.page - Page name (e.g. "Home1", "Lessons1")
 * @param {string} context.action - What was happening (e.g. "loadData", "purchaseItem")
 * @param {string} [context.severity] - "fatal" | "error" | "warning" (default: "error")
 * @param {Object} [context.extra] - Any extra data to attach
 */
export function logCrash(error, { page, action, severity = "error", extra = {} } = {}) {
  const timestamp = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const errorObj = typeof error === "string" ? new Error(error) : error;
  const message = errorObj?.message || String(error);

  // Human-readable console output
  const label = severity === "fatal" ? "🔴 FATAL" : severity === "warning" ? "🟡 WARNING" : "🔴 ERROR";
  console.error(
    `\n${label} [${timestamp}]\n` +
    `  Page:    ${page || "unknown"}\n` +
    `  Action:  ${action || "unknown"}\n` +
    `  User:    ${currentUser?.full_name || currentUser?.email || "anonymous"}\n` +
    `  Error:   ${message}\n` +
    (BUILD_ENV !== "production" && errorObj?.stack ? `  Stack:   ${errorObj.stack}\n` : "")
  );

  // Sentry reporting
  Sentry.withScope((scope) => {
    scope.setLevel(severity);
    scope.setTag("page", page || "unknown");
    scope.setTag("action", action || "unknown");
    scope.setTag("build_env", BUILD_ENV);
    scope.setExtras({ ...extra, page, action, timestamp });
    Sentry.captureException(errorObj);
  });
}

/**
 * Add a breadcrumb — marks what happened right before a crash.
 * These show up in Sentry's breadcrumb trail.
 *
 * @param {string} message - What happened (e.g. "Loaded 5 investments")
 * @param {Object} [data] - Extra data to attach
 */
export function addBreadcrumb(message, data = {}) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
    timestamp: Date.now() / 1000,
  });
}

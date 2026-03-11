import { logCrash } from "./crashLogger";

/**
 * Health heartbeat — periodic check that Base44 backend is responding.
 * Runs every 5 minutes in the background. If the backend goes down,
 * logs to Sentry so you get alerted before users complain.
 */

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BACKEND_URL = import.meta.env.VITE_BASE44_BACKEND_URL || "https://base44.app";
let heartbeatTimer = null;
let consecutiveFailures = 0;

async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(`${BACKEND_URL}/api/health`, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      consecutiveFailures++;
      onFailure(`Backend returned ${res.status}`);
    } else {
      if (consecutiveFailures > 0) {
        console.log(`✅ Backend recovered after ${consecutiveFailures} failures`);
      }
      consecutiveFailures = 0;
    }
  } catch (err) {
    consecutiveFailures++;
    onFailure(err.name === "AbortError" ? "Backend timeout (>10s)" : err.message);
  }
}

function onFailure(reason) {
  // Only report to Sentry after 2+ consecutive failures (avoid transient blips)
  if (consecutiveFailures >= 2) {
    logCrash(new Error(`Health check failed: ${reason}`), {
      page: "system",
      action: "healthCheck",
      severity: consecutiveFailures >= 3 ? "fatal" : "warning",
      extra: { consecutiveFailures, reason },
    });
  }
  console.warn(`⚠️ Health check failed (${consecutiveFailures}x): ${reason}`);
}

/** Start the background heartbeat. Call once on app load. */
export function startHealthCheck() {
  if (heartbeatTimer) return;

  // First check after 30s (let app finish loading)
  setTimeout(() => {
    checkHealth();
    heartbeatTimer = setInterval(checkHealth, HEARTBEAT_INTERVAL);
  }, 30000);
}

/** Stop the heartbeat (e.g. on app unmount). */
export function stopHealthCheck() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

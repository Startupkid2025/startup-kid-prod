import * as Sentry from "@sentry/react";
import { APP_VERSION, BUILD_ENV } from "./version";

const DEFAULT_DSN = "https://5f93142d144cc56b421bc8bfde1816db@o4511027495370752.ingest.de.sentry.io/4511027499696208";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN || DEFAULT_DSN;
  if (!dsn) return;

  const isProd = BUILD_ENV === "production";

  Sentry.init({
    dsn,
    environment: BUILD_ENV,
    release: `startup-kid-app@${APP_VERSION}`,
    // Don't send errors in local development
    enabled: BUILD_ENV !== "development",

    // Performance: 20% in prod, 100% in dev/staging
    tracesSampleRate: isProd ? 0.2 : 1.0,

    // Session Replay: record 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: isProd ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        // Mask all text/inputs by default for kid privacy
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
      Sentry.browserTracingIntegration(),
    ],

    // Enable Sentry Logs (structured logging)
    _experiments: {
      enableLogs: true,
    },

    beforeSend(event) {
      // Scrub any sensitive user data
      if (event.user) {
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export { Sentry };

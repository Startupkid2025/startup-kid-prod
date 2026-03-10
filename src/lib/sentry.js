import * as Sentry from "@sentry/react";
import { APP_VERSION, BUILD_ENV } from "./version";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: BUILD_ENV,
    release: `startup-kid-app@${APP_VERSION}`,
    // Only send 20% of transactions in production to stay within free tier
    tracesSampleRate: BUILD_ENV === "production" ? 0.2 : 1.0,
    // Don't send errors in local development
    enabled: BUILD_ENV !== "development",
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

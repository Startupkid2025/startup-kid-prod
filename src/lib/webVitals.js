import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";
import { reportMetricToSentry } from "./sentry";
import { BUILD_ENV } from "./version";

/**
 * Core Web Vitals tracking.
 * Measures real user performance and sends to Sentry.
 *
 * Metrics:
 *   LCP  - Largest Contentful Paint (loading speed)
 *   INP  - Interaction to Next Paint (interactivity, replaces FID)
 *   CLS  - Cumulative Layout Shift (visual stability)
 *   FCP  - First Contentful Paint (initial render)
 *   TTFB - Time to First Byte (server response)
 */

function handleMetric(metric) {
  // Human-readable console log in dev
  if (BUILD_ENV !== "production") {
    const color = metric.rating === "good" ? "🟢" : metric.rating === "needs-improvement" ? "🟡" : "🔴";
    console.log(`${color} ${metric.name}: ${Math.round(metric.value)}ms [${metric.rating}]`);
  }

  reportMetricToSentry(metric);
}

export function initWebVitals() {
  try {
    onLCP(handleMetric);
    onINP(handleMetric);
    onCLS(handleMetric);
    onFCP(handleMetric);
    onTTFB(handleMetric);
  } catch (e) {
    // web-vitals not supported in this browser — silently skip
  }
}

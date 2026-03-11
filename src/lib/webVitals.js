import { reportMetricToSentry } from "./sentry";
import { BUILD_ENV } from "./version";

/**
 * Core Web Vitals tracking.
 * Measures real user performance and sends to Sentry.
 *
 * Metrics:
 *   LCP  - Largest Contentful Paint (loading speed)
 *   INP  - Interaction to Next Paint (interactivity)
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

export async function initWebVitals() {
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import("web-vitals");
    onLCP(handleMetric);
    onINP(handleMetric);
    onCLS(handleMetric);
    onFCP(handleMetric);
    onTTFB(handleMetric);
  } catch {
    // web-vitals not available or not supported — silently skip
  }
}

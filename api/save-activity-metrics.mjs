/**
 * Vercel serverless endpoint: receives daily activity metrics from
 * the in-app admin dashboard and pushes them to Monday.com.
 *
 * POST /api/save-activity-metrics
 * Headers: x-cron-secret (or query ?secret=)
 * Body: JSON metrics object
 */

import { pushActivityMetrics } from "../scripts/sync-activity-monday.mjs";

export default async function handler(req, res) {
  // CORS for browser requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-cron-secret");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Auth check
  const secret = req.headers["x-cron-secret"] || req.query?.secret;
  if (!secret || secret.trim() !== (process.env.CRON_SECRET || "").trim()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const metrics = req.body;
    if (!metrics || typeof metrics !== "object") {
      return res.status(400).json({ error: "Missing metrics body" });
    }

    const result = await pushActivityMetrics(metrics);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error("save-activity-metrics error:", err);
    return res.status(500).json({ error: err.message });
  }
}

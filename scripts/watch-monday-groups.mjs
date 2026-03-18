#!/usr/bin/env node
/**
 * Watch מנויים board for changes and auto-sync סיכום קבוצות.
 *
 * Polls every N minutes (default: 5) and syncs if subscriber counts changed.
 * Also detects new groups that don't exist in סיכום קבוצות and creates them.
 *
 * Usage:
 *   node scripts/watch-monday-groups.mjs              # poll every 5 min
 *   node scripts/watch-monday-groups.mjs --interval 2 # poll every 2 min
 *   node scripts/watch-monday-groups.mjs --once        # run once and exit
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONDAY_API = "https://api.monday.com/v2";
const SUBSCRIBERS_BOARD_ID = 5092549262;
const SUMMARY_BOARD_ID = 5093097539;

// Column IDs
const COL_GROUP_STATUS = "color_mm13y55s";
const COL_SUB_STATUS = "deal_stage";
const COL_ACTIVE_SUBS = "numeric_mm1cj83f";
const COL_AVAILABLE = "numeric_mm1chfx1";
const COL_MAX = "numeric_mm1cjzqj";
const COL_OCCUPANCY = "color_mm1cpbyk";
const COL_GROUP_NAME = "text_mm1cjdem";

const ACTIVE_STATUS_IDS = [1, 2]; // "רשום מנוי", "נרשם לשיעור ראשון"
const DEFAULT_MAX_CAPACITY = 16;

function getToken() {
  let token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    try {
      const envPath = resolve(__dirname, "../.env");
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^MONDAY_API_TOKEN=(.+)$/m);
      if (match) token = match[1].trim();
    } catch {}
  }
  if (!token) throw new Error("MONDAY_API_TOKEN is required");
  return token;
}

async function mondayQuery(token, query) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`Monday API: ${JSON.stringify(json.errors)}`);
  return json.data;
}

function extractGroupNumber(label) {
  const match = label?.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

async function fetchAllPaginated(token, boardId, columnIds) {
  const items = [];
  const colIds = columnIds.map((c) => `"${c}"`).join(", ");

  const first = await mondayQuery(token, `{
    boards(ids: [${boardId}]) {
      items_page(limit: 500) {
        cursor
        items {
          id name
          column_values(ids: [${colIds}]) {
            id text
            ... on StatusValue { index }
          }
        }
      }
    }
  }`);

  const page = first.boards[0].items_page;
  items.push(...page.items);
  let cursor = page.cursor;

  while (cursor) {
    const next = await mondayQuery(token, `{
      next_items_page(limit: 500, cursor: "${cursor}") {
        cursor
        items {
          id name
          column_values(ids: [${colIds}]) {
            id text
            ... on StatusValue { index }
          }
        }
      }
    }`);
    items.push(...next.next_items_page.items);
    cursor = next.next_items_page.cursor;
  }

  return items;
}

async function syncOnce(token) {
  const timestamp = new Date().toLocaleTimeString("he-IL");

  // Fetch subscribers
  const subscribers = await fetchAllPaginated(token, SUBSCRIBERS_BOARD_ID, [COL_GROUP_STATUS, COL_SUB_STATUS]);

  // Count active per group
  const groupCounts = {};
  const groupLabels = {};

  for (const item of subscribers) {
    const statusCol = item.column_values.find((c) => c.id === COL_SUB_STATUS);
    const groupCol = item.column_values.find((c) => c.id === COL_GROUP_STATUS);

    if (!statusCol || !ACTIVE_STATUS_IDS.includes(statusCol.index)) continue;
    if (!groupCol?.text) continue;

    const groupNum = extractGroupNumber(groupCol.text);
    if (groupNum === null) continue;

    groupCounts[groupNum] = (groupCounts[groupNum] || 0) + 1;
    groupLabels[groupNum] = groupCol.text;
  }

  // Fetch summary items
  const summaryItems = await fetchAllPaginated(token, SUMMARY_BOARD_ID, [COL_MAX, COL_ACTIVE_SUBS, COL_AVAILABLE, COL_OCCUPANCY]);

  const existingGroups = new Set();
  const updates = [];

  for (const item of summaryItems) {
    const groupNum = extractGroupNumber(item.name);
    if (groupNum === null) continue;
    existingGroups.add(groupNum);

    const maxCol = item.column_values.find((c) => c.id === COL_MAX);
    const maxCapacity = parseInt(maxCol?.text, 10) || DEFAULT_MAX_CAPACITY;
    const activeCount = groupCounts[groupNum] || 0;
    const available = Math.max(0, maxCapacity - activeCount);
    const occupancyLabel = available <= 0 ? "Full" : "Open";

    const currentActive = item.column_values.find((c) => c.id === COL_ACTIVE_SUBS);
    const currentAvail = item.column_values.find((c) => c.id === COL_AVAILABLE);
    const currentOccupancy = item.column_values.find((c) => c.id === COL_OCCUPANCY);

    if (
      parseInt(currentActive?.text, 10) === activeCount &&
      parseInt(currentAvail?.text, 10) === available &&
      currentOccupancy?.text === occupancyLabel
    ) {
      continue; // No change
    }

    console.log(`  [${timestamp}] קבוצה #${groupNum}: ${currentActive?.text || "?"} → ${activeCount}/${maxCapacity} (${occupancyLabel})`);

    const columnValues = JSON.stringify({
      [COL_ACTIVE_SUBS]: String(activeCount),
      [COL_AVAILABLE]: String(available),
      [COL_OCCUPANCY]: { label: occupancyLabel },
    });

    updates.push(
      mondayQuery(token, `mutation {
        change_multiple_column_values(
          board_id: ${SUMMARY_BOARD_ID},
          item_id: ${item.id},
          column_values: ${JSON.stringify(columnValues)}
        ) { id }
      }`)
    );
  }

  // Create new groups that exist in מנויים but not in סיכום קבוצות
  for (const [groupNumStr, label] of Object.entries(groupLabels)) {
    const groupNum = parseInt(groupNumStr, 10);
    if (existingGroups.has(groupNum)) continue;

    const activeCount = groupCounts[groupNum] || 0;
    const available = Math.max(0, DEFAULT_MAX_CAPACITY - activeCount);
    const occupancyLabel = available <= 0 ? "Full" : "Open";

    console.log(`  [${timestamp}] NEW: קבוצה #${groupNum} — ${activeCount}/${DEFAULT_MAX_CAPACITY} (${occupancyLabel})`);

    const columnValues = JSON.stringify({
      [COL_GROUP_NAME]: label,
      [COL_ACTIVE_SUBS]: String(activeCount),
      [COL_MAX]: String(DEFAULT_MAX_CAPACITY),
      [COL_AVAILABLE]: String(available),
      [COL_OCCUPANCY]: { label: occupancyLabel },
    });

    updates.push(
      mondayQuery(token, `mutation {
        create_item(
          board_id: ${SUMMARY_BOARD_ID},
          item_name: "קבוצה #${groupNum}",
          column_values: ${JSON.stringify(columnValues)},
          create_labels_if_missing: true
        ) { id }
      }`)
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
    console.log(`  [${timestamp}] Synced ${updates.length} changes`);
  }

  return updates.length;
}

// ── Main ─────────────────────────────────────────────────

const args = process.argv.slice(2);
const once = args.includes("--once");
const intervalIdx = args.indexOf("--interval");
const intervalMin = intervalIdx > -1 ? parseInt(args[intervalIdx + 1], 10) : 5;

const token = getToken();

if (once) {
  console.log("Running group sync (once)...");
  syncOnce(token)
    .then((n) => {
      console.log(n > 0 ? `Done: ${n} updates` : "Already up to date");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
} else {
  console.log(`Watching מנויים → סיכום קבוצות (every ${intervalMin}m)`);
  console.log("Press Ctrl+C to stop\n");

  const run = async () => {
    try {
      await syncOnce(token);
    } catch (err) {
      console.error(`  [${new Date().toLocaleTimeString("he-IL")}] Error: ${err.message}`);
    }
  };

  // Run immediately, then on interval
  run();
  setInterval(run, intervalMin * 60 * 1000);
}

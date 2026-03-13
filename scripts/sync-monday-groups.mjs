#!/usr/bin/env node
/**
 * Sync מנויים board → סיכום קבוצות board on Monday.com
 *
 * Counts active subscribers (סטטוס = "רשום מנוי" or "נרשם לשיעור ראשון") per קבוצה in the מנויים board,
 * then updates מנויים פעילים, מקומות פנויים, and סטטוס תפוסה in סיכום קבוצות.
 *
 * Usage:
 *   MONDAY_API_TOKEN=xxx node scripts/sync-monday-groups.mjs
 *
 * Can also be imported as a module for use in a serverless function.
 */

const MONDAY_API = 'https://api.monday.com/v2';
const SUBSCRIBERS_BOARD_ID = 5092549262;   // מנויים
const SUMMARY_BOARD_ID    = 5093097539;    // סיכום קבוצות

// Column IDs
const COL_GROUP_STATUS   = 'color_mm13y55s';  // קבוצה (status) in מנויים
const COL_SUB_STATUS     = 'deal_stage';       // סטטוס (status) in מנויים
const COL_ACTIVE_SUBS    = 'numeric_mm1cj83f'; // מנויים פעילים in סיכום קבוצות
const COL_AVAILABLE      = 'numeric_mm1chfx1'; // מקומות פנויים in סיכום קבוצות
const COL_MAX            = 'numeric_mm1cjzqj'; // מקסימום משתתפים in סיכום קבוצות
const COL_OCCUPANCY      = 'color_mm1cpbyk';   // סטטוס תפוסה in סיכום קבוצות

// Active status label IDs in מנויים סטטוס column
// 1 = "רשום מנוי", 2 = "נרשם לשיעור ראשון"
const ACTIVE_STATUS_LABEL_IDS = [1, 2];

function getToken() {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error('MONDAY_API_TOKEN env var is required');
  return token;
}

async function mondayQuery(token, query, variables = {}) {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'API-Version': '2024-10',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Monday API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

/**
 * Extract group number from a label like "קבוצה #3 - ימי שני 17:00 - בוגרים"
 */
function extractGroupNumber(label) {
  const match = label.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Fetch all subscribers from מנויים with their קבוצה and סטטוס columns.
 * Uses cursor-based pagination.
 */
async function fetchAllSubscribers(token) {
  const items = [];
  let cursor = null;

  // First page
  const firstQuery = `query {
    boards(ids: ${SUBSCRIBERS_BOARD_ID}) {
      items_page(limit: 500) {
        cursor
        items {
          id
          column_values(ids: ["${COL_GROUP_STATUS}", "${COL_SUB_STATUS}"]) {
            id
            text
            ... on StatusValue { index }
          }
        }
      }
    }
  }`;

  const firstData = await mondayQuery(token, firstQuery);
  const firstPage = firstData.boards[0].items_page;
  items.push(...firstPage.items);
  cursor = firstPage.cursor;

  // Subsequent pages
  while (cursor) {
    const nextQuery = `query {
      next_items_page(limit: 500, cursor: "${cursor}") {
        cursor
        items {
          id
          column_values(ids: ["${COL_GROUP_STATUS}", "${COL_SUB_STATUS}"]) {
            id
            text
            ... on StatusValue { index }
          }
        }
      }
    }`;
    const nextData = await mondayQuery(token, nextQuery);
    const nextPage = nextData.next_items_page;
    items.push(...nextPage.items);
    cursor = nextPage.cursor;
  }

  return items;
}

/**
 * Fetch all items from סיכום קבוצות with their current values.
 */
async function fetchSummaryItems(token) {
  const query = `query {
    boards(ids: ${SUMMARY_BOARD_ID}) {
      items_page(limit: 50) {
        items {
          id
          name
          column_values(ids: ["${COL_MAX}", "${COL_ACTIVE_SUBS}", "${COL_AVAILABLE}", "${COL_OCCUPANCY}"]) {
            id
            text
          }
        }
      }
    }
  }`;
  const data = await mondayQuery(token, query);
  return data.boards[0].items_page.items;
}

/**
 * Main sync logic. Can be called from CLI or from a serverless handler.
 */
export async function syncGroups(token) {
  console.log('Fetching subscribers from מנויים...');
  const subscribers = await fetchAllSubscribers(token);
  console.log(`  Found ${subscribers.length} total subscribers`);

  // Count active subscribers per group
  const groupCounts = {}; // { groupNumber: count }

  for (const item of subscribers) {
    const statusCol = item.column_values.find(c => c.id === COL_SUB_STATUS);
    const groupCol = item.column_values.find(c => c.id === COL_GROUP_STATUS);

    // Only count active statuses: "רשום מנוי" (1) or "נרשם לשיעור ראשון" (2)
    if (!statusCol || !ACTIVE_STATUS_LABEL_IDS.includes(statusCol.index)) continue;
    if (!groupCol || !groupCol.text) continue;

    const groupNum = extractGroupNumber(groupCol.text);
    if (groupNum === null) continue;

    groupCounts[groupNum] = (groupCounts[groupNum] || 0) + 1;
  }

  console.log('Active subscriber counts per group:', groupCounts);

  // Fetch summary board items
  console.log('Fetching סיכום קבוצות items...');
  const summaryItems = await fetchSummaryItems(token);

  // Update each summary item
  const updates = [];
  for (const item of summaryItems) {
    const groupNum = extractGroupNumber(item.name);
    if (groupNum === null) continue;

    const maxCol = item.column_values.find(c => c.id === COL_MAX);
    const maxCapacity = maxCol ? parseInt(maxCol.text, 10) || 0 : 0;
    const activeCount = groupCounts[groupNum] || 0;
    const available = Math.max(0, maxCapacity - activeCount);
    const occupancyLabel = available <= 0 ? 'Full' : 'Open';

    // Check if update is needed
    const currentActive = item.column_values.find(c => c.id === COL_ACTIVE_SUBS);
    const currentAvail = item.column_values.find(c => c.id === COL_AVAILABLE);
    const currentOccupancy = item.column_values.find(c => c.id === COL_OCCUPANCY);

    if (
      parseInt(currentActive?.text, 10) === activeCount &&
      parseInt(currentAvail?.text, 10) === available &&
      currentOccupancy?.text === occupancyLabel
    ) {
      console.log(`  קבוצה #${groupNum}: no change (${activeCount}/${maxCapacity})`);
      continue;
    }

    console.log(`  קבוצה #${groupNum}: ${activeCount}/${maxCapacity} → ${occupancyLabel}`);

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

  if (updates.length > 0) {
    await Promise.all(updates);
    console.log(`Updated ${updates.length} groups`);
  } else {
    console.log('All groups already up to date');
  }

  return { updated: updates.length, groups: groupCounts };
}

// CLI entry point
if (process.argv[1]?.endsWith('sync-monday-groups.mjs')) {
  const token = getToken();
  syncGroups(token)
    .then(result => {
      console.log('Done:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}

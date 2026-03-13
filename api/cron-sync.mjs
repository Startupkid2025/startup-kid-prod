import { syncGroups } from '../scripts/sync-monday-groups.mjs';
import { syncClockifyMonday } from '../scripts/sync-clockify-monday.mjs';

/**
 * Vercel serverless cron endpoint — runs all periodic syncs:
 * 1. מנויים → סיכום קבוצות (group subscriber counts)
 * 2. Backfill "עבר שיעור ניסיון" checkbox for trial subscribers
 * 3. Calculate days-to-close for items missing it
 * 4. Clockify hours/subscriber ratio (monthly)
 *
 * Called every 5 minutes via GitHub Actions.
 * Protected by CRON_SECRET to prevent unauthorized access.
 */

const MONDAY_API = 'https://api.monday.com/v2';
const SUBSCRIBERS_BOARD_ID = 5092549262;
const COL_SUB_STATUS = 'deal_stage';
const COL_CHECKBOX = 'boolean_mm1ddfmv';
const COL_CLOSE_DATE = 'date_mm13smd7';       // תאריך סגירת ליד
const COL_DAYS_TO_CLOSE = 'numeric_mm1d3q3z'; // ימים עד סגירה

async function mondayQuery(token, query) {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'API-Version': '2024-10',
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`Monday API: ${JSON.stringify(json.errors)}`);
  return json.data;
}

/**
 * Find items currently at "נרשם לשיעור ראשון" whose checkbox is unchecked,
 * and check them.
 */
async function backfillTrialCheckbox(token) {
  const query = `query {
    boards(ids: ${SUBSCRIBERS_BOARD_ID}) {
      items_page(limit: 500, query_params: {rules: [
        {column_id: "${COL_SUB_STATUS}", compare_value: [2], operator: any_of}
      ]}) {
        items {
          id
          name
          column_values(ids: ["${COL_CHECKBOX}"]) {
            id
            text
          }
        }
      }
    }
  }`;

  const data = await mondayQuery(token, query);
  const items = data.boards[0].items_page.items;

  const unchecked = items.filter(item => {
    const cb = item.column_values.find(c => c.id === COL_CHECKBOX);
    return !cb || cb.text !== 'v';
  });

  if (unchecked.length === 0) {
    return { checked: 0, total: items.length };
  }

  const colValues = JSON.stringify({ [COL_CHECKBOX]: { checked: 'true' } });
  const updates = unchecked.map(item =>
    mondayQuery(token, `mutation {
      change_multiple_column_values(
        board_id: ${SUBSCRIBERS_BOARD_ID},
        item_id: ${item.id},
        column_values: ${JSON.stringify(colValues)}
      ) { id }
    }`)
  );

  await Promise.all(updates);
  return { checked: unchecked.length, total: items.length };
}

/**
 * Calculate days between item creation and סגירת ליד for items
 * that have a close date but no value in ימים עד סגירה.
 */
async function calcDaysToClose(token) {
  let cursor = null;
  const toUpdate = [];

  const firstQuery = `query {
    boards(ids: ${SUBSCRIBERS_BOARD_ID}) {
      items_page(limit: 500) {
        cursor
        items {
          id
          created_at
          column_values(ids: ["${COL_CLOSE_DATE}", "${COL_DAYS_TO_CLOSE}"]) {
            id
            text
          }
        }
      }
    }
  }`;

  const firstData = await mondayQuery(token, firstQuery);
  const firstPage = firstData.boards[0].items_page;
  processItems(firstPage.items, toUpdate);
  cursor = firstPage.cursor;

  while (cursor) {
    const nextQuery = `query {
      next_items_page(limit: 500, cursor: "${cursor}") {
        cursor
        items {
          id
          created_at
          column_values(ids: ["${COL_CLOSE_DATE}", "${COL_DAYS_TO_CLOSE}"]) {
            id
            text
          }
        }
      }
    }`;
    const nextData = await mondayQuery(token, nextQuery);
    const nextPage = nextData.next_items_page;
    processItems(nextPage.items, toUpdate);
    cursor = nextPage.cursor;
  }

  if (toUpdate.length === 0) {
    return { updated: 0 };
  }

  const updates = toUpdate.map(({ id, days }) => {
    const colValues = JSON.stringify({ [COL_DAYS_TO_CLOSE]: String(days) });
    return mondayQuery(token, `mutation {
      change_multiple_column_values(
        board_id: ${SUBSCRIBERS_BOARD_ID},
        item_id: ${id},
        column_values: ${JSON.stringify(colValues)}
      ) { id }
    }`);
  });

  await Promise.all(updates);
  return { updated: toUpdate.length };
}

function processItems(items, toUpdate) {
  for (const item of items) {
    const closeCol = item.column_values.find(c => c.id === COL_CLOSE_DATE);
    const daysCol = item.column_values.find(c => c.id === COL_DAYS_TO_CLOSE);

    if (daysCol?.text) continue;
    if (!closeCol?.text || !item.created_at) continue;

    const closeDate = new Date(closeCol.text);
    const createdDate = new Date(item.created_at);
    const days = Math.round((closeDate - createdDate) / (1000 * 60 * 60 * 24));

    if (!isNaN(days) && days >= 0) {
      toUpdate.push({ id: item.id, days });
    }
  }
}

export default async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  const expected = (process.env.CRON_SECRET || '').trim();
  if (!expected) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }
  if (secret.trim() !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'MONDAY_API_TOKEN not set' });
  }

  const results = {};

  try {
    results.groups = await syncGroups(token);
  } catch (err) {
    console.error('Group sync failed:', err);
    results.groups = { error: err.message };
  }

  try {
    results.trial = await backfillTrialCheckbox(token);
  } catch (err) {
    console.error('Trial backfill failed:', err);
    results.trial = { error: err.message };
  }

  try {
    results.daysToClose = await calcDaysToClose(token);
  } catch (err) {
    console.error('Days-to-close calc failed:', err);
    results.daysToClose = { error: err.message };
  }

  try {
    const clockifyKey = process.env.CLOCKIFY_API_KEY;
    if (clockifyKey) {
      results.clockify = await syncClockifyMonday({ clockifyKey, mondayToken: token });
    } else {
      results.clockify = { skipped: 'CLOCKIFY_API_KEY not set' };
    }
  } catch (err) {
    console.error('Clockify sync failed:', err);
    results.clockify = { error: err.message };
  }

  return res.status(200).json({ ok: true, ...results });
}

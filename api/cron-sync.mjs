import { syncGroups } from '../scripts/sync-monday-groups.mjs';
import { syncClockifyMonday } from '../scripts/sync-clockify-monday.mjs';

/**
 * Vercel serverless cron endpoint — runs all periodic syncs:
 * 1. מנויים → סיכום קבוצות (group subscriber counts)
 * 2. Backfill "עבר שיעור ניסיון" checkbox for trial subscribers
 * 3. Clockify hours/subscriber ratio (monthly)
 *
 * Called every 5 minutes via GitHub Actions.
 * Protected by CRON_SECRET to prevent unauthorized access.
 */

const MONDAY_API = 'https://api.monday.com/v2';
const SUBSCRIBERS_BOARD_ID = 5092549262;
const COL_SUB_STATUS = 'deal_stage';
const COL_CHECKBOX = 'boolean_mm1ddfmv';

// Status index 2 = "נרשם לשיעור ראשון"
const TRIAL_STATUS_INDEX = 2;

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
  // Get items with status = נרשם לשיעור ראשון
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

  // Filter to only unchecked items
  const unchecked = items.filter(item => {
    const cb = item.column_values.find(c => c.id === COL_CHECKBOX);
    return !cb || cb.text !== 'v';
  });

  if (unchecked.length === 0) {
    return { checked: 0, total: items.length };
  }

  // Update unchecked items
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

export default async function handler(req, res) {
  // Verify cron secret
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  const expected = (process.env.CRON_SECRET || '').trim();
  if (!expected) {
    console.error('CRON_SECRET env var not set');
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
    // 1. Sync group subscriber counts
    results.groups = await syncGroups(token);
  } catch (err) {
    console.error('Group sync failed:', err);
    results.groups = { error: err.message };
  }

  try {
    // 2. Backfill trial checkboxes
    results.trial = await backfillTrialCheckbox(token);
  } catch (err) {
    console.error('Trial backfill failed:', err);
    results.trial = { error: err.message };
  }

  try {
    // 3. Clockify hours/subscriber ratio
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

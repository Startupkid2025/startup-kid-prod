#!/usr/bin/env node
/**
 * Sync Clockify sales hours + Monday.com new subscribers → hours/subscriber ratio
 *
 * Pulls monthly sales hours per user from Clockify, counts new subscribers per
 * sales rep from Monday.com, calculates efficiency (hours/subscriber), and
 * updates a Monday.com board with the results.
 *
 * Usage:
 *   CLOCKIFY_API_KEY=xxx MONDAY_API_TOKEN=xxx node scripts/sync-clockify-monday.mjs
 *   CLOCKIFY_API_KEY=xxx MONDAY_API_TOKEN=xxx node scripts/sync-clockify-monday.mjs --month 2026-03
 *
 * Can also be imported as a module for use in a serverless function.
 */

// ── Config ──────────────────────────────────────────────────────────────────

const CLOCKIFY_API = 'https://api.clockify.me/api/v1';
const CLOCKIFY_WORKSPACE = '69661988557749519a605e80';
const CLOCKIFY_SALES_PROJECTS = [
  '699f3e84c6c3ec20a935775a',   // main sales project
  '69ad58dbbd4b9f62038a448b',   // Itay's sales project
];

const MONDAY_API = 'https://api.monday.com/v2';
const SUBSCRIBERS_BOARD_ID = 5092549262;  // מנויים

// Monday column IDs
const COL_DEAL_OWNER  = 'deal_owner';       // people – sales rep
const COL_CLOSE_DATE  = 'date_mm13smd7';    // תאריך סגירת ליד
const COL_DEAL_STAGE  = 'deal_stage';        // סטטוס

// Active deal_stage indices: 1 = "רשום מנוי", 2 = "נרשם לשיעור ראשון"
const ACTIVE_STATUS_INDICES = [1, 2];

// Clockify user ID → { name, email }
const CLOCKIFY_USERS = {
  '69a4336824d877367949000e': { name: 'adir',        email: 'adir@startupkid.co.il' },
  '69a8351bef44a71480b6f94c': { name: 'dorit',       email: 'dorit@startupkid.co.il' },
  '69ad58b4d897bbc49b2ddc10': { name: 'Itay Mehir',  email: 'itay@startupkid.co.il' },
  '69a8193a30d28c13c1f46bbe': { name: 'karin',       email: 'karin@startupkid.co.il' },
  '69661988557749519a605e85': { name: 'omer',         email: 'omer@startupkid.co.il' },
  '69a41ef275e5c0a754636896': { name: 'Paz Shabat',  email: 'paz@startupkid.co.il' },
  '69a4195ebcff313d873f78e8': { name: 'shilat',      email: 'shilat@startupkid.co.il' },
};

// Monday users who have personal emails that differ from Clockify
// Maps Monday email → Clockify email for matching
const EMAIL_ALIASES = {
  'adiryoav@gmail.com':       'adir@startupkid.co.il',
  'karinkazav@gmail.com':     'karin@startupkid.co.il',
  'korilihi0209@gmail.com':   null, // ליהי — not in Clockify
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getClockifyKey() {
  const key = process.env.CLOCKIFY_API_KEY;
  if (!key) throw new Error('CLOCKIFY_API_KEY env var is required');
  return key;
}

function getMondayToken() {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error('MONDAY_API_TOKEN env var is required');
  return token;
}

/**
 * Parse --month YYYY-MM from argv, default to current month.
 * Returns { start: Date, end: Date, label: 'YYYY-MM' }
 */
function parseMonth(args) {
  const idx = args.indexOf('--month');
  let year, month;

  if (idx !== -1 && args[idx + 1]) {
    const [y, m] = args[idx + 1].split('-').map(Number);
    if (!y || !m || m < 1 || m > 12) {
      throw new Error('Invalid --month format. Use YYYY-MM (e.g. 2026-03)');
    }
    year = y;
    month = m;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // first day of next month
  const label = `${year}-${String(month).padStart(2, '0')}`;

  return { start, end, label };
}

/**
 * Parse ISO 8601 duration (e.g. PT1H30M15S) → total hours as a float.
 */
function parseDurationToHours(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours   = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours + minutes / 60 + seconds / 3600;
}

// ── Clockify API ────────────────────────────────────────────────────────────

async function clockifyGet(apiKey, path) {
  const res = await fetch(`${CLOCKIFY_API}${path}`, {
    headers: { 'X-Api-Key': apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Clockify API ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Get total sales hours for a single Clockify user across all sales projects
 * for the given month.
 */
async function getUserSalesHours(apiKey, userId, monthStart, monthEnd) {
  const startISO = monthStart.toISOString();
  const endISO   = monthEnd.toISOString();
  let totalHours = 0;

  for (const projectId of CLOCKIFY_SALES_PROJECTS) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const path = `/workspaces/${CLOCKIFY_WORKSPACE}/user/${userId}/time-entries`
        + `?start=${startISO}&end=${endISO}&project=${projectId}&page-size=500&page=${page}`;
      const entries = await clockifyGet(apiKey, path);

      for (const entry of entries) {
        totalHours += parseDurationToHours(entry.timeInterval?.duration);
      }

      hasMore = entries.length === 500;
      page++;
    }
  }

  return totalHours;
}

// ── Monday API ──────────────────────────────────────────────────────────────

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
 * Fetch all subscribers from מנויים with deal_owner, close date, and deal_stage.
 * Uses cursor-based pagination.
 */
async function fetchAllSubscribers(token) {
  const items = [];
  let cursor = null;

  const columnsFragment = `
    column_values(ids: ["${COL_DEAL_OWNER}", "${COL_CLOSE_DATE}", "${COL_DEAL_STAGE}"]) {
      id
      text
      value
      ... on StatusValue { index }
      ... on PeopleValue {
        persons_and_teams {
          id
          kind
        }
      }
    }
  `;

  // First page
  const firstQuery = `query {
    boards(ids: ${SUBSCRIBERS_BOARD_ID}) {
      items_page(limit: 500) {
        cursor
        items {
          id
          name
          ${columnsFragment}
        }
      }
    }
  }`;

  const firstData = await mondayQuery(token, firstQuery);
  const firstPage = firstData.boards[0].items_page;
  items.push(...firstPage.items);
  cursor = firstPage.cursor;

  while (cursor) {
    const nextQuery = `query {
      next_items_page(limit: 500, cursor: "${cursor}") {
        cursor
        items {
          id
          name
          ${columnsFragment}
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
 * Fetch Monday users so we can map person IDs → emails.
 */
async function fetchMondayUsers(token) {
  const data = await mondayQuery(token, `query { users { id name email } }`);
  return data.users; // [{ id, name, email }]
}

/**
 * Count new subscribers per sales rep email for the given month.
 * Filters by: deal_stage index ∈ ACTIVE_STATUS_INDICES, close date within month.
 */
function countNewSubscribers(subscribers, mondayUsers, monthLabel) {
  // Build person ID → email map
  const personEmailMap = {};
  for (const u of mondayUsers) {
    personEmailMap[u.id] = u.email?.toLowerCase();
  }

  // counts keyed by email
  const counts = {};

  for (const item of subscribers) {
    const stageCol = item.column_values.find(c => c.id === COL_DEAL_STAGE);
    const dateCol  = item.column_values.find(c => c.id === COL_CLOSE_DATE);
    const ownerCol = item.column_values.find(c => c.id === COL_DEAL_OWNER);

    // Must be active status
    if (!stageCol || !ACTIVE_STATUS_INDICES.includes(stageCol.index)) continue;

    // Must have a close date in the target month
    const dateText = dateCol?.text;
    if (!dateText) continue;
    // dateText is typically YYYY-MM-DD
    const dateMonth = dateText.substring(0, 7); // "YYYY-MM"
    if (dateMonth !== monthLabel) continue;

    // Get owner email(s)
    if (!ownerCol) continue;
    const persons = ownerCol.persons_and_teams || [];
    // Also try parsing value JSON as fallback
    let personIds = persons.filter(p => p.kind === 'person').map(p => String(p.id));

    if (personIds.length === 0 && ownerCol.value) {
      try {
        const parsed = JSON.parse(ownerCol.value);
        if (parsed?.personsAndTeams) {
          personIds = parsed.personsAndTeams
            .filter(p => p.kind === 'person')
            .map(p => String(p.id));
        }
      } catch { /* ignore parse errors */ }
    }

    for (const pid of personIds) {
      let email = personEmailMap[pid];
      if (email) {
        // Normalize via alias map (Monday personal email → Clockify work email)
        email = EMAIL_ALIASES[email] ?? email;
        if (email) { // null alias means no Clockify match
          counts[email] = (counts[email] || 0) + 1;
        }
      }
    }
  }

  return counts;
}

// ── Main ────────────────────────────────────────────────────────────────────

/**
 * Main sync function. Returns array of rep results.
 *
 * @param {{ clockifyKey: string, mondayToken: string, month?: string }} opts
 *   month is optional "YYYY-MM" string; defaults to current month.
 */
export async function syncClockifyMonday({ clockifyKey, mondayToken, month }) {
  // Parse month
  const args = month ? ['--month', month] : [];
  const { start, end, label } = parseMonth(args);
  console.log(`\nPeriod: ${label} (${start.toISOString()} → ${end.toISOString()})\n`);

  // 1. Fetch Clockify hours per user (parallel)
  console.log('Fetching Clockify sales hours...');
  const clockifyEntries = Object.entries(CLOCKIFY_USERS);
  const hoursResults = await Promise.all(
    clockifyEntries.map(([userId]) => getUserSalesHours(clockifyKey, userId, start, end))
  );
  const hoursByEmail = {};
  clockifyEntries.forEach(([, user], i) => {
    hoursByEmail[user.email] = hoursResults[i];
    console.log(`  ${user.name}: ${hoursResults[i].toFixed(1)}h`);
  });

  // 2. Fetch Monday subscribers and users (parallel)
  console.log('\nFetching Monday.com subscribers...');
  const [subscribers, mondayUsers] = await Promise.all([
    fetchAllSubscribers(mondayToken),
    fetchMondayUsers(mondayToken),
  ]);
  console.log(`  Found ${subscribers.length} total subscribers`);

  // 3. Count new subscribers per rep
  const subsByEmail = countNewSubscribers(subscribers, mondayUsers, label);
  console.log('  New subscribers per rep:', subsByEmail);

  // 4. Build results table
  const results = [];
  for (const [, user] of clockifyEntries) {
    const hours = hoursByEmail[user.email] || 0;
    const subs  = subsByEmail[user.email]  || 0;
    const ratio = subs > 0 ? hours / subs : null;
    results.push({
      name: user.name,
      email: user.email,
      hours: Math.round(hours * 100) / 100,
      subscribers: subs,
      hoursPerSubscriber: ratio !== null ? Math.round(ratio * 100) / 100 : null,
    });
  }

  // Sort by hours descending
  results.sort((a, b) => b.hours - a.hours);

  // Print table
  console.log('\n' + '─'.repeat(72));
  console.log(
    'Rep'.padEnd(16) +
    'Hours'.padStart(10) +
    'New Subs'.padStart(12) +
    'Hours/Sub'.padStart(14)
  );
  console.log('─'.repeat(72));

  for (const r of results) {
    const ratioStr = r.hoursPerSubscriber !== null
      ? r.hoursPerSubscriber.toFixed(2)
      : '—';
    console.log(
      r.name.padEnd(16) +
      r.hours.toFixed(1).padStart(10) +
      String(r.subscribers).padStart(12) +
      ratioStr.padStart(14)
    );
  }
  console.log('─'.repeat(72));

  // Totals
  const totalHours = results.reduce((s, r) => s + r.hours, 0);
  const totalSubs  = results.reduce((s, r) => s + r.subscribers, 0);
  const totalRatio = totalSubs > 0 ? totalHours / totalSubs : null;
  console.log(
    'TOTAL'.padEnd(16) +
    totalHours.toFixed(1).padStart(10) +
    String(totalSubs).padStart(12) +
    (totalRatio !== null ? totalRatio.toFixed(2) : '—').padStart(14)
  );
  console.log('─'.repeat(72) + '\n');

  // 5. Update (or create) Monday board with results
  await updateMondayBoard(mondayToken, results, label);

  return results;
}

// ── Monday Board Update ─────────────────────────────────────────────────────

// The results board will be created/found dynamically.
// Board name: "שעות/מנוי - סיכום מכירות"
const RESULTS_BOARD_NAME = 'שעות/מנוי - סיכום מכירות';

async function findOrCreateResultsBoard(token) {
  // Search for existing board by name
  const searchData = await mondayQuery(token, `query {
    boards(limit: 50) {
      id
      name
    }
  }`);

  const existing = searchData.boards.find(b => b.name === RESULTS_BOARD_NAME);
  if (existing) {
    return existing.id;
  }

  // Create new board
  console.log(`Creating Monday board: ${RESULTS_BOARD_NAME}`);
  const createData = await mondayQuery(token, `mutation {
    create_board(
      board_name: ${JSON.stringify(RESULTS_BOARD_NAME)},
      board_kind: public
    ) { id }
  }`);
  const boardId = createData.create_board.id;

  // Add columns: חודש (text), שעות (numbers), מנויים חדשים (numbers), שעות/מנוי (numbers)
  const columns = [
    { id: 'month',     title: 'חודש',           type: 'text' },
    { id: 'hours',     title: 'שעות מכירות',    type: 'numbers' },
    { id: 'new_subs',  title: 'מנויים חדשים',   type: 'numbers' },
    { id: 'ratio',     title: 'שעות/מנוי',      type: 'numbers' },
  ];

  for (const col of columns) {
    await mondayQuery(token, `mutation {
      create_column(
        board_id: ${boardId},
        id: ${JSON.stringify(col.id)},
        title: ${JSON.stringify(col.title)},
        column_type: ${col.type}
      ) { id }
    }`);
  }

  return boardId;
}

async function updateMondayBoard(token, results, monthLabel) {
  console.log('Updating Monday results board...');
  const boardId = await findOrCreateResultsBoard(token);

  // Fetch existing items to find rows for this month
  const data = await mondayQuery(token, `query {
    boards(ids: ${boardId}) {
      items_page(limit: 500) {
        items {
          id
          name
          column_values(ids: ["month"]) {
            id
            text
          }
        }
      }
    }
  }`);

  const existingItems = data.boards[0].items_page.items;

  for (const rep of results) {
    // Item name format: "adir - 2026-03"
    const itemName = `${rep.name} - ${monthLabel}`;
    const existing = existingItems.find(item => item.name === itemName);

    const columnValues = JSON.stringify({
      month:    monthLabel,
      hours:    String(rep.hours),
      new_subs: String(rep.subscribers),
      ratio:    rep.hoursPerSubscriber !== null ? String(rep.hoursPerSubscriber) : '',
    });

    if (existing) {
      // Update existing item
      await mondayQuery(token, `mutation {
        change_multiple_column_values(
          board_id: ${boardId},
          item_id: ${existing.id},
          column_values: ${JSON.stringify(columnValues)}
        ) { id }
      }`);
      console.log(`  Updated: ${itemName}`);
    } else {
      // Create new item
      await mondayQuery(token, `mutation {
        create_item(
          board_id: ${boardId},
          item_name: ${JSON.stringify(itemName)},
          column_values: ${JSON.stringify(columnValues)}
        ) { id }
      }`);
      console.log(`  Created: ${itemName}`);
    }
  }

  console.log(`Results board updated (board ID: ${boardId})`);
}

// ── CLI Entry Point ─────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('sync-clockify-monday.mjs')) {
  const clockifyKey  = getClockifyKey();
  const mondayToken  = getMondayToken();
  const { label }    = parseMonth(process.argv.slice(2));

  syncClockifyMonday({ clockifyKey, mondayToken, month: label })
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}

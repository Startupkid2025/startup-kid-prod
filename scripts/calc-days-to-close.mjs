#!/usr/bin/env node
/**
 * One-time + cron: calculate ימים עד סגירה for items with both dates.
 */

const MONDAY_API = 'https://api.monday.com/v2';
const BOARD = 5092549262;
const COL_CLOSE = 'date_mm13smd7';
const COL_INTRO = 'date_mm14r0vp';
const COL_DAYS = 'numeric_mm1d3q3z';

const token = process.env.MONDAY_API_TOKEN;
if (!token) { console.error('MONDAY_API_TOKEN required'); process.exit(1); }

async function mq(query) {
  const r = await fetch(MONDAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'API-Version': '2024-10' },
    body: JSON.stringify({ query })
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const toUpdate = [];
const cols = `"${COL_CLOSE}", "${COL_DAYS}"`;

// First page
const first = await mq(`query { boards(ids: ${BOARD}) { items_page(limit: 500) { cursor items { id name created_at column_values(ids: [${cols}]) { id text } } } } }`);
let cursor = first.boards[0].items_page.cursor;
processItems(first.boards[0].items_page.items);

// Subsequent pages
while (cursor) {
  const next = await mq(`query { next_items_page(limit: 500, cursor: "${cursor}") { cursor items { id name created_at column_values(ids: [${cols}]) { id text } } } }`);
  processItems(next.next_items_page.items);
  cursor = next.next_items_page.cursor;
}

function processItems(items) {
  for (const item of items) {
    const close = item.column_values.find(c => c.id === COL_CLOSE);
    const days = item.column_values.find(c => c.id === COL_DAYS);
    if (days && days.text) continue;
    if (!close || !close.text || !item.created_at) continue;
    const d = Math.round((new Date(close.text) - new Date(item.created_at)) / 86400000);
    if (!isNaN(d) && d >= 0) toUpdate.push({ id: item.id, name: item.name, days: d });
  }
}

console.log(`Found ${toUpdate.length} items to update`);
for (const { id, name, days } of toUpdate) {
  console.log(`  ${name}: ${days} days`);
  const cv = JSON.stringify({ [COL_DAYS]: String(days) });
  await mq(`mutation { change_multiple_column_values(board_id: ${BOARD}, item_id: ${id}, column_values: ${JSON.stringify(cv)}) { id } }`);
}
console.log('Done');

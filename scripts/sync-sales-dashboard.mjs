#!/usr/bin/env node
/**
 * Marketing & Sales Dashboard — Monday.com
 *
 * Creates/updates dashboard boards in the CRM workspace:
 *
 * 1. "לידים - דשבורד מכירות" (Leads Sales Dashboard)
 *    - Leads by day/week/month
 *    - Per rep: leads handled, closed, conversion %
 *
 * 2. Updates "MRR חודשי" with trend data
 *
 * 3. "יעדי מכירות" (Sales Targets)
 *    - Per rep: % contribution to target
 *    - New subs from leads (credit card confirmed)
 *
 * Usage:
 *   node scripts/sync-sales-dashboard.mjs
 *   node scripts/sync-sales-dashboard.mjs --month 2026-03
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONDAY_API = "https://api.monday.com/v2";
const CRM_WORKSPACE_ID = 5906908;

// Existing board IDs
const LEADS_BOARD_ID = 5092549259;
const SUBSCRIBERS_BOARD_ID = 5092549262;
const MRR_BOARD_ID = 5093073935;

// Dashboard board IDs (set after find-or-create)
let SALES_DASHBOARD_BOARD_ID = null;
let SALES_TARGETS_BOARD_ID = null;

// ── Config ───────────────────────────────────────────────

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

async function mondayQuery(token, query, variables = {}) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`Monday API: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// ── Helpers ──────────────────────────────────────────────

function getDateRange(monthStr) {
  // monthStr like "2026-03" or auto-detect current month
  const now = new Date();
  const year = monthStr ? parseInt(monthStr.split("-")[0]) : now.getFullYear();
  const month = monthStr ? parseInt(monthStr.split("-")[1]) - 1 : now.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Week = last 7 days
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return {
    month: { start: firstOfMonth, end: lastOfMonth },
    week: { start: weekAgo, end: now },
    today: now,
    monthLabel: firstOfMonth.toLocaleDateString("he-IL", { month: "long", year: "numeric" }),
  };
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// ── Data Fetching ────────────────────────────────────────

async function fetchAllLeads(token) {
  let allItems = [];
  let cursor = null;

  // First page
  const firstPage = await mondayQuery(token, `{
    boards(ids: [${LEADS_BOARD_ID}]) {
      items_page(limit: 500) {
        cursor
        items {
          name
          column_values(ids: ["lead_status", "multiple_person_mm12pv9x", "date_mm122r8w", "date_mm13df9m"]) {
            id text
          }
        }
      }
    }
  }`);

  const page = firstPage.boards[0].items_page;
  allItems = page.items;
  cursor = page.cursor;

  // Subsequent pages
  while (cursor) {
    const nextPage = await mondayQuery(token, `{
      next_items_page(limit: 500, cursor: "${cursor}") {
        cursor
        items {
          name
          column_values(ids: ["lead_status", "multiple_person_mm12pv9x", "date_mm122r8w", "date_mm13df9m"]) {
            id text
          }
        }
      }
    }`);

    allItems = allItems.concat(nextPage.next_items_page.items);
    cursor = nextPage.next_items_page.cursor;
  }

  // Parse into structured data
  return allItems.map((item) => {
    const vals = {};
    item.column_values.forEach((cv) => { vals[cv.id] = cv.text; });
    return {
      name: item.name,
      status: vals.lead_status || "",
      rep: vals.multiple_person_mm12pv9x || "",
      createdDate: vals.date_mm122r8w || "",
      closedDate: vals.date_mm13df9m || "",
    };
  });
}

async function fetchAllSubscribers(token) {
  let allItems = [];
  let cursor = null;

  const firstPage = await mondayQuery(token, `{
    boards(ids: [${SUBSCRIBERS_BOARD_ID}]) {
      items_page(limit: 500) {
        cursor
        items {
          name
          column_values(ids: ["deal_stage", "deal_owner", "deal_value", "date_mm13smd7", "date_mm13536z"]) {
            id text
          }
        }
      }
    }
  }`);

  const page = firstPage.boards[0].items_page;
  allItems = page.items;
  cursor = page.cursor;

  while (cursor) {
    const nextPage = await mondayQuery(token, `{
      next_items_page(limit: 500, cursor: "${cursor}") {
        cursor
        items {
          name
          column_values(ids: ["deal_stage", "deal_owner", "deal_value", "date_mm13smd7", "date_mm13536z"]) {
            id text
          }
        }
      }
    }`);
    allItems = allItems.concat(nextPage.next_items_page.items);
    cursor = nextPage.next_items_page.cursor;
  }

  return allItems.map((item) => {
    const vals = {};
    item.column_values.forEach((cv) => { vals[cv.id] = cv.text; });
    return {
      name: item.name,
      status: vals.deal_stage || "",
      rep: vals.deal_owner || "",
      value: parseFloat(vals.deal_value) || 0,
      closedDate: vals.date_mm13smd7 || "",
      startDate: vals.date_mm13536z || "",
    };
  });
}

// ── Analytics ────────────────────────────────────────────

function computeLeadAnalytics(leads, dateRange) {
  const today = toDateStr(dateRange.today);
  const weekStart = toDateStr(dateRange.week.start);
  const monthStart = toDateStr(dateRange.month.start);
  const monthEnd = toDateStr(dateRange.month.end);

  // Closed statuses
  const closedStatuses = ["פתיחת כרטיס מנוי", "נרשם לאפליקציה"];
  const activeStatuses = ["בתהליך", "אין מענה - נשלחה הודעה"];

  // Overall counts
  const leadsToday = leads.filter((l) => l.createdDate === today).length;
  const leadsThisWeek = leads.filter((l) => l.createdDate >= weekStart && l.createdDate <= today).length;
  const leadsThisMonth = leads.filter((l) => l.createdDate >= monthStart && l.createdDate <= monthEnd).length;

  // Per-rep analytics
  const reps = {};
  for (const lead of leads) {
    if (!lead.rep) continue;
    if (!reps[lead.rep]) {
      reps[lead.rep] = { total: 0, closed: 0, inProcess: 0, thisMonth: 0, closedThisMonth: 0 };
    }
    reps[lead.rep].total++;
    if (closedStatuses.includes(lead.status)) reps[lead.rep].closed++;
    if (activeStatuses.includes(lead.status)) reps[lead.rep].inProcess++;

    if (lead.createdDate >= monthStart && lead.createdDate <= monthEnd) {
      reps[lead.rep].thisMonth++;
    }
    if (closedStatuses.includes(lead.status) && lead.closedDate >= monthStart && lead.closedDate <= monthEnd) {
      reps[lead.rep].closedThisMonth++;
    }
  }

  // Compute conversion rates
  for (const rep of Object.values(reps)) {
    rep.conversionRate = rep.total > 0 ? Math.round((rep.closed / rep.total) * 100) : 0;
    rep.monthlyConversion = rep.thisMonth > 0 ? Math.round((rep.closedThisMonth / rep.thisMonth) * 100) : 0;
  }

  return {
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    totalLeads: leads.length,
    reps,
  };
}

function computeSalesTargets(subscribers, leads, dateRange) {
  const monthStart = toDateStr(dateRange.month.start);
  const monthEnd = toDateStr(dateRange.month.end);

  // New subs this month (credit card confirmed = "רשום מנוי" status)
  const confirmedStatuses = ["רשום מנוי"];
  const newSubsThisMonth = subscribers.filter(
    (s) => confirmedStatuses.includes(s.status) && s.startDate >= monthStart && s.startDate <= monthEnd
  );

  // Per-rep contribution
  const repContribution = {};
  let totalNewSubs = newSubsThisMonth.length;
  let totalMRR = 0;

  for (const sub of newSubsThisMonth) {
    const rep = sub.rep || "לא משויך";
    if (!repContribution[rep]) {
      repContribution[rep] = { subs: 0, mrr: 0 };
    }
    repContribution[rep].subs++;
    repContribution[rep].mrr += sub.value;
    totalMRR += sub.value;
  }

  // Calculate percentages
  for (const rep of Object.keys(repContribution)) {
    repContribution[rep].subsPercent = totalNewSubs > 0
      ? Math.round((repContribution[rep].subs / totalNewSubs) * 100)
      : 0;
    repContribution[rep].mrrPercent = totalMRR > 0
      ? Math.round((repContribution[rep].mrr / totalMRR) * 100)
      : 0;
  }

  return {
    totalNewSubs,
    totalMRR,
    repContribution,
  };
}

// ── Board Creation/Update ────────────────────────────────

async function findOrCreateDashboardBoard(token, boardName, columns) {
  // Search for existing
  const searchData = await mondayQuery(token, `{
    boards(limit: 100, workspace_ids: [${CRM_WORKSPACE_ID}]) {
      id name
    }
  }`);

  const existing = searchData.boards.find((b) => b.name === boardName);
  if (existing) return existing.id;

  // Create
  const createData = await mondayQuery(token, `mutation {
    create_board(
      board_name: "${boardName}",
      board_kind: public,
      workspace_id: ${CRM_WORKSPACE_ID}
    ) { id }
  }`);
  const boardId = createData.create_board.id;

  // Add columns
  for (const col of columns) {
    await mondayQuery(token, `mutation {
      create_column(
        board_id: ${boardId},
        id: "${col.id}",
        title: "${col.title}",
        column_type: ${col.type}
      ) { id }
    }`);
  }

  console.log(`  Created board "${boardName}" (${boardId})`);
  return boardId;
}

async function clearAndPopulateBoard(token, boardId, items) {
  // Delete existing items
  const existing = await mondayQuery(token, `{
    boards(ids: [${boardId}]) {
      items_page(limit: 500) { items { id } }
    }
  }`);

  const existingItems = existing.boards[0]?.items_page?.items || [];
  for (const item of existingItems) {
    await mondayQuery(token, `mutation { delete_item(item_id: ${item.id}) { id } }`);
  }

  // Create new items
  for (const item of items) {
    const escapedValues = JSON.stringify(JSON.stringify(item.columns));
    await mondayQuery(token, `mutation {
      create_item(
        board_id: ${boardId},
        item_name: "${item.name.replace(/"/g, '\\"')}",
        column_values: ${escapedValues},
        create_labels_if_missing: true
      ) { id }
    }`);
  }
}

// ── Main Pipeline ────────────────────────────────────────

async function main() {
  const monthArg = process.argv.find((a) => a.startsWith("--month="))?.split("=")[1]
    || (process.argv.indexOf("--month") > -1 ? process.argv[process.argv.indexOf("--month") + 1] : null);

  const token = getToken();
  const dateRange = getDateRange(monthArg);

  console.log(`\n📊 Marketing & Sales Dashboard Sync`);
  console.log(`   Period: ${dateRange.monthLabel}`);
  console.log(`   Date: ${toDateStr(dateRange.today)}\n`);

  // Fetch data
  console.log("Fetching leads...");
  const leads = await fetchAllLeads(token);
  console.log(`  ${leads.length} leads loaded`);

  console.log("Fetching subscribers...");
  const subscribers = await fetchAllSubscribers(token);
  console.log(`  ${subscribers.length} subscribers loaded`);

  // Compute analytics
  console.log("\nComputing analytics...");
  const leadAnalytics = computeLeadAnalytics(leads, dateRange);
  const salesTargets = computeSalesTargets(subscribers, leads, dateRange);

  // ── Board 1: Leads Dashboard ──────────────────────────
  console.log("\n── Leads Dashboard ──");

  SALES_DASHBOARD_BOARD_ID = await findOrCreateDashboardBoard(token, "לידים - דשבורד מכירות", [
    { id: "period", title: "תקופה", type: "text" },
    { id: "leads_count", title: "לידים", type: "numbers" },
    { id: "leads_closed", title: "נסגרו", type: "numbers" },
    { id: "conversion_pct", title: "% המרה", type: "numbers" },
    { id: "rep_name", title: "נציג", type: "text" },
  ]);

  const dashboardItems = [];

  // Summary rows
  dashboardItems.push({
    name: `היום (${toDateStr(dateRange.today)})`,
    columns: { period: "יום", leads_count: leadAnalytics.leadsToday },
  });
  dashboardItems.push({
    name: `השבוע האחרון`,
    columns: { period: "שבוע", leads_count: leadAnalytics.leadsThisWeek },
  });
  dashboardItems.push({
    name: `${dateRange.monthLabel}`,
    columns: { period: "חודש", leads_count: leadAnalytics.leadsThisMonth },
  });

  // Per-rep rows
  const sortedReps = Object.entries(leadAnalytics.reps)
    .sort((a, b) => b[1].total - a[1].total);

  for (const [repName, data] of sortedReps) {
    dashboardItems.push({
      name: repName,
      columns: {
        period: "נציג",
        leads_count: data.thisMonth,
        leads_closed: data.closedThisMonth,
        conversion_pct: data.monthlyConversion,
        rep_name: repName,
      },
    });
  }

  await clearAndPopulateBoard(token, SALES_DASHBOARD_BOARD_ID, dashboardItems);
  console.log(`  Updated with ${dashboardItems.length} rows`);

  // ── Board 2: Sales Targets ────────────────────────────
  console.log("\n── Sales Targets ──");

  SALES_TARGETS_BOARD_ID = await findOrCreateDashboardBoard(token, "יעדי מכירות - נציגים", [
    { id: "rep_name", title: "נציג", type: "text" },
    { id: "new_subs", title: "מנויים חדשים", type: "numbers" },
    { id: "subs_pct", title: "% מהיעד", type: "numbers" },
    { id: "mrr_contrib", title: "MRR ₪", type: "numbers" },
    { id: "mrr_pct", title: "% MRR", type: "numbers" },
  ]);

  const targetItems = [];

  // Total row
  targetItems.push({
    name: `סה״כ ${dateRange.monthLabel}`,
    columns: {
      rep_name: "סה״כ",
      new_subs: salesTargets.totalNewSubs,
      mrr_contrib: salesTargets.totalMRR,
    },
  });

  // Per-rep
  const sortedContribs = Object.entries(salesTargets.repContribution)
    .sort((a, b) => b[1].subs - a[1].subs);

  for (const [repName, data] of sortedContribs) {
    targetItems.push({
      name: repName,
      columns: {
        rep_name: repName,
        new_subs: data.subs,
        subs_pct: data.subsPercent,
        mrr_contrib: data.mrr,
        mrr_pct: data.mrrPercent,
      },
    });
  }

  await clearAndPopulateBoard(token, SALES_TARGETS_BOARD_ID, targetItems);
  console.log(`  Updated with ${targetItems.length} rows`);

  // ── Update MRR trend ──────────────────────────────────
  console.log("\n── MRR Trend ──");
  // The MRR board already exists and is manually maintained
  // Just log the current state
  console.log(`  Current month MRR: ₪${salesTargets.totalMRR}`);
  console.log(`  New subscribers: ${salesTargets.totalNewSubs}`);

  // ── Summary ───────────────────────────────────────────
  console.log(`\n✅ Dashboard sync complete!`);
  console.log(`\n📈 Summary for ${dateRange.monthLabel}:`);
  console.log(`   Leads today: ${leadAnalytics.leadsToday}`);
  console.log(`   Leads this week: ${leadAnalytics.leadsThisWeek}`);
  console.log(`   Leads this month: ${leadAnalytics.leadsThisMonth}`);
  console.log(`   New subscribers: ${salesTargets.totalNewSubs}`);
  console.log(`   MRR contribution: ₪${salesTargets.totalMRR}`);
  console.log(`\n   Top reps by conversion:`);
  for (const [name, data] of sortedReps.slice(0, 5)) {
    console.log(`     ${name}: ${data.closedThisMonth}/${data.thisMonth} (${data.monthlyConversion}%)`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

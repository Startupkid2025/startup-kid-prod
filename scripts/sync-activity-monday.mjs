#!/usr/bin/env node
/**
 * Sync daily activity metrics to Monday.com board.
 *
 * Called from: POST /api/save-activity-metrics  (browser pushes metrics)
 *              OR  cron-sync (with payload)
 *
 * Board: "דשבורד פעילות יומית" in CRM workspace
 *
 * Each row = one day. Columns:
 *   date, dau, wau, mau, stickiness, new_users, lessons_attended,
 *   math_answers, words_mastered, quizzes_completed, coins_earned,
 *   coins_spent, avg_streak, retention_rate, at_risk_count,
 *   dormant_count, health_score, total_students
 */

const MONDAY_API = "https://api.monday.com/v2";
const CRM_WORKSPACE_ID = 5906908;
const BOARD_NAME = "דשבורד פעילות יומית";

// Column IDs — set after board creation
let BOARD_ID = null;

function getToken() {
  const token = process.env.MONDAY_API_TOKEN;
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

// ── Find or create the board ─────────────────────────────
async function findOrCreateBoard(token) {
  // Search for existing board
  const searchData = await mondayQuery(token, `{
    boards(limit: 50, workspace_ids: [${CRM_WORKSPACE_ID}]) {
      id name
    }
  }`);

  const existing = searchData.boards.find((b) => b.name === BOARD_NAME);
  if (existing) {
    BOARD_ID = existing.id;
    return BOARD_ID;
  }

  // Create board
  const createData = await mondayQuery(token, `mutation {
    create_board(
      board_name: "${BOARD_NAME}",
      board_kind: public_board,
      workspace_id: ${CRM_WORKSPACE_ID}
    ) { id }
  }`);
  BOARD_ID = createData.create_board.id;

  // Add columns
  const columns = [
    { id: "date_col", title: "תאריך", type: "date" },
    { id: "dau", title: "DAU", type: "numbers" },
    { id: "wau", title: "WAU", type: "numbers" },
    { id: "mau", title: "MAU", type: "numbers" },
    { id: "stickiness", title: "דביקות %", type: "numbers" },
    { id: "new_users", title: "חדשים", type: "numbers" },
    { id: "total_students", title: "סה״כ תלמידים", type: "numbers" },
    { id: "lessons", title: "שיעורים", type: "numbers" },
    { id: "math_answers", title: "תשובות חשבון", type: "numbers" },
    { id: "words_mastered", title: "מילים נשלטו", type: "numbers" },
    { id: "quizzes", title: "חידונים", type: "numbers" },
    { id: "coins_earned", title: "מטבעות הוכנסו", type: "numbers" },
    { id: "coins_spent", title: "מטבעות הוצאו", type: "numbers" },
    { id: "avg_streak", title: "רצף ממוצע", type: "numbers" },
    { id: "retention", title: "שימור %", type: "numbers" },
    { id: "at_risk", title: "בסיכון", type: "numbers" },
    { id: "dormant", title: "רדומים", type: "numbers" },
    { id: "health", title: "בריאות", type: "numbers" },
  ];

  for (const col of columns) {
    await mondayQuery(token, `mutation {
      create_column(
        board_id: ${BOARD_ID},
        id: "${col.id}",
        title: "${col.title}",
        column_type: ${col.type}
      ) { id }
    }`);
  }

  console.log(`✅ Created board "${BOARD_NAME}" (${BOARD_ID}) with ${columns.length} columns`);
  return BOARD_ID;
}

// ── Find today's item or create it ───────────────────────
async function findOrCreateItem(token, dateStr) {
  const boardId = BOARD_ID;

  // Fetch recent items to find today's row
  const data = await mondayQuery(token, `{
    boards(ids: [${boardId}]) {
      items_page(limit: 50) {
        items {
          id name
          column_values(ids: ["date_col"]) { id value }
        }
      }
    }
  }`);

  const items = data.boards[0]?.items_page?.items || [];
  const todayItem = items.find((item) => {
    const dateCol = item.column_values.find((c) => c.id === "date_col");
    if (!dateCol?.value) return false;
    try {
      const parsed = JSON.parse(dateCol.value);
      return parsed.date === dateStr;
    } catch {
      return false;
    }
  });

  if (todayItem) return todayItem.id;

  // Create new item for today
  const createData = await mondayQuery(token, `mutation {
    create_item(
      board_id: ${boardId},
      item_name: "${dateStr}",
      column_values: "${JSON.stringify({ date_col: { date: dateStr } }).replace(/"/g, '\\"')}"
    ) { id }
  }`);
  return createData.create_item.id;
}

// ── Push metrics to Monday ───────────────────────────────
export async function pushActivityMetrics(metrics) {
  const token = getToken();
  await findOrCreateBoard(token);

  const dateStr = metrics.date || new Date().toISOString().split("T")[0];
  const itemId = await findOrCreateItem(token, dateStr);

  const columnValues = JSON.stringify({
    date_col: { date: dateStr },
    dau: String(metrics.dau || 0),
    wau: String(metrics.wau || 0),
    mau: String(metrics.mau || 0),
    stickiness: String(metrics.stickiness || 0),
    new_users: String(metrics.newUsersCount || 0),
    total_students: String(metrics.totalStudents || 0),
    lessons: String(metrics.totalLessonsAttended || 0),
    math_answers: String(metrics.totalMathCorrect || 0),
    words_mastered: String(metrics.totalMasteredWords || 0),
    quizzes: String(metrics.totalQuizCompleted || 0),
    coins_earned: String(metrics.coinsEarned || 0),
    coins_spent: String(metrics.coinsSpent || 0),
    avg_streak: String(metrics.avgStreak || 0),
    retention: String(metrics.retentionRate || 0),
    at_risk: String(metrics.atRiskCount || 0),
    dormant: String(metrics.dormantCount || 0),
    health: String(metrics.healthScore || 0),
  });

  await mondayQuery(token, `mutation {
    change_multiple_column_values(
      board_id: ${BOARD_ID},
      item_id: ${itemId},
      column_values: ${JSON.stringify(columnValues)}
    ) { id }
  }`);

  console.log(`✅ Pushed activity metrics for ${dateStr} → Monday (item ${itemId})`);
  return { itemId, dateStr };
}

// ── CLI ──────────────────────────────────────────────────
if (process.argv[1]?.endsWith("sync-activity-monday.mjs")) {
  // Accept JSON from stdin or test with dummy data
  const testMetrics = {
    date: new Date().toISOString().split("T")[0],
    dau: 0, wau: 0, mau: 0, stickiness: 0, newUsersCount: 0,
    totalStudents: 0, totalLessonsAttended: 0, totalMathCorrect: 0,
    totalMasteredWords: 0, totalQuizCompleted: 0, coinsEarned: 0,
    coinsSpent: 0, avgStreak: 0, retentionRate: 0,
    atRiskCount: 0, dormantCount: 0, healthScore: 0,
  };

  pushActivityMetrics(testMetrics)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌", err.message);
      process.exit(1);
    });
}

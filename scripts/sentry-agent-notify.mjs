#!/usr/bin/env node
/**
 * Monday.com notification helper for Sentry Auto-Fix Agent.
 *
 * Creates/updates items on a "Sentry Auto-Fixes" board in the CRM workspace.
 *
 * Usage:
 *   node scripts/sentry-agent-notify.mjs create \
 *     --issue-id 12345 --title "TypeError: ..." --sentry-url "https://..." \
 *     --branch "autofix/sentry-12345" --pr-url "https://..." \
 *     --tests "3/3" --build "pass" --status "awaiting_review"
 *
 *   node scripts/sentry-agent-notify.mjs update \
 *     --issue-id 12345 --status "merged"
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONDAY_API = "https://api.monday.com/v2";
const CRM_WORKSPACE_ID = 5906908;
const BOARD_NAME = "Sentry Auto-Fixes";

// Will be set after find-or-create
let BOARD_ID = null;

// ── Load token ───────────────────────────────────────────

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
  if (!token) {
    console.error("MONDAY_API_TOKEN not set");
    process.exit(1);
  }
  return token;
}

// ── Monday API helper ────────────────────────────────────

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
  if (BOARD_ID) return BOARD_ID;

  const searchData = await mondayQuery(token, `{
    boards(limit: 100, workspace_ids: [${CRM_WORKSPACE_ID}]) {
      id name
    }
  }`);

  const existing = searchData.boards.find((b) => b.name === BOARD_NAME);
  if (existing) {
    BOARD_ID = existing.id;
    return BOARD_ID;
  }

  // Create board with columns
  const createData = await mondayQuery(token, `mutation {
    create_board(
      board_name: "${BOARD_NAME}",
      board_kind: public,
      workspace_id: ${CRM_WORKSPACE_ID}
    ) { id }
  }`);
  BOARD_ID = createData.create_board.id;

  const columns = [
    { id: "sentry_id", title: "Issue ID", type: "text" },
    { id: "sentry_url", title: "Sentry URL", type: "link" },
    { id: "fix_branch", title: "Branch", type: "text" },
    { id: "pr_url", title: "PR", type: "link" },
    { id: "tests_result", title: "Tests", type: "text" },
    { id: "build_result", title: "Build", type: "text" },
    { id: "fix_status", title: "Status", type: "status" },
    { id: "fix_date", title: "Date", type: "date" },
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

  console.log(`Created board "${BOARD_NAME}" (${BOARD_ID})`);
  return BOARD_ID;
}

// ── Find item by issue ID ────────────────────────────────

async function findItemByIssueId(token, issueId) {
  const boardId = await findOrCreateBoard(token);
  const data = await mondayQuery(token, `{
    boards(ids: [${boardId}]) {
      items_page(limit: 100) {
        items {
          id name
          column_values(ids: ["sentry_id"]) { id text }
        }
      }
    }
  }`);

  const items = data.boards[0]?.items_page?.items || [];
  return items.find((item) => {
    const col = item.column_values.find((c) => c.id === "sentry_id");
    return col?.text === String(issueId);
  });
}

// ── Create item ──────────────────────────────────────────

async function createItem(token, opts) {
  const boardId = await findOrCreateBoard(token);
  const today = new Date().toISOString().slice(0, 10);

  const statusMap = {
    awaiting_review: "Awaiting Review",
    merged: "Merged",
    failed: "Failed",
    blocked: "Blocked",
  };

  const columnValues = {
    sentry_id: opts.issueId,
    sentry_url: { url: opts.sentryUrl || "", text: `#${opts.issueId}` },
    fix_branch: opts.branch || "",
    pr_url: opts.prUrl ? { url: opts.prUrl, text: "PR" } : { url: "", text: "" },
    tests_result: opts.tests || "",
    build_result: opts.build || "",
    fix_status: { label: statusMap[opts.status] || opts.status },
    fix_date: { date: today },
  };

  const escapedValues = JSON.stringify(JSON.stringify(columnValues));

  const data = await mondayQuery(token, `mutation {
    create_item(
      board_id: ${boardId},
      item_name: "${(opts.title || "").replace(/"/g, '\\"').slice(0, 100)}",
      column_values: ${escapedValues}
    ) { id }
  }`);

  console.log(`Created Monday item for Sentry #${opts.issueId}`);
  return data.create_item.id;
}

// ── Update item status ───────────────────────────────────

async function updateItemStatus(token, issueId, status, extraColumns = {}) {
  const item = await findItemByIssueId(token, issueId);
  if (!item) {
    console.error(`No Monday item found for Sentry #${issueId}`);
    return;
  }

  const statusMap = {
    awaiting_review: "Awaiting Review",
    merged: "Merged",
    failed: "Failed",
    blocked: "Blocked",
  };

  const columnValues = {
    fix_status: { label: statusMap[status] || status },
    ...extraColumns,
  };

  const escapedValues = JSON.stringify(JSON.stringify(columnValues));

  await mondayQuery(token, `mutation {
    change_multiple_column_values(
      board_id: ${await findOrCreateBoard(token)},
      item_id: ${item.id},
      column_values: ${escapedValues}
    ) { id }
  }`);

  console.log(`Updated Sentry #${issueId} status to "${status}"`);
}

// ── CLI ──────────────────────────────────────────────────

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace(/^--/, "").replace(/-/g, "_");
      opts[key] = args[i + 1] || "";
      i++;
    }
  }
  return opts;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const opts = parseArgs(rest);
  const token = getToken();

  if (command === "create") {
    await createItem(token, {
      issueId: opts.issue_id,
      title: opts.title,
      sentryUrl: opts.sentry_url,
      branch: opts.branch,
      prUrl: opts.pr_url,
      tests: opts.tests,
      build: opts.build,
      status: opts.status || "awaiting_review",
    });
  } else if (command === "update") {
    await updateItemStatus(token, opts.issue_id, opts.status);
  } else {
    console.error("Usage: sentry-agent-notify.mjs <create|update> [--option value ...]");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Notification error:", err.message);
  process.exit(1);
});

#!/usr/bin/env bash
#
# Sentry Auto-Fix Agent — Full pipeline with safety gates.
#
# Usage:
#   Fix a specific issue:
#     ./scripts/sentry-agent.sh --fix <sentry-issue-url>
#
#   Poll for new unresolved issues:
#     ./scripts/sentry-agent.sh --poll [minutes]
#
#   Approve a fix and merge to main:
#     ./scripts/sentry-agent.sh --approve <issue-id>
#
#   Show pending fixes:
#     ./scripts/sentry-agent.sh --status
#
# Pipeline: detect → sync → fix → test 3x → build → notify → await approval → merge
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# Config
SENTRY_ORG="${SENTRY_ORG:-startupkid}"
SENTRY_PROJECT="${SENTRY_PROJECT:-javascript-react}"
SENTRY_API="https://de.sentry.io/api/0"
BASE_BRANCH="dev/startupkid"
PROD_BRANCH="main"
PROCESSED_FILE="$SCRIPT_DIR/.sentry-processed-issues"
REPORTS_DIR="$PROJECT_DIR/reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─── Helpers ───

die() { echo -e "${RED}ERROR: $*${NC}" >&2; exit 1; }
info() { echo -e "${BLUE}ℹ $*${NC}"; }
success() { echo -e "${GREEN}✓ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }

check_deps() {
  command -v claude >/dev/null || die "claude CLI not found"
  command -v gh >/dev/null || die "gh CLI not found"
  command -v jq >/dev/null || die "jq not found"
  command -v node >/dev/null || die "node not found"
  [ -n "${SENTRY_AUTH_TOKEN:-}" ] || die "SENTRY_AUTH_TOKEN not set"
}

is_processed() {
  [ -f "$PROCESSED_FILE" ] && grep -qx "$1" "$PROCESSED_FILE" 2>/dev/null
}

record_processed() {
  echo "$1" >> "$PROCESSED_FILE"
}

# ─── Sentry API ───

fetch_issue() {
  curl -sf \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    "$SENTRY_API/organizations/$SENTRY_ORG/issues/$1/" 2>/dev/null || echo "{}"
}

fetch_latest_event() {
  curl -sf \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    "$SENTRY_API/organizations/$SENTRY_ORG/issues/$1/events/latest/" 2>/dev/null || echo "{}"
}

fetch_new_issues() {
  local minutes="${1:-30}"
  local since
  since=$(date -u -d "$minutes minutes ago" '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -v-"${minutes}"M '+%Y-%m-%dT%H:%M:%S')
  curl -sf \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    "$SENTRY_API/projects/$SENTRY_ORG/$SENTRY_PROJECT/issues/?query=is:unresolved+firstSeen:>$since&limit=5" \
    2>/dev/null || echo "[]"
}

resolve_sentry_issue() {
  curl -sf -X PUT \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"resolved"}' \
    "$SENTRY_API/organizations/$SENTRY_ORG/issues/$1/" >/dev/null 2>&1 || true
}

# ─── Git Operations ───

sync_main_to_dev() {
  info "Syncing $PROD_BRANCH → $BASE_BRANCH..."
  cd "$PROJECT_DIR"
  git fetch origin 2>/dev/null

  git checkout "$BASE_BRANCH" 2>/dev/null || die "Could not checkout $BASE_BRANCH"

  if ! git merge origin/$PROD_BRANCH --no-edit 2>&1; then
    git merge --abort 2>/dev/null || true
    die "Merge conflict between $PROD_BRANCH and $BASE_BRANCH. Resolve manually."
  fi

  success "Branches synced"
}

# ─── Test & Build ───

run_tests_3x() {
  info "Running tests 3 times..."
  local pass_count=0
  local results=""

  for i in 1 2 3; do
    if npm test 2>&1 | tail -5; then
      pass_count=$((pass_count + 1))
      results="${results}Run $i: PASS\n"
      success "Test run $i/$3 passed"
    else
      results="${results}Run $i: FAIL\n"
      warn "Test run $i/3 FAILED"
    fi
  done

  echo -e "$results"

  if [ "$pass_count" -lt 3 ]; then
    die "Tests failed ($pass_count/3 passed). Aborting."
  fi

  success "All 3 test runs passed"
  return 0
}

run_build() {
  info "Running production build..."
  if npm run build 2>&1 | tail -5; then
    success "Production build succeeded"
    return 0
  else
    die "Production build failed"
  fi
}

# ─── Notification ───

notify_user() {
  local issue_id="$1"
  local title="$2"
  local sentry_url="$3"
  local branch="$4"
  local pr_url="$5"
  local tests="$6"
  local build="$7"
  local status="$8"

  # Local report
  mkdir -p "$REPORTS_DIR"
  local timestamp
  timestamp=$(date '+%Y%m%d-%H%M%S')
  local report_file="$REPORTS_DIR/autofix-${issue_id}-${timestamp}.md"

  local summary="See PR diff for details."
  if [ -f "$PROJECT_DIR/AUTOFIX_SUMMARY.md" ]; then
    summary=$(cat "$PROJECT_DIR/AUTOFIX_SUMMARY.md")
  fi

  cat > "$report_file" <<REPORT_EOF
# Sentry Auto-Fix Report: #${issue_id}

## Issue
- **Title:** ${title}
- **URL:** ${sentry_url}
- **Branch:** ${branch}
- **PR:** ${pr_url}

## Fix Applied
${summary}

## Verification
$(echo -e "$tests")
- Production build: ${build}

## Action Required
Review the PR and approve:
\`\`\`
./scripts/sentry-agent.sh --approve ${issue_id}
\`\`\`
REPORT_EOF

  success "Report saved: $report_file"

  # Monday.com notification (best-effort)
  if [ -n "${MONDAY_API_TOKEN:-}" ]; then
    node "$SCRIPT_DIR/sentry-agent-notify.mjs" create \
      --issue-id "$issue_id" \
      --title "$title" \
      --sentry-url "$sentry_url" \
      --branch "$branch" \
      --pr-url "$pr_url" \
      --tests "$tests" \
      --build "$build" \
      --status "$status" 2>&1 || warn "Monday notification failed (non-critical)"
  fi
}

# ─── Core Pipeline ───

fix_issue_pipeline() {
  local issue_id="$1"
  local issue_url="$2"

  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════${NC}"
  echo -e "${BLUE}  Sentry Agent: Issue #${issue_id}${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════${NC}"

  # Check if already processed
  if is_processed "$issue_id"; then
    info "Issue #$issue_id already processed. Skipping."
    return 0
  fi

  # Fetch issue details
  local issue_json
  issue_json=$(fetch_issue "$issue_id")
  local title
  title=$(echo "$issue_json" | jq -r '.title // "Unknown error"')
  local level
  level=$(echo "$issue_json" | jq -r '.level // "error"')
  local count
  count=$(echo "$issue_json" | jq -r '.count // "0"')

  info "Title: $title"
  info "Level: $level | Events: $count"

  # Step 1: Sync main→dev
  sync_main_to_dev

  # Step 2: Create fix branch
  local branch="autofix/sentry-$issue_id"
  cd "$PROJECT_DIR"
  git checkout -b "$branch" 2>/dev/null || {
    warn "Branch $branch already exists, resetting..."
    git checkout "$branch" 2>/dev/null
    git reset --hard "$BASE_BRANCH" 2>/dev/null
  }

  # Step 3: Run Claude Code to fix the issue
  info "Running Claude Code..."

  # Build context
  local stacktrace=""
  local event_json
  event_json=$(fetch_latest_event "$issue_id")
  if [ "$event_json" != "{}" ]; then
    stacktrace=$(echo "$event_json" | jq -r '
      .entries[]? | select(.type == "exception") |
      .data.values[]? |
      "\(.type): \(.value)\n\(.stacktrace.frames[-5:][]? | "  \(.filename):\(.lineNo) in \(.function // "?")")"
    ' 2>/dev/null || echo "")
  fi

  claude -p "$(cat <<PROMPT_EOF
You are fixing a production bug detected by Sentry in a Hebrew educational app (React + Vite + Base44).

## Sentry Issue
URL: $issue_url
Error: $title
Level: $level
Event count: $count
Stack trace:
$stacktrace

## Instructions
1. Investigate the error by reading relevant source files.
2. Identify the root cause — focus on null-safety, network error handling, and missing data guards.
3. Apply a minimal, targeted fix. Do NOT refactor unrelated code.
4. If the fix touches a pattern that could repeat elsewhere, check other files for the same pattern.
5. Run \`npx vitest run src/test/production-safety.test.js\` to verify tests still pass.
6. Summarize what you changed and why in a file called AUTOFIX_SUMMARY.md (will be used for the PR body).

## Constraints
- NEVER add new npm dependencies (Base44 Publish won't install them).
- Use optional chaining (?.) for all user data access.
- Keep fixes minimal — this will be reviewed by a human.
PROMPT_EOF
)" --allowedTools "Read,Edit,Write,Glob,Grep,Bash"

  # Check if Claude made changes
  if git diff --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    info "No code changes needed."
    git checkout "$BASE_BRANCH" 2>/dev/null
    git branch -d "$branch" 2>/dev/null || true
    record_processed "$issue_id"
    return 0
  fi

  # Commit
  git add -A
  git commit -m "$(cat <<EOF
fix: auto-fix Sentry issue #$issue_id

$title
Sentry: $issue_url

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

  # Step 4: Run tests 3x
  local test_results=""
  local tests_passed=true
  for i in 1 2 3; do
    if npm test >/dev/null 2>&1; then
      test_results="${test_results}Run $i: PASS\n"
      success "Test $i/3 passed"
    else
      test_results="${test_results}Run $i: FAIL\n"
      warn "Test $i/3 FAILED"
      tests_passed=false
    fi
  done

  # Step 5: Production build
  local build_result="pass"
  if ! npm run build >/dev/null 2>&1; then
    build_result="FAIL"
    tests_passed=false
    warn "Production build FAILED"
  else
    success "Production build passed"
  fi

  # Step 6: Push and create PR
  git push origin "$branch" -u 2>/dev/null

  local summary="See diff for details."
  [ -f "$PROJECT_DIR/AUTOFIX_SUMMARY.md" ] && summary=$(cat "$PROJECT_DIR/AUTOFIX_SUMMARY.md")

  local pr_url
  pr_url=$(gh pr create \
    --base "$BASE_BRANCH" \
    --head "$branch" \
    --draft \
    --title "fix: Sentry #$issue_id — $title" \
    --body "$(cat <<PR_EOF
## Sentry Auto-Fix

**Issue:** $issue_url
**Tests:** $(echo -e "$test_results" | tr '\n' ' ')
**Build:** $build_result

## Summary
$summary

## Review Checklist
- [ ] Fix is correct and minimal
- [ ] No new dependencies added
- [ ] Tests pass 3/3
- [ ] Safe to merge to main

Approve: \`./scripts/sentry-agent.sh --approve $issue_id\`

🤖 Generated with [Claude Code](https://claude.com/claude-code) via Sentry Agent
PR_EOF
)" 2>&1)

  success "PR created: $pr_url"

  # Step 7: Notify
  local status="awaiting_review"
  if [ "$tests_passed" = false ]; then
    status="failed"
  fi

  notify_user "$issue_id" "$title" "$issue_url" "$branch" "$pr_url" "$test_results" "$build_result" "$status"

  # Record as processed
  record_processed "$issue_id"

  # Return to base branch
  git checkout "$BASE_BRANCH" 2>/dev/null

  # Clean up summary file
  rm -f "$PROJECT_DIR/AUTOFIX_SUMMARY.md"

  echo ""
  if [ "$tests_passed" = true ]; then
    success "Fix ready for review. Approve with: ./scripts/sentry-agent.sh --approve $issue_id"
  else
    warn "Fix has failures. Review the PR and report before approving."
  fi
}

# ─── Approve & Merge ───

approve_and_merge() {
  local issue_id="$1"
  local branch="autofix/sentry-$issue_id"

  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════${NC}"
  echo -e "${BLUE}  Approving Sentry Fix #${issue_id}${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════${NC}"

  cd "$PROJECT_DIR"
  git fetch origin 2>/dev/null

  # Check PR exists
  local pr_number
  pr_number=$(gh pr list --head "$branch" --json number -q '.[0].number' 2>/dev/null)
  [ -n "$pr_number" ] || die "No PR found for branch $branch"

  info "Found PR #$pr_number"

  # Merge PR to dev
  info "Merging PR #$pr_number to $BASE_BRANCH..."
  gh pr merge "$pr_number" --merge 2>/dev/null || die "Failed to merge PR"
  success "PR merged to $BASE_BRANCH"

  # Sync dev and prepare merge to main
  git checkout "$BASE_BRANCH" 2>/dev/null
  git pull origin "$BASE_BRANCH" 2>/dev/null

  # Final test run on dev before merging to main
  info "Final test run before merging to $PROD_BRANCH..."
  if ! npm test 2>/dev/null; then
    die "Tests failed on $BASE_BRANCH. Aborting merge to $PROD_BRANCH."
  fi
  success "Tests pass on $BASE_BRANCH"

  # Merge dev → main
  info "Merging $BASE_BRANCH → $PROD_BRANCH..."
  git checkout "$PROD_BRANCH" 2>/dev/null
  git pull origin "$PROD_BRANCH" 2>/dev/null

  if ! git merge "$BASE_BRANCH" --no-edit 2>&1; then
    git merge --abort 2>/dev/null || true
    git checkout "$BASE_BRANCH" 2>/dev/null
    die "Merge conflict merging to $PROD_BRANCH. Resolve manually."
  fi

  git push origin "$PROD_BRANCH" 2>/dev/null
  success "Pushed to $PROD_BRANCH"

  # Return to dev
  git checkout "$BASE_BRANCH" 2>/dev/null

  # Resolve in Sentry
  resolve_sentry_issue "$issue_id"
  success "Sentry issue #$issue_id marked as resolved"

  # Update Monday
  if [ -n "${MONDAY_API_TOKEN:-}" ]; then
    node "$SCRIPT_DIR/sentry-agent-notify.mjs" update \
      --issue-id "$issue_id" --status "merged" 2>/dev/null || true
  fi

  echo ""
  success "Fix #$issue_id merged to production and resolved in Sentry!"
}

# ─── Status ───

show_status() {
  echo ""
  echo -e "${BLUE}Pending Sentry Auto-Fixes${NC}"
  echo "─────────────────────────"

  cd "$PROJECT_DIR"
  local branches
  branches=$(git branch -r --list 'origin/autofix/sentry-*' 2>/dev/null || echo "")

  if [ -z "$branches" ]; then
    info "No pending fixes."
    return
  fi

  while IFS= read -r branch; do
    branch=$(echo "$branch" | xargs)  # trim whitespace
    local issue_id
    issue_id=$(echo "$branch" | grep -oP 'sentry-\K[0-9]+' || echo "?")
    local pr_info
    pr_info=$(gh pr list --head "${branch#origin/}" --json number,state,title -q '.[0] | "#\(.number) [\(.state)] \(.title)"' 2>/dev/null || echo "no PR")
    echo "  $branch → $pr_info"
  done <<< "$branches"
}

# ─── Main ───

check_deps

case "${1:-}" in
  --fix)
    [ -n "${2:-}" ] || die "Usage: $0 --fix <sentry-issue-url>"
    ISSUE_URL="$2"
    ISSUE_ID=$(echo "$ISSUE_URL" | grep -oP 'issues/\K[0-9]+' || die "Could not parse issue ID from: $ISSUE_URL")
    fix_issue_pipeline "$ISSUE_ID" "$ISSUE_URL"
    ;;

  --poll)
    MINUTES="${2:-30}"
    info "Polling Sentry for new issues (last ${MINUTES}m)..."
    ISSUES=$(fetch_new_issues "$MINUTES")
    COUNT=$(echo "$ISSUES" | jq 'length')

    if [ "$COUNT" = "0" ] || [ "$COUNT" = "null" ]; then
      success "No new issues. All clear!"
      exit 0
    fi

    info "Found $COUNT new issue(s)."

    echo "$ISSUES" | jq -r '.[:3][] | "\(.id) \(.permalink // "unknown")"' | \
    while read -r ID URL; do
      if ! is_processed "$ID"; then
        fix_issue_pipeline "$ID" "$URL"
      else
        info "Issue #$ID already processed. Skipping."
      fi
    done
    ;;

  --approve)
    [ -n "${2:-}" ] || die "Usage: $0 --approve <issue-id>"
    approve_and_merge "$2"
    ;;

  --status)
    show_status
    ;;

  *)
    echo "Sentry Auto-Fix Agent"
    echo ""
    echo "Usage:"
    echo "  $0 --fix <sentry-issue-url>   Fix a specific issue"
    echo "  $0 --poll [minutes]            Poll for new issues (default: 30m)"
    echo "  $0 --approve <issue-id>        Approve fix and merge to main"
    echo "  $0 --status                    Show pending fixes"
    echo ""
    echo "Pipeline: detect → sync → fix → test 3x → build → notify → await approval → merge"
    exit 1
    ;;
esac

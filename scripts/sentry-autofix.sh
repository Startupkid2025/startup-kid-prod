#!/usr/bin/env bash
#
# Local Sentry Auto-Fix — runs Claude Code under your Max plan.
#
# Usage:
#   Fix a specific issue:
#     ./scripts/sentry-autofix.sh https://startupkid.sentry.io/issues/102976751
#
#   Poll for new unresolved issues (last N minutes, default 30):
#     ./scripts/sentry-autofix.sh --poll [minutes]
#
# Requirements:
#   - SENTRY_AUTH_TOKEN env var (or in .env)
#   - claude CLI (Claude Code) available
#   - gh CLI authenticated
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# Sentry config
SENTRY_ORG="${SENTRY_ORG:-startupkid}"
SENTRY_PROJECT="${SENTRY_PROJECT:-javascript-react}"
SENTRY_API="https://de.sentry.io/api/0"
BASE_BRANCH="dev/startupkid"

# ─── Functions ───

die() { echo "ERROR: $*" >&2; exit 1; }

check_deps() {
  command -v claude >/dev/null || die "claude CLI not found. Install: npm i -g @anthropic-ai/claude-code"
  command -v gh >/dev/null || die "gh CLI not found. Install: https://cli.github.com"
  command -v jq >/dev/null || die "jq not found. Install: sudo apt install jq"
  [ -n "${SENTRY_AUTH_TOKEN:-}" ] || die "SENTRY_AUTH_TOKEN not set. Add it to .env or export it."
}

fetch_issue() {
  local issue_id="$1"
  curl -sf \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    "$SENTRY_API/organizations/$SENTRY_ORG/issues/$issue_id/" 2>/dev/null || echo "{}"
}

fetch_latest_event() {
  local issue_id="$1"
  curl -sf \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    "$SENTRY_API/organizations/$SENTRY_ORG/issues/$issue_id/events/latest/" 2>/dev/null || echo "{}"
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

build_context() {
  local issue_id="$1"
  local issue_url="$2"

  echo "Fetching Sentry issue #$issue_id..."
  local issue_json
  issue_json=$(fetch_issue "$issue_id")

  if [ "$issue_json" = "{}" ]; then
    echo "  ⚠ Could not fetch issue details (check org/project slugs)"
    echo "  Proceeding with URL only."
    echo "Sentry Issue URL: $issue_url"
    return
  fi

  local title culprit level count first_seen
  title=$(echo "$issue_json" | jq -r '.title // "Unknown"')
  culprit=$(echo "$issue_json" | jq -r '.culprit // "unknown"')
  level=$(echo "$issue_json" | jq -r '.level // "error"')
  count=$(echo "$issue_json" | jq -r '.count // "0"')
  first_seen=$(echo "$issue_json" | jq -r '.firstSeen // "unknown"')

  echo "  Title: $title"
  echo "  Level: $level | Events: $count | First seen: $first_seen"

  # Get stack trace from latest event
  local event_json stacktrace=""
  event_json=$(fetch_latest_event "$issue_id")
  if [ "$event_json" != "{}" ]; then
    stacktrace=$(echo "$event_json" | jq -r '
      .entries[]? | select(.type == "exception") |
      .data.values[]? |
      "\(.type): \(.value)\n\(.stacktrace.frames[-5:][]? | "  \(.filename):\(.lineNo) in \(.function // "?")")"
    ' 2>/dev/null || echo "")
  fi

  # Build context file for Claude
  cat <<CTX_EOF
Sentry Issue URL: $issue_url
Error: $title
Type: $(echo "$issue_json" | jq -r '.type // "error"')
Culprit: $culprit
Level: $level
Event count: $count
First seen: $first_seen
Stack trace:
$stacktrace
CTX_EOF
}

fix_issue() {
  local issue_id="$1"
  local issue_url="$2"

  echo ""
  echo "═══════════════════════════════════════════"
  echo "  Sentry Auto-Fix: Issue #$issue_id"
  echo "═══════════════════════════════════════════"

  # Ensure we're on the right branch and up to date
  cd "$PROJECT_DIR"
  git checkout "$BASE_BRANCH" 2>/dev/null
  git pull origin "$BASE_BRANCH" 2>/dev/null || true

  # Build context
  local context
  context=$(build_context "$issue_id" "$issue_url")

  # Create fix branch
  local branch="autofix/sentry-$issue_id"
  git checkout -b "$branch" 2>/dev/null || git checkout "$branch" 2>/dev/null

  echo ""
  echo "Running Claude Code on branch: $branch"
  echo "─────────────────────────────────────────"

  # Run Claude Code with the bug context
  claude -p "$(cat <<PROMPT_EOF
You are fixing a production bug detected by Sentry in a Hebrew educational app (React + Vite + Base44).

## Sentry Issue
$context

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

  # Check if anything changed
  if git diff --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo ""
    echo "No code changes needed. Claude found nothing to fix."
    git checkout "$BASE_BRANCH" 2>/dev/null
    git branch -d "$branch" 2>/dev/null || true
    return 0
  fi

  # Commit and push
  echo ""
  echo "Committing and creating PR..."
  git add -A
  git commit -m "$(cat <<EOF
fix: auto-fix Sentry issue #$issue_id

$(echo "$context" | head -3)

Sentry: $issue_url

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

  git push origin "$branch" -u

  # Build PR body
  local summary="Claude Code investigated and applied a fix. See diff for details."
  if [ -f AUTOFIX_SUMMARY.md ]; then
    summary=$(cat AUTOFIX_SUMMARY.md)
  fi

  gh pr create \
    --base "$BASE_BRANCH" \
    --head "$branch" \
    --draft \
    --title "fix: Sentry #$issue_id auto-fix" \
    --body "$(cat <<PR_EOF
## Sentry Auto-Fix

**Issue:** $issue_url

## Summary
$summary

## Review Checklist
- [ ] Fix is correct and minimal
- [ ] No new dependencies added
- [ ] Tests pass
- [ ] Safe to cherry-pick to main

🤖 Generated with [Claude Code](https://claude.com/claude-code) via Sentry Auto-Fix
PR_EOF
)"

  # Return to base branch
  git checkout "$BASE_BRANCH" 2>/dev/null

  echo ""
  echo "✓ Draft PR created on branch $branch"
}

# ─── Main ───

check_deps

if [ "${1:-}" = "--poll" ]; then
  MINUTES="${2:-30}"
  echo "Polling Sentry for new unresolved issues (last ${MINUTES}m)..."
  ISSUES=$(fetch_new_issues "$MINUTES")
  COUNT=$(echo "$ISSUES" | jq 'length')

  if [ "$COUNT" = "0" ] || [ "$COUNT" = "null" ]; then
    echo "No new issues found. All clear!"
    exit 0
  fi

  echo "Found $COUNT new issue(s)."

  echo "$ISSUES" | jq -r '.[:3][] | "\(.id) \(.permalink // "unknown")"' | \
  while read -r ID URL; do
    fix_issue "$ID" "$URL"
  done

elif [ -n "${1:-}" ]; then
  ISSUE_URL="$1"
  ISSUE_ID=$(echo "$ISSUE_URL" | grep -oP 'issues/\K[0-9]+' || die "Could not parse issue ID from URL: $ISSUE_URL")
  fix_issue "$ISSUE_ID" "$ISSUE_URL"

else
  echo "Usage:"
  echo "  $0 <sentry-issue-url>        Fix a specific issue"
  echo "  $0 --poll [minutes]           Poll for new issues (default: 30 min)"
  echo ""
  echo "Set SENTRY_AUTH_TOKEN in .env or environment."
  exit 1
fi

#!/usr/bin/env bash
#
# Trigger the Sentry Auto-Fix GitHub Actions workflow.
#
# Usage:
#   ./scripts/sentry-fix.sh <sentry-issue-url>
#   ./scripts/sentry-fix.sh https://startupkid.sentry.io/issues/102976751
#
# Requires: gh CLI authenticated with repo access.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <sentry-issue-url> [severity]"
  echo "Example: $0 https://startupkid.sentry.io/issues/102976751 high"
  exit 1
fi

ISSUE_URL="$1"
SEVERITY="${2:-}"

echo "Triggering Sentry Auto-Fix workflow..."
echo "  Issue: $ISSUE_URL"
[ -n "$SEVERITY" ] && echo "  Severity: $SEVERITY"

gh workflow run sentry-autofix.yml \
  -f sentry_issue_url="$ISSUE_URL" \
  -f severity="$SEVERITY"

echo ""
echo "Workflow triggered! Watch progress:"
echo "  gh run list --workflow=sentry-autofix.yml --limit=1"
echo "  gh run watch"

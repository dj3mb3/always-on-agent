#!/usr/bin/env bash
# One-time seeding: create a real GitHub issue for each issues/*.json file.
# Safe to re-run — skips any id that already has a matching issue title.
# This is infrastructure setup, not agent behavior: never call this from the
# recurring routine (ROUTINE_PROMPT.md), or every scheduled run would re-seed.
set -euo pipefail

REPO="dj3mb3/always-on-agent"
ISSUES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/issues"

command -v gh >/dev/null 2>&1 || { echo "error: gh CLI not found. Install it and run 'gh auth login' first." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "error: jq not found. Install it first." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: gh is not authenticated. Run 'gh auth login' first." >&2; exit 1; }

# Ensure every label referenced in LABELS.md / ROUTINE_PROMPT.md exists before
# any issue tries to use it (gh issue create/edit errors on unknown labels).
declare -A LABEL_COLORS=(
  ["sev:P0"]="b60205" ["sev:P1"]="d93f0b" ["sev:P2"]="fbca04" ["sev:P3"]="c2e0c6"
  ["runbook:auth-502"]="c5def5" ["runbook:cdn-latency"]="c5def5" ["runbook:payment-degraded"]="c5def5"
  ["triaged"]="0e8a16" ["not-incident"]="cfd3d7" ["needs-human-review"]="e99695"
  ["compliance-reviewed"]="0e8a16" ["source:seed"]="ededed"
)
for label in "${!LABEL_COLORS[@]}"; do
  gh label create "$label" --repo "$REPO" --color "${LABEL_COLORS[$label]}" --force >/dev/null 2>&1 || true
done

echo "Seeding issues into $REPO from $ISSUES_DIR"
echo "id,issue_number,action"

for file in "$ISSUES_DIR"/*.json; do
  id=$(jq -r '.id' "$file")
  title=$(jq -r '.title' "$file")
  body=$(jq -r '.body' "$file")
  reporter=$(jq -r '.reporter' "$file")
  opened_at=$(jq -r '.opened_at' "$file")
  gh_title="[$id] $title"

  existing=$(gh issue list --repo "$REPO" --state all --search "in:title \"[$id]\"" --json number --jq '.[0].number' 2>/dev/null || true)
  if [ -n "$existing" ] && [ "$existing" != "null" ]; then
    echo "$id,$existing,skipped(exists)"
    continue
  fi

  issue_body=$(cat <<EOF
<!-- seed:$id -->
**Reporter:** $reporter
**Opened:** $opened_at
**Source:** issues/$(basename "$file")

$body
EOF
)

  issue_url=$(gh issue create --repo "$REPO" --title "$gh_title" --body "$issue_body" --label "source:seed")
  number=$(echo "$issue_url" | grep -oE '[0-9]+$')

  echo "$id,$number,created"
done

echo "Done. Verify with: gh issue list --repo $REPO --label source:seed"

#!/usr/bin/env bash
################################################################################
# export_forensic_snapshot.sh — Forensic snapshot export (reproducible)
#
# Generates a reproducible forensic snapshot of a given git ref (default HEAD).
# Safe: read-only against the repository. Uses `git archive`, so only tracked
# content is exported — the working tree is never touched.
#
# Context: introduced in P30 to reconcile the prior untracked local copy of
# this script documented in the earlier forensic audit. Committing the script
# turns the export rotine into an auditable, reproducible artifact under
# version control, instead of a one-off local file.
#
# Usage:
#   bash scripts/active/export_forensic_snapshot.sh            # HEAD
#   bash scripts/active/export_forensic_snapshot.sh origin/main
#   FORENSIC_EXPORT_DIR=/tmp/exports bash scripts/active/export_forensic_snapshot.sh
#
# Output:
#   - <OUT_DIR>/gemini-mini-ide_<YYYYMMDD>_<shorthash>.tar.gz
#   - <OUT_DIR>/gemini-mini-ide_<YYYYMMDD>_<shorthash>.manifest.txt
#
# The default OUT_DIR is `.forensic-exports/`, which is gitignored so the
# generated artifacts never contaminate the working tree.
################################################################################

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

REF="${1:-HEAD}"

if ! git rev-parse --verify "$REF" >/dev/null 2>&1; then
    echo "ERROR: ref '$REF' is not a valid git ref" >&2
    exit 1
fi

HEAD_SHORT=$(git rev-parse --short "$REF")
HEAD_FULL=$(git rev-parse "$REF")
ISO_DATE=$(date -u '+%Y%m%d')
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
OUT_DIR="${FORENSIC_EXPORT_DIR:-.forensic-exports}"
BASENAME="gemini-mini-ide_${ISO_DATE}_${HEAD_SHORT}"
OUT_FILE="$OUT_DIR/${BASENAME}.tar.gz"
MANIFEST_FILE="$OUT_DIR/${BASENAME}.manifest.txt"

mkdir -p "$OUT_DIR"

echo "=== FORENSIC SNAPSHOT EXPORT ==="
echo "  ref         : $REF"
echo "  short hash  : $HEAD_SHORT"
echo "  full hash   : $HEAD_FULL"
echo "  timestamp   : $TIMESTAMP"
echo "  current HEAD: $(git rev-parse --short HEAD) (branch: $BRANCH)"
echo "  output dir  : $OUT_DIR"
echo "  archive     : $OUT_FILE"
echo "  manifest    : $MANIFEST_FILE"
echo ""

git archive \
    --format=tar.gz \
    --prefix="${BASENAME}/" \
    -o "$OUT_FILE" \
    "$REF"

ARCHIVE_BYTES=$(wc -c < "$OUT_FILE" | tr -d ' ')
ARCHIVE_SHA256=$(sha256sum "$OUT_FILE" | awk '{print $1}')
TRACKED_COUNT=$(git ls-tree -r --name-only "$REF" | wc -l | tr -d ' ')

{
    echo "# Gemini Mini-IDE — Forensic Snapshot Manifest"
    echo "# Generated at: $TIMESTAMP"
    echo ""
    echo "ref            : $REF"
    echo "short hash     : $HEAD_SHORT"
    echo "full hash      : $HEAD_FULL"
    echo "current branch : $BRANCH"
    echo "archive file   : $OUT_FILE"
    echo "archive bytes  : $ARCHIVE_BYTES"
    echo "archive sha256 : $ARCHIVE_SHA256"
    echo "tracked files  : $TRACKED_COUNT"
    echo ""
    echo "# Last commit reachable from ref:"
    git log -1 --format="  %H%n  %an <%ae>%n  %ad%n  %s" --date=iso "$REF"
    echo ""
    echo "# Tracked file list (sorted):"
    git ls-tree -r --name-only "$REF" | sort
} > "$MANIFEST_FILE"

echo "✓ archive generated"
echo "  bytes : $ARCHIVE_BYTES"
echo "  sha256: $ARCHIVE_SHA256"
echo "  files : $TRACKED_COUNT tracked"
echo ""
echo "✓ manifest written: $MANIFEST_FILE"

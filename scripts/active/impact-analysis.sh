#!/bin/bash
################################################################################
# IMPACT ANALYSIS - Gemini Mini-IDE (Wrapper)
#
# This script is a convenience wrapper around the official TypeScript
# impact analysis core in packages/shared/src/impact-analysis/.
#
# Usage:
#   ./scripts/active/impact-analysis.sh                  # diff against origin/main
#   ./scripts/active/impact-analysis.sh --base <ref>     # diff against <ref>
#   ./scripts/active/impact-analysis.sh --files <f1> <f2> ...  # explicit file list
#   ./scripts/active/impact-analysis.sh --staged         # analyze staged changes
#
# Exit codes:
#   0 = analysis complete (BAIXO or MEDIO risk)
#   1 = analysis complete (ALTO or CRITICO risk)
#   2 = usage error
#
# NOTE: The classification logic lives in the TypeScript core at
# packages/shared/src/impact-analysis/impact-analysis.ts
# This script is only a shell entry point for convenience.
################################################################################

set -euo pipefail

# Verify we're in the project root
if [[ ! -f "pnpm-workspace.yaml" ]]; then
    echo "Error: Run this script from the project root" >&2
    exit 2
fi

# Parse arguments to get file list
BASE_REF="origin/main"
MODE="diff"
EXPLICIT_FILES=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --base)
            BASE_REF="$2"
            MODE="diff"
            shift 2
            ;;
        --staged)
            MODE="staged"
            shift
            ;;
        --files)
            MODE="explicit"
            shift
            while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do
                EXPLICIT_FILES+=("$1")
                shift
            done
            ;;
        -h|--help)
            head -19 "$0" | tail -15
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 2
            ;;
    esac
done

# Get file list
FILES=()
case "$MODE" in
    diff)
        _tmp=$(git diff --name-only "$BASE_REF" 2>/dev/null || true)
        for f in $_tmp; do
            [[ -n "$f" ]] && FILES+=("$f")
        done
        ;;
    staged)
        _tmp=$(git diff --cached --name-only 2>/dev/null || true)
        for f in $_tmp; do
            [[ -n "$f" ]] && FILES+=("$f")
        done
        ;;
    explicit)
        FILES=("${EXPLICIT_FILES[@]}")
        ;;
esac

if [[ ${#FILES[@]} -eq 0 ]]; then
    echo "No changed files detected. Nothing to analyze."
    exit 0
fi

# Build the JSON array of files
JSON_FILES="["
FIRST=true
for f in "${FILES[@]}"; do
    if [[ "$FIRST" == "true" ]]; then
        JSON_FILES="$JSON_FILES\"$f\""
        FIRST=false
    else
        JSON_FILES="$JSON_FILES,\"$f\""
    fi
done
JSON_FILES="$JSON_FILES]"

# Call the TypeScript core via Node
node -e "
const { analyzeImpact, formatImpactReport } = require('./packages/shared/dist/impact-analysis/impact-analysis.js');
const files = JSON.parse(process.argv[1]);
const report = analyzeImpact(files);
console.log(formatImpactReport(report));
const riskOrder = { NENHUM: 0, BAIXO: 1, MEDIO: 2, ALTO: 3, CRITICO: 4 };
process.exit(riskOrder[report.overallRisk] >= 3 ? 1 : 0);
" "$JSON_FILES"

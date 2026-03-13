#!/bin/bash
################################################################################
# IMPACT ANALYSIS - Gemini Mini-IDE
#
# Analyzes changed files and produces a risk/impact report.
# Helps answer: "If I change these files, what do I need to validate?"
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
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Risk levels (numeric for comparison)
RISK_NONE=0
RISK_BAIXO=1
RISK_MEDIO=2
RISK_ALTO=3
RISK_CRITICO=4

risk_name() {
    case "$1" in
        0) echo "NENHUM" ;;
        1) echo "BAIXO" ;;
        2) echo "MEDIO" ;;
        3) echo "ALTO" ;;
        4) echo "CRITICO" ;;
    esac
}

risk_color() {
    case "$1" in
        0|1) echo "${GREEN}" ;;
        2)   echo "${YELLOW}" ;;
        3)   echo "${RED}" ;;
        4)   echo "${MAGENTA}" ;;
    esac
}

# Verify we're in the project root
if [[ ! -f "pnpm-workspace.yaml" ]]; then
    echo -e "${RED}Error: Run this script from the project root${NC}" >&2
    exit 2
fi

# Parse arguments
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
            head -17 "$0" | tail -11
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}" >&2
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

# Deduplicate
if [[ ${#FILES[@]} -gt 0 ]]; then
    _dedup=$(printf '%s\n' "${FILES[@]}" | sort -u)
    FILES=()
    for f in $_dedup; do
        [[ -n "$f" ]] && FILES+=("$f")
    done
fi

# Header
echo -e "${BLUE}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         GEMINI MINI-IDE - Impact Analysis Report           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [[ ${#FILES[@]} -eq 0 ]]; then
    echo -e "${GREEN}No changed files detected. Nothing to analyze.${NC}"
    exit 0
fi

echo -e "${CYAN}Mode:${NC} $MODE"
[[ "$MODE" == "diff" ]] && echo -e "${CYAN}Base:${NC} $BASE_REF"
echo -e "${CYAN}Files analyzed:${NC} ${#FILES[@]}"
echo ""

# ──────────────────────────────────────────────────────────────────
# Classification engine
# ──────────────────────────────────────────────────────────────────

# Area tracking (associative arrays)
declare -A AREA_FILES
declare -A AREA_RISK
declare -A AREA_VALIDATIONS

# Initialize areas
for area in "ui" "server" "analysis-agent" "shared" "cli" "ci" "governance" "scripts" "config" "docs"; do
    AREA_FILES[$area]=""
    AREA_RISK[$area]=$RISK_NONE
    AREA_VALIDATIONS[$area]=""
done

MAX_RISK=$RISK_NONE

classify_file() {
    local file="$1"
    local area=""
    local risk=$RISK_NONE
    local validations=""

    case "$file" in
        packages/shared/*)
            area="shared"
            risk=$RISK_CRITICO
            validations="lint,typecheck,build,test-all-packages"
            ;;
        packages/server/src/index.ts)
            area="server"
            risk=$RISK_CRITICO
            validations="lint,typecheck,build,test,runtime-healthz"
            ;;
        packages/server/package.json)
            area="server"
            risk=$RISK_ALTO
            validations="lint,typecheck,build,test,runtime-healthz,entrypoint-check"
            ;;
        packages/server/*)
            area="server"
            risk=$RISK_ALTO
            validations="lint,typecheck,build,test,runtime-healthz"
            ;;
        packages/analysis-agent/src/agent.ts|packages/analysis-agent/src/orchestrator.ts)
            area="analysis-agent"
            risk=$RISK_CRITICO
            validations="lint,typecheck,build,test,review-governance"
            ;;
        packages/analysis-agent/*)
            area="analysis-agent"
            risk=$RISK_ALTO
            validations="lint,typecheck,build,test"
            ;;
        packages/ui/src/App.tsx|packages/ui/src/main.tsx)
            area="ui"
            risk=$RISK_ALTO
            validations="lint,typecheck,build,test"
            ;;
        packages/ui/*)
            area="ui"
            risk=$RISK_MEDIO
            validations="lint,typecheck,build,test"
            ;;
        packages/cli/*)
            area="cli"
            risk=$RISK_BAIXO
            validations="lint,typecheck,build"
            ;;
        .github/workflows/*)
            area="ci"
            risk=$RISK_ALTO
            validations="review-workflow,lint,typecheck,build,test"
            ;;
        docs/governance/*)
            area="governance"
            risk=$RISK_MEDIO
            validations="review-coherence"
            ;;
        scripts/active/*)
            area="scripts"
            risk=$RISK_MEDIO
            validations="review-manual,test-script"
            ;;
        scripts/*)
            area="scripts"
            risk=$RISK_BAIXO
            validations="review-manual"
            ;;
        package.json|pnpm-lock.yaml|pnpm-workspace.yaml)
            area="config"
            risk=$RISK_CRITICO
            validations="lint,typecheck,build,test-all-packages,runtime-healthz"
            ;;
        tsconfig*.json)
            area="config"
            risk=$RISK_CRITICO
            validations="lint,typecheck,build,test-all-packages"
            ;;
        .gitignore|.eslintrc*|.prettier*)
            area="config"
            risk=$RISK_BAIXO
            validations="lint"
            ;;
        docs/*|*.md)
            area="docs"
            risk=$RISK_BAIXO
            validations="review-textual"
            ;;
        *)
            area="docs"
            risk=$RISK_BAIXO
            validations="review-manual"
            ;;
    esac

    # Update area tracking
    if [[ -n "${AREA_FILES[$area]}" ]]; then
        AREA_FILES[$area]="${AREA_FILES[$area]}|$file"
    else
        AREA_FILES[$area]="$file"
    fi

    if [[ $risk -gt ${AREA_RISK[$area]} ]]; then
        AREA_RISK[$area]=$risk
    fi

    # Merge validations
    local existing="${AREA_VALIDATIONS[$area]}"
    if [[ -n "$existing" ]]; then
        AREA_VALIDATIONS[$area]="$existing,$validations"
    else
        AREA_VALIDATIONS[$area]="$validations"
    fi

    # Track max risk
    if [[ $risk -gt $MAX_RISK ]]; then
        MAX_RISK=$risk
    fi
}

# Classify all files
for f in "${FILES[@]}"; do
    classify_file "$f"
done

# ──────────────────────────────────────────────────────────────────
# Report generation
# ──────────────────────────────────────────────────────────────────

# Section 1: Files
echo -e "${BOLD}1. CHANGED FILES${NC}"
echo "────────────────────────────────────────────────────────────"
for f in "${FILES[@]}"; do
    echo "  $f"
done
echo ""

# Section 2: Impacted areas
echo -e "${BOLD}2. IMPACTED AREAS${NC}"
echo "────────────────────────────────────────────────────────────"

AFFECTED_AREAS=0
for area in "shared" "config" "server" "analysis-agent" "ci" "ui" "governance" "scripts" "cli" "docs"; do
    if [[ ${AREA_RISK[$area]} -gt $RISK_NONE ]]; then
        AFFECTED_AREAS=$((AFFECTED_AREAS + 1))
        local_risk=${AREA_RISK[$area]}
        color=$(risk_color "$local_risk")
        name=$(risk_name "$local_risk")
        echo -e "  ${color}[$name]${NC} ${BOLD}$area${NC}"

        # List files in this area
        IFS='|' read -ra area_files <<< "${AREA_FILES[$area]}"
        for af in "${area_files[@]}"; do
            [[ -n "$af" ]] && echo "         - $af"
        done
        echo ""
    fi
done

# Section 3: Overall risk
echo -e "${BOLD}3. OVERALL RISK${NC}"
echo "────────────────────────────────────────────────────────────"
RISK_COLOR=$(risk_color "$MAX_RISK")
RISK_NAME=$(risk_name "$MAX_RISK")
echo -e "  ${RISK_COLOR}${BOLD}$RISK_NAME${NC}"
echo -e "  Areas affected: $AFFECTED_AREAS"
echo ""

# Section 4: Required validations
echo -e "${BOLD}4. REQUIRED VALIDATIONS${NC}"
echo "────────────────────────────────────────────────────────────"

# Collect all unique validations
ALL_VALIDATIONS=""
for area in "${!AREA_VALIDATIONS[@]}"; do
    if [[ -n "${AREA_VALIDATIONS[$area]}" ]]; then
        if [[ -n "$ALL_VALIDATIONS" ]]; then
            ALL_VALIDATIONS="$ALL_VALIDATIONS,${AREA_VALIDATIONS[$area]}"
        else
            ALL_VALIDATIONS="${AREA_VALIDATIONS[$area]}"
        fi
    fi
done

# Deduplicate and sort validations
UNIQUE_VALIDATIONS=()
for v in $(echo "$ALL_VALIDATIONS" | tr ',' '\n' | sort -u | grep -v '^$'); do
    UNIQUE_VALIDATIONS+=("$v")
done

VALIDATION_LABELS=(
    "lint:pnpm lint"
    "typecheck:pnpm typecheck"
    "build:pnpm build"
    "test:pnpm test (affected package)"
    "test-all-packages:pnpm test (ALL packages - shared contract changed)"
    "runtime-healthz:Server startup + /healthz check"
    "entrypoint-check:Verify package.json main matches build output"
    "review-workflow:Manual review of CI workflow changes"
    "review-governance:Review governance docs for coherence"
    "review-coherence:Review document coherence with repo state"
    "review-manual:Manual review of changes"
    "review-textual:Review text for accuracy"
    "test-script:Test script execution manually"
)

for v in "${UNIQUE_VALIDATIONS[@]}"; do
    label="$v"
    for vl in "${VALIDATION_LABELS[@]}"; do
        key="${vl%%:*}"
        desc="${vl#*:}"
        if [[ "$v" == "$key" ]]; then
            label="$desc"
            break
        fi
    done

    # Determine if mandatory or recommended
    if [[ $MAX_RISK -ge $RISK_ALTO ]]; then
        echo -e "  ${RED}[MANDATORY]${NC} $label"
    else
        echo -e "  ${YELLOW}[RECOMMENDED]${NC} $label"
    fi
done
echo ""

# Section 5: Impact summary
echo -e "${BOLD}5. IMPACT SUMMARY${NC}"
echo "────────────────────────────────────────────────────────────"

impacts=()
[[ ${AREA_RISK[server]} -gt 0 ]] && impacts+=("Runtime/Backend")
[[ ${AREA_RISK[ui]} -gt 0 ]] && impacts+=("UI/Frontend")
[[ ${AREA_RISK[shared]} -gt 0 ]] && impacts+=("Shared Contracts (cross-package)")
[[ ${AREA_RISK[analysis-agent]} -gt 0 ]] && impacts+=("Analysis Agent")
[[ ${AREA_RISK[cli]} -gt 0 ]] && impacts+=("CLI")
[[ ${AREA_RISK[ci]} -gt 0 ]] && impacts+=("CI/CD Pipeline")
[[ ${AREA_RISK[governance]} -gt 0 ]] && impacts+=("Governance/Compliance")
[[ ${AREA_RISK[config]} -gt 0 ]] && impacts+=("Project Configuration")
[[ ${AREA_RISK[scripts]} -gt 0 ]] && impacts+=("Build/Validation Scripts")
[[ ${AREA_RISK[docs]} -gt 0 ]] && impacts+=("Documentation")

for imp in "${impacts[@]}"; do
    echo "  - $imp"
done
echo ""

# Section 6: Recommendations
echo -e "${BOLD}6. RECOMMENDATIONS${NC}"
echo "────────────────────────────────────────────────────────────"

if [[ $MAX_RISK -ge $RISK_CRITICO ]]; then
    echo -e "  ${MAGENTA}CRITICAL CHANGE: Run full pipeline before merging.${NC}"
    echo "  - Execute: ./scripts/active/pipeline.sh"
    echo "  - Verify runtime: server start + /healthz"
    echo "  - Review all affected packages for regressions"
elif [[ $MAX_RISK -ge $RISK_ALTO ]]; then
    echo -e "  ${RED}HIGH RISK: Run pipeline and affected package tests.${NC}"
    echo "  - Execute: ./scripts/active/pipeline.sh"
    echo "  - Review changed files carefully"
elif [[ $MAX_RISK -ge $RISK_MEDIO ]]; then
    echo -e "  ${YELLOW}MEDIUM RISK: Run standard checks.${NC}"
    echo "  - Execute: pnpm lint && pnpm typecheck && pnpm build && pnpm test"
else
    echo -e "  ${GREEN}LOW RISK: Standard review sufficient.${NC}"
    echo "  - Review changes for accuracy"
fi
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Analysis complete.${NC} Overall risk: $(risk_color $MAX_RISK)${BOLD}$(risk_name $MAX_RISK)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Exit code based on risk
if [[ $MAX_RISK -ge $RISK_ALTO ]]; then
    exit 1
else
    exit 0
fi

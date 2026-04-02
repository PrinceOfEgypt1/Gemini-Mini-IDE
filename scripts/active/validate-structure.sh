#!/usr/bin/env bash
################################################################################
# STRUCTURAL INTEGRITY VALIDATOR - Gemini Mini-IDE
#
# Verifies that critical governance files, hooks, and configurations exist
# and contain required content. This converts documented policies into
# automated enforcement.
#
# Exit codes:
#   0 = all checks passed
#   1 = one or more checks failed
#
# Checked invariants:
#   - Husky hooks exist with correct content
#   - CI workflow exists
#   - CODEOWNERS exists
#   - Pipeline script exists and is executable
#   - All packages have vitest coverage thresholds
#   - Governance documents exist
#   - PR template exists and is in Portuguese
#   - Root package.json has required scripts
################################################################################

set -euo pipefail

# Verify we're in the project root
if [[ ! -f "pnpm-workspace.yaml" ]]; then
    echo "Error: Run this script from the project root" >&2
    exit 1
fi

FAILED=0
CHECKED=0

check() {
    local name="$1"
    local result="$2"
    CHECKED=$((CHECKED + 1))

    if [[ "$result" == "0" ]]; then
        echo "  ✓ $name"
    else
        echo "  ✗ $name"
        FAILED=$((FAILED + 1))
    fi
}

echo "═══════════════════════════════════════════════════════"
echo " Structural Integrity Validator"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── 1. Husky hooks ──────────────────────────────────────
echo "[1] Husky hooks"

if [[ -f ".husky/pre-commit" ]] && grep -q "lint-staged" .husky/pre-commit; then
    check "pre-commit hook exists and calls lint-staged" "0"
else
    check "pre-commit hook exists and calls lint-staged" "1"
fi

if [[ -f ".husky/pre-push" ]] && grep -q "typecheck" .husky/pre-push && grep -q "test" .husky/pre-push; then
    check "pre-push hook exists and runs typecheck+test" "0"
else
    check "pre-push hook exists and runs typecheck+test" "1"
fi
echo ""

# ─── 2. CI workflow ──────────────────────────────────────
echo "[2] CI workflow"

if [[ -f ".github/workflows/ci.yml" ]]; then
    check "ci.yml exists" "0"
else
    check "ci.yml exists" "1"
fi

# Verify CI has blocking quality gate (no continue-on-error)
if grep -q "continue-on-error" .github/workflows/ci.yml 2>/dev/null; then
    check "ci.yml has no continue-on-error" "1"
else
    check "ci.yml has no continue-on-error" "0"
fi
echo ""

# ─── 3. CODEOWNERS ───────────────────────────────────────
echo "[3] CODEOWNERS"

if [[ -f ".github/CODEOWNERS" ]]; then
    check "CODEOWNERS exists" "0"
else
    check "CODEOWNERS exists" "1"
fi
echo ""

# ─── 4. Pipeline script ─────────────────────────────────
echo "[4] Pipeline script"

if [[ -f "scripts/active/pipeline.sh" ]]; then
    check "pipeline.sh exists" "0"
else
    check "pipeline.sh exists" "1"
fi

if [[ -x "scripts/active/pipeline.sh" ]]; then
    check "pipeline.sh is executable" "0"
else
    check "pipeline.sh is executable" "1"
fi
echo ""

# ─── 5. Coverage thresholds per package ──────────────────
echo "[5] Coverage thresholds per package"

PACKAGES=("analysis-agent" "cli" "server" "shared" "ui")
for pkg in "${PACKAGES[@]}"; do
    VCONFIG="packages/$pkg/vitest.config.ts"
    if [[ -f "$VCONFIG" ]] && grep -q "thresholds" "$VCONFIG"; then
        check "$pkg has coverage thresholds" "0"
    else
        check "$pkg has coverage thresholds" "1"
    fi
done
echo ""

# ─── 6. Governance documents ─────────────────────────────
echo "[6] Governance documents"

GOV_DOCS=(
    "docs/governance/MASTER_COMPLIANCE_MATRIX.md"
    "docs/governance/CRITICAL_OPEN_ITEMS.md"
    "docs/governance/SANITATION_COMPLIANCE_MATRIX.md"
    "docs/governance/EXTERNAL_DEPENDENCIES_CHECKLIST.md"
    "docs/governance/ROUND_STATUS_LOG.md"
)
for doc in "${GOV_DOCS[@]}"; do
    BASENAME=$(basename "$doc")
    if [[ -f "$doc" ]]; then
        check "$BASENAME exists" "0"
    else
        check "$BASENAME exists" "1"
    fi
done
echo ""

# ─── 7. PR template ──────────────────────────────────────
echo "[7] PR template"

if [[ -f ".github/pull_request_template.md" ]]; then
    check "PR template exists" "0"
else
    check "PR template exists" "1"
fi

if [[ -f ".github/pull_request_template.md" ]] && grep -q "Descrição" .github/pull_request_template.md && grep -q "Checklist" .github/pull_request_template.md; then
    check "PR template contains Portuguese sections" "0"
else
    check "PR template contains Portuguese sections" "1"
fi
echo ""

# ─── 8. Root package.json scripts ────────────────────────
echo "[8] Root package.json required scripts"

REQUIRED_SCRIPTS=("lint" "typecheck" "test" "build")
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if node -e "const p=require('./package.json'); if(!p.scripts['$script']) process.exit(1)" 2>/dev/null; then
        check "script '$script' exists in root package.json" "0"
    else
        check "script '$script' exists in root package.json" "1"
    fi
done
echo ""

# ─── Result ──────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
if [[ $FAILED -eq 0 ]]; then
    echo "✅ STRUCTURAL INTEGRITY OK — $CHECKED checks passed"
    exit 0
else
    echo "❌ STRUCTURAL INTEGRITY FAILED — $FAILED of $CHECKED checks failed"
    exit 1
fi

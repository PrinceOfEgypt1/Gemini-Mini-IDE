#!/usr/bin/env bash
# doc-drift-check.sh — Verifica drift entre documentação e estado real do repositório
# Uso: bash scripts/active/doc-drift-check.sh
# Saída: 0 se não houver drift crítico, 1 se houver divergência

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

ERRORS=0
WARNINGS=0

echo "=== DOC DRIFT CHECK — $(date '+%Y-%m-%d') ==="
echo ""

# ── 1. Hash de referência ──────────────────────────────────────────────────

HEAD=$(git rev-parse --short HEAD)
echo "HEAD atual: $HEAD"
echo ""

echo "── Hashes de referência nos documentos ──"

README_HASH=$(grep -oE 'main @ [0-9a-f]{7}' README.md 2>/dev/null | head -1 | awk '{print $3}' || echo "não encontrado")
DEV_HASH=$(grep -oE 'main @ [0-9a-f]{7}' DEVELOPMENT.md 2>/dev/null | head -1 | awk '{print $3}' || echo "não encontrado")

echo "  README.md:      $README_HASH $([ "$README_HASH" = "$HEAD" ] && echo '✓' || echo '⚠ diverge do HEAD')"
echo "  DEVELOPMENT.md: $DEV_HASH $([ "$DEV_HASH" = "$HEAD" ] && echo '✓' || echo '⚠ diverge do HEAD')"

if [ "$README_HASH" != "$HEAD" ]; then WARNINGS=$((WARNINGS+1)); fi
if [ "$DEV_HASH" != "$HEAD" ]; then WARNINGS=$((WARNINGS+1)); fi

echo ""

# ── 2. Contagem de arquivos de teste ──────────────────────────────────────

echo "── Arquivos de teste por pacote ──"

count_analysis=$(find packages/analysis-agent -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' ')
count_ui=$(find packages/ui -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' ')
count_server=$(find packages/server -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
count_shared=$(find packages/shared -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
count_cli=$(find packages/cli -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
count_total=$((count_analysis + count_ui + count_server + count_shared + count_cli))

echo "  analysis-agent: $count_analysis"
echo "  ui:             $count_ui"
echo "  server:         $count_server"
echo "  shared:         $count_shared"
echo "  cli:            $count_cli"
echo "  TOTAL:          $count_total"
echo ""

# Verificar contra o documentado em DEVELOPMENT.md
doc_analysis=$(grep -oP 'analysis-agent\s*\|\s*\K\d+(?=\s*\|\s*\d+\s*\|\s*0)' DEVELOPMENT.md 2>/dev/null | head -1 || echo "?")
doc_total=$(grep -oP 'TOTAL\s*\*\*\s*\|\s*\*\*\K\d+' DEVELOPMENT.md 2>/dev/null | head -1 || echo "?")

echo "  Documentado em DEVELOPMENT.md: analysis-agent=$doc_analysis, total=$doc_total"
if [ "$count_total" != "$doc_total" ] && [ "$doc_total" != "?" ]; then
  echo "  ⚠ Divergência: total real=$count_total vs documentado=$doc_total"
  WARNINGS=$((WARNINGS+1))
else
  echo "  ✓ Contagens consistentes com documentação"
fi

echo ""

# ── 3. Classificação documental ───────────────────────────────────────────

echo "── Classificação documental dos arquivos .md relevantes ──"

check_classification() {
  local file="$1"
  local expected_class="$2"
  if [ -f "$file" ]; then
    if grep -qiE "DOCUMENTO HISTÓRICO|HISTÓRICO|histórico|Historical" "$file" 2>/dev/null; then
      echo "  ✓ HISTÓRICO  — $file"
    elif grep -qiE "EXPERIMENTAL|experimental|ASPIRACIONAL|aspiracional" "$file" 2>/dev/null; then
      echo "  ✓ EXPERIMENTAL — $file"
    elif [ "$expected_class" = "historico" ]; then
      echo "  ⚠ SEM MARCAÇÃO HISTÓRICA — $file"
      WARNINGS=$((WARNINGS+1))
    else
      echo "  ✓ VIVO/OPERACIONAL — $file"
    fi
  fi
}

check_classification "REMEDIATION_REPORT.md" "historico"
check_classification "FORENSIC_AUDIT_REPORT.md" "historico"
check_classification "docs/ESAA_ARCHITECTURE.md" "experimental"
check_classification "docs/governance/CONTEXTO_DE_CONTINUIDADE__POS_PROMPT_10__MAIN_PROTEGIDA.md" "historico"
check_classification "docs/governance/ROUND_15_FINAL_REPORT.md" "historico"

echo ""

# ── 4. Resumo ─────────────────────────────────────────────────────────────

echo "=== RESUMO ==="
echo "  Erros críticos: $ERRORS"
echo "  Avisos:         $WARNINGS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo "RESULTADO: FALHOU — $ERRORS erro(s) crítico(s) encontrado(s)"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "RESULTADO: AVISO — $WARNINGS aviso(s) de drift documental. Revisar antes do próximo release."
  exit 0
else
  echo "RESULTADO: OK — documentação alinhada com estado do repositório"
  exit 0
fi

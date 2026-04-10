#!/usr/bin/env bash
# doc-drift-check.sh — Verifica drift entre documentação e estado real do repositório
# Uso: bash scripts/active/doc-drift-check.sh
#
# NATUREZA: ferramenta de ENFORCEMENT — bloqueante para drift material.
# Exit code 0: documentação íntegra (ou apenas drift de hash esperado em branch).
# Exit code 1: drift material detectado (contagem de testes diverge do documentado,
#              ou documento marcado como exigindo classificação histórica está sem marcador).
#
# AVISO DE HASH: a verificação de hash compara o hash documentado em README.md e
# DEVELOPMENT.md contra o HEAD ATUAL. Em contexto de branch/PR, o HEAD da branch
# é sempre diferente do hash referenciado nos docs (que aponta para o último estado
# auditado da main). Avisos de hash são ESPERADOS durante desenvolvimento em branch
# e após cada commit — geram WARNING (não bloqueante) por design.
# O check de hash é útil apenas como auditoria manual pré-release.
#
# Checks bloqueantes (ERRORS — exit 1):
# - contagem real de arquivos de teste diverge do documentado em DEVELOPMENT.md
# - documento histórico obrigatório está sem marcador de classificação
#
# Checks advisory (WARNINGS — exit 0):
# - hash de HEAD difere do hash documentado em README.md / DEVELOPMENT.md

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

ERRORS=0
WARNINGS=0

echo "=== DOC DRIFT CHECK — $(date '+%Y-%m-%d') ==="
echo ""

# ── 1. Hash de referência (advisory — WARNINGS) ───────────────────────────

HEAD=$(git rev-parse --short HEAD)
echo "HEAD atual: $HEAD"
echo ""

echo "── Hashes de referência nos documentos (advisory) ──"

README_HASH=$(grep -oE 'main @ [0-9a-f]{7}' README.md 2>/dev/null | head -1 | awk '{print $3}' || echo "não encontrado")
DEV_HASH=$(grep -oE 'main @ [0-9a-f]{7}' DEVELOPMENT.md 2>/dev/null | head -1 | awk '{print $3}' || echo "não encontrado")

echo "  README.md:      $README_HASH $([ "$README_HASH" = "$HEAD" ] && echo '✓' || echo '⚠ diverge do HEAD (esperado em branch)')"
echo "  DEVELOPMENT.md: $DEV_HASH $([ "$DEV_HASH" = "$HEAD" ] && echo '✓' || echo '⚠ diverge do HEAD (esperado em branch)')"

if [ "$README_HASH" != "$HEAD" ]; then WARNINGS=$((WARNINGS+1)); fi
if [ "$DEV_HASH" != "$HEAD" ]; then WARNINGS=$((WARNINGS+1)); fi

echo ""

# ── 2. Contagem de arquivos de teste (BLOCKING — ERRORS) ─────────────────

echo "── Arquivos de teste por pacote (enforcement bloqueante) ──"

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
  echo "  ✗ ERRO BLOQUEANTE: total real=$count_total vs documentado=$doc_total"
  echo "    → Atualize a tabela de contagem em DEVELOPMENT.md antes de mergear."
  ERRORS=$((ERRORS+1))
else
  echo "  ✓ Contagens consistentes com documentação"
fi

echo ""

# ── 3. Classificação documental (BLOCKING — ERRORS) ───────────────────────

echo "── Classificação documental dos arquivos .md relevantes (enforcement bloqueante) ──"

check_classification() {
  local file="$1"
  local expected_class="$2"
  if [ -f "$file" ]; then
    if grep -qiE "DOCUMENTO HISTÓRICO|HISTÓRICO|histórico|Historical" "$file" 2>/dev/null; then
      echo "  ✓ HISTÓRICO  — $file"
    elif grep -qiE "EXPERIMENTAL|experimental|ASPIRACIONAL|aspiracional" "$file" 2>/dev/null; then
      echo "  ✓ EXPERIMENTAL — $file"
    elif [ "$expected_class" = "historico" ]; then
      echo "  ✗ ERRO BLOQUEANTE: sem marcador histórico — $file"
      echo "    → Adicione o marcador 'DOCUMENTO HISTÓRICO' ao cabeçalho do arquivo."
      ERRORS=$((ERRORS+1))
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
echo "  Erros bloqueantes: $ERRORS"
echo "  Avisos advisory:   $WARNINGS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo "RESULTADO: FALHOU — $ERRORS erro(s) bloqueante(s) de drift documental."
  echo "  Corrija os erros acima antes de abrir PR ou mergear para main."
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "RESULTADO: OK (com avisos advisory) — $WARNINGS aviso(s) de hash (esperado em branch)."
  exit 0
else
  echo "RESULTADO: OK — documentação íntegra e alinhada com estado do repositório."
  exit 0
fi

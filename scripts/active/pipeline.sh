#!/usr/bin/env bash
################################################################################
# PIPELINE DE QUALIDADE - Gemini Mini-IDE
#
# Script SEGURO para validação do projeto.
# NÃO modifica arquivos - apenas valida.
################################################################################

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       GEMINI MINI-IDE - Pipeline de Qualidade               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está na raiz do projeto
if [[ ! -f "pnpm-workspace.yaml" ]]; then
    echo -e "${RED}❌ Execute este script na raiz do projeto${NC}"
    exit 1
fi

# Contador de passos
STEP=0
FAILED=0

run_step() {
    local name="$1"
    local cmd="$2"
    ((STEP++))

    echo -e "${YELLOW}[$STEP] $name...${NC}"
    if eval "$cmd"; then
        echo -e "${GREEN}✓ $name passou${NC}"
    else
        echo -e "${RED}✗ $name falhou${NC}"
        ((FAILED++))
    fi
    echo ""
}

# Pipeline
run_step "Lint" "pnpm lint"
run_step "Typecheck" "pnpm typecheck"
run_step "Tests" "pnpm test"
run_step "Build" "pnpm build"

# Resultado
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ PIPELINE PASSOU - Todos os $STEP passos OK${NC}"
    exit 0
else
    echo -e "${RED}❌ PIPELINE FALHOU - $FAILED de $STEP passos falharam${NC}"
    exit 1
fi

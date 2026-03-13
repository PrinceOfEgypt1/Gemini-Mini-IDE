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

# Pipeline - Static checks
run_step "Lint" "pnpm lint"
run_step "Typecheck" "pnpm typecheck"
run_step "Tests" "pnpm test"
run_step "Build" "pnpm build"

# Pipeline - Runtime validation
run_step "Entrypoint coherence" '
    MAIN_ENTRY=$(node -e "const p=require(\"./packages/server/package.json\"); console.log(p.main)")
    if [ -f "packages/server/$MAIN_ENTRY" ]; then
        echo "  package.json main ($MAIN_ENTRY) exists in build output"
    else
        echo "  FAIL: packages/server/$MAIN_ENTRY does not exist"
        exit 1
    fi
'

run_step "Server startup and healthz" '
    cd packages/server
    node dist/server/src/index.js &
    SERVER_PID=$!
    sleep 2

    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "  Server failed to start"
        exit 1
    fi

    HEALTH=$(curl -sf http://localhost:3200/healthz 2>/dev/null)
    CURL_EXIT=$?
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true

    if [ $CURL_EXIT -ne 0 ]; then
        echo "  /healthz did not respond"
        exit 1
    fi

    echo "  Server started and /healthz responded: $HEALTH"
'

# Resultado
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ PIPELINE PASSOU - Todos os $STEP passos OK${NC}"
    exit 0
else
    echo -e "${RED}❌ PIPELINE FALHOU - $FAILED de $STEP passos falharam${NC}"
    exit 1
fi

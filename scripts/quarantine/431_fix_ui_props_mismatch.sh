#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

APP_PATH="packages/ui/src/App.tsx"
TESTS_PANEL_PATH="packages/ui/src/components/tests/TestsPanel.tsx"

log_info "Iniciando correção de propriedades do React (filename -> path)..."

# 1. Corrigir App.tsx
if [ -f "$APP_PATH" ]; then
    # Substitui filename={ por path={
    sed -i 's/filename={/path={/g' "$APP_PATH"
    log_ok "App.tsx corrigido."
else
    echo "Erro: App.tsx não encontrado."
    exit 1
fi

# 2. Corrigir TestsPanel.tsx
if [ -f "$TESTS_PANEL_PATH" ]; then
    # Substitui filename={ por path={
    sed -i 's/filename={/path={/g' "$TESTS_PANEL_PATH"
    log_ok "TestsPanel.tsx corrigido."
else
    echo "Erro: TestsPanel.tsx não encontrado."
    exit 1
fi

# 3. Recompilar UI para validação final
log_info "Recompilando UI..."
cd packages/ui

# Limpa cache para garantir
rm -f tsconfig.tsbuildinfo

if ../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build; then
    log_ok "UI compilada com sucesso! (Zero Errors)"
else
    echo "Erro persistente na compilação da UI."
    exit 1
fi
cd ../..

log_ok "Correção aplicada com sucesso. Pode recarregar o navegador."

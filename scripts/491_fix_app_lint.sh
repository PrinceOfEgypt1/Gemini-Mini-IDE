#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

APP_FILE="packages/ui/src/App.tsx"

log_info "Corrigindo violação de lint 'no-explicit-any' em App.tsx..."

if [ -f "$APP_FILE" ]; then
    # Substitui 'catch (error: any)' por 'catch (error: unknown)'
    # Isso é seguro pois o código já faz 'error instanceof Error' logo abaixo
    sed -i 's/catch (error: any)/catch (error: unknown)/g' "$APP_FILE"
    
    log_ok "App.tsx corrigido."
else
    echo "Erro: Arquivo App.tsx não encontrado."
    exit 1
fi

# Executar pipeline para validação final
log_info "Executando Pipeline Final..."
bash ./42_pipeline_checklist.sh

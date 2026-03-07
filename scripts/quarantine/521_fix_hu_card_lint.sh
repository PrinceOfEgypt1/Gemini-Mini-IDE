#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

FILE_PATH="packages/ui/src/components/hus/UserStoryCard.tsx"

log_info "Corrigindo violações de 'prefer-const' em UserStoryCard.tsx..."

# 1. Correção cirúrgica: mudar 'let' para 'const' apenas nas variáveis que não mudam
if [ -f "$FILE_PATH" ]; then
    # Substitui 'let action =' por 'const action ='
    sed -i 's/let action =/const action =/g' "$FILE_PATH"
    
    # Substitui 'let benefit =' por 'const benefit ='
    sed -i 's/let benefit =/const benefit =/g' "$FILE_PATH"
    
    log_ok "Arquivo corrigido."
else
    echo "Erro: Arquivo UserStoryCard.tsx não encontrado."
    exit 1
fi

# 2. Rodar Pipeline para validar
log_info "Executando Pipeline Final..."
bash ./42_pipeline_checklist.sh

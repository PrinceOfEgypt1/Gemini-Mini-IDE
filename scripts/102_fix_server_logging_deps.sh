#!/usr/bin/env bash
################################################################################
# Script: 102_fix_server_logging_deps.sh
# Objetivo: Adicionar pino-pretty ao server para resolver erro de runtime
# Data: 2024-11-23
################################################################################

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

log_info() { echo -e "${BLUE}[info]${NC} $1"; }
log_ok() { echo -e "${GREEN}[ok]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[warn]${NC} $1"; }

readonly SERVER_PKG="packages/server/package.json"

log_info "Fase 10 - Fix: Adicionando pino-pretty ao server"

# 1. Atualizar package.json adicionando pino-pretty e pino-roll
log_info "Atualizando $SERVER_PKG com dependências de logging..."

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$SERVER_PKG', 'utf8'));

// Adicionar pino-pretty e pino-roll se não existirem
if (!pkg.dependencies['pino-pretty']) {
  pkg.dependencies['pino-pretty'] = '^10.0.0';
}
if (!pkg.dependencies['pino-roll']) {
  pkg.dependencies['pino-roll'] = '^1.0.0';
}

// Garantir que eslint não está em devDependencies
if (pkg.devDependencies && pkg.devDependencies.eslint) {
  delete pkg.devDependencies.eslint;
}

fs.writeFileSync('$SERVER_PKG', JSON.stringify(pkg, null, 2) + '\n');
"

log_ok "package.json atualizado"

# 2. Limpar node_modules local do servidor
if [ -d "packages/server/node_modules" ]; then
  log_info "Removendo node_modules local do servidor..."
  rm -rf packages/server/node_modules
  log_ok "node_modules removido"
fi

# 3. Reinstalar dependências na raiz
log_info "Executando pnpm install na raiz..."
pnpm install

log_ok "Dependências reinstaladas"

# 4. Validar build do servidor
log_info "Validando build do servidor..."
pnpm --filter @mini-ide/server build

log_ok "Build do servidor passou"

echo ""
log_ok "✅ Correção aplicada com sucesso!"
log_info "Execute './scripts/bash_42_pipeline_checklist.sh' para validar o smoke test"

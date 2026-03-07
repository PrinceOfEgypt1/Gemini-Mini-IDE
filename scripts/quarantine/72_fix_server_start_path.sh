#!/usr/bin/env bash
set -e

echo "🚑 Sprint 10.5: Corrigindo caminhos de execução (dist/src/index.js)..."

# 1. Corrigir script 'start' do Servidor
# -----------------------------------------------------
echo "📝 Atualizando @mini-ide/server package.json..."
tmp=$(mktemp)
# Atualiza o script start para apontar para dist/src/index.js
jq '.scripts.start = "node dist/src/index.js"' packages/server/package.json > "$tmp" && mv "$tmp" packages/server/package.json

# 2. Corrigir binário da CLI (Preventivo)
# Se o server mudou, a CLI também deve ter mudado para dist/src
# -----------------------------------------------------
echo "📝 Atualizando @mini-ide/cli package.json..."
tmp2=$(mktemp)
jq '.bin = { "mini-ide": "./dist/src/index.js" }' packages/cli/package.json > "$tmp2" && mv "$tmp2" packages/cli/package.json

echo "✅ Caminhos de execução corrigidos."
echo "👉 Tente rodar 'pnpm --filter @mini-ide/server start' agora."

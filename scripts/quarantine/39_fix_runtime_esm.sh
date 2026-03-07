#!/usr/bin/env bash
set -e

echo "🚑 Sprint 7.6: Corrigindo resolução de módulos ESM (Runtime Fix)..."

# 1. Corrigir package.json do Shared
# Definir explicitamente "import" e "types" no exports
# -----------------------------------------------------
echo "⚙️ Ajustando exports do @mini-ide/shared..."
tmp=$(mktemp)
jq '.exports = { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }' packages/shared/package.json > "$tmp" && mv "$tmp" packages/shared/package.json

# 2. Corrigir package.json do Analysis Agent
# -----------------------------------------------------
echo "⚙️ Ajustando exports do @mini-ide/analysis-agent..."
tmp2=$(mktemp)
jq '.exports = { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }' packages/analysis-agent/package.json > "$tmp2" && mv "$tmp2" packages/analysis-agent/package.json

# 3. Forçar atualização dos links do PNPM
# Isso é crucial para o Node entender as mudanças no package.json
# -----------------------------------------------------
echo "🔄 Regenerando node_modules (pnpm install)..."
rm -rf node_modules packages/*/node_modules
pnpm install

# 4. Rebuild limpo de tudo
# -----------------------------------------------------
echo "🏗️ Reconstruindo todo o projeto..."
# Limpar dists antigos para garantir que não há lixo
rm -rf packages/*/dist

# Build na ordem correta de dependência
pnpm --filter @mini-ide/shared build
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build
pnpm --filter @mini-ide/cli build
# UI não precisa de build para o teste do servidor, mas vamos garantir
pnpm --filter @mini-ide/ui build

echo "✅ Correção de Runtime aplicada."
echo "👉 Execute ./42_pipeline_checklist.sh (O Smoke Test deve passar agora)"

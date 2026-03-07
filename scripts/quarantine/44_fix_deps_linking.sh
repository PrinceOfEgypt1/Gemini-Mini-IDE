#!/usr/bin/env bash
set -e

echo "🚑 Sprint 7.11: Forçando linkagem de dependências locais..."

# 1. Configurar .npmrc para ajudar o TS a achar pacotes
# -----------------------------------------------------
echo "📝 Criando .npmrc..."
cat > .npmrc <<EOF
public-hoist-pattern[]=*types*
public-hoist-pattern[]=*eslint*
shamefully-hoist=true
EOF

# 2. Garantir configuração correta do Analysis Agent
# -----------------------------------------------------
echo "⚙️ Ajustando package.json do Agent..."
tmp=$(mktemp)
# Garante que o nome está correto e que types aponta para o d.ts
jq '.name = "@mini-ide/analysis-agent" | .version = "0.0.1" | .main = "./dist/index.js" | .types = "./dist/index.d.ts"' packages/analysis-agent/package.json > "$tmp" && mv "$tmp" packages/analysis-agent/package.json

# 3. Forçar adição das dependências no Server
# Usamos workspace:* para garantir que ele pegue a versão local
# -----------------------------------------------------
echo "🔗 Relinkando dependências no Server..."
# Remove primeiro para garantir limpeza
pnpm --filter @mini-ide/server remove @mini-ide/analysis-agent @mini-ide/shared || true
# Adiciona novamente
pnpm --filter @mini-ide/server add @mini-ide/analysis-agent@workspace:*
pnpm --filter @mini-ide/server add @mini-ide/shared@workspace:*

# 4. Limpeza Radical e Reinstalação
# -----------------------------------------------------
echo "🧹 Limpando node_modules..."
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf packages/*/dist
rm -rf packages/*/tsconfig.tsbuildinfo

echo "🔄 Instalando (pnpm install)..."
pnpm install

# 5. Build Sequencial (Garantindo que os .d.ts existam)
# -----------------------------------------------------
echo "🏗️ Build: Shared -> Agent -> Server..."

echo "   > Shared..."
pnpm --filter @mini-ide/shared build

echo "   > Agent..."
pnpm --filter @mini-ide/analysis-agent build

echo "   > Server..."
pnpm --filter @mini-ide/server build

echo "✅ Linkagem corrigida."
echo "👉 Execute ./42_pipeline_checklist.sh"

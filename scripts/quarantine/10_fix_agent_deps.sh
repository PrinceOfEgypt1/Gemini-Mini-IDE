#!/usr/bin/env bash
set -e

echo "🚑 Corrigindo dependências do Agente..."

# Instala uuid e types no pacote analysis-agent
echo "⬇️ Instalando uuid em @mini-ide/analysis-agent..."
pnpm --filter @mini-ide/analysis-agent add uuid
pnpm --filter @mini-ide/analysis-agent add -D @types/uuid

# Rebuild do agente para garantir que o erro sumiu
echo "🏗️ Recompilando analysis-agent..."
pnpm --filter @mini-ide/analysis-agent build

# Rebuild do server (pois ele depende do agent)
echo "🏗️ Recompilando server..."
pnpm --filter @mini-ide/server build

echo "✅ Correção aplicada!"
echo "👉 Execute ./42_pipeline_checklist.sh para validar o fluxo completo."

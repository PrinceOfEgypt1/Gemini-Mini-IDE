#!/bin/bash
################################################################################
# FIX AGENT.TS - Correção direta e simples
# Remove imports não utilizados que estão causando erros
################################################################################

set -e

AGENT_FILE="packages/analysis-agent/src/agent.ts"

echo "🔧 Corrigindo agent.ts..."
echo ""

# Fazer backup
echo "[1/2] Criando backup..."
cp "$AGENT_FILE" "$AGENT_FILE.bak.$(date +%Y%m%d_%H%M%S)"

# Remover linhas de imports não utilizados (linhas 5-15 que foram adicionadas pelos scripts)
echo "[2/2] Removendo imports não utilizados..."

# Usar sed para deletar as linhas de import dos módulos tier (que não estão sendo usados)
sed -i '/^import.*model-tiers/d' "$AGENT_FILE"
sed -i '/^import.*model-mappings/d' "$AGENT_FILE"
sed -i '/^import.*model-strategy/d' "$AGENT_FILE"
sed -i '/^import.*concurrency/d' "$AGENT_FILE"
sed -i '/^import.*array.js/d' "$AGENT_FILE"
sed -i '/^import.*metrics.js/d' "$AGENT_FILE"
sed -i '/^import.*pricing.js/d' "$AGENT_FILE"

echo "✓ Imports não utilizados removidos"
echo ""
echo "✓ agent.ts corrigido! Agora execute:"
echo "  pnpm typecheck"
echo ""

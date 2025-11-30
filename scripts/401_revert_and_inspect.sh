#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/401_revert_and_inspect.sh
# Objetivo: Desfazer a quebra do build e ler a estrutura correta das classes
# ------------------------------------------------------------------------------

echo "🚑 Revertendo arquivo quebrado..."
# Descarta as alterações locais no arquivo que eu quebrei
git checkout packages/analysis-agent/src/personas/product.ts

echo "🔍 Lendo contratos de classe para implementação correta..."

echo "--- CONTRATO BASE (BasePersona) ---"
cat packages/analysis-agent/src/personas/base-persona.ts

echo ""
echo "--- IMPLEMENTAÇÃO ORIGINAL (ProductPersona) ---"
cat packages/analysis-agent/src/personas/product.ts

echo ""
echo "✅ Reversão concluída. Aguardando análise para reimplementação correta."

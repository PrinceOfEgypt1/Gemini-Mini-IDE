#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/304_audit_deep_dive.sh
# Objetivo: Extrair o conteúdo BRUTO gerado pela IA para comparar com a UI
# Autor: Mini-IDE Agent
# ------------------------------------------------------------------------------

echo "🕵️  AUDITORIA PROFUNDA DO ÚLTIMO BUNDLE..."

# 1. Pegar o último arquivo gerado
LATEST_BUNDLE=$(find packages/server/bundles -type f -name "*.json" -printf "%T@ %p\n" | sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$LATEST_BUNDLE" ]; then
    echo "❌ Nenhum bundle encontrado."
    exit 1
fi

echo "📂 Arquivo: $LATEST_BUNDLE"
echo "----------------------------------------------------------------"

# 2. Checar o que a Persona PRODUCT gerou (HUs)
echo "🧠 [PRODUCT] Conteúdo Bruto (Amostra):"
jq -r '.personas.product.content' "$LATEST_BUNDLE" | head -n 30
echo "..."
echo "----------------------------------------------------------------"

# 3. Checar o que a Persona ENGINE gerou (Código)
echo "⚙️ [ENGINE] Conteúdo Bruto (Estrutura de arquivos detectada):"
# Tenta extrair apenas as linhas que parecem definição de arquivo
jq -r '.personas.engine.content' "$LATEST_BUNDLE" | grep -E "^(###|\*\*File:|File:).+" || echo "⚠️ Nenhuma marcação de arquivo padrão encontrada no texto bruto."

echo "----------------------------------------------------------------"
echo "📊 ESTATÍSTICAS DO SISTEMA:"
FILE_COUNT=$(jq '.engine.files | length' "$LATEST_BUNDLE")
HU_COUNT=$(jq '.product.userStories | length' "$LATEST_BUNDLE")

echo "- Arquivos extraídos: $FILE_COUNT"
echo "- HUs extraídas: $HU_COUNT"

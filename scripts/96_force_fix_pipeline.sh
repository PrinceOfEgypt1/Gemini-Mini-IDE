#!/usr/bin/env bash
set -e

echo "🔧 [Phase 10] Reparando caminho no checklist (Tentativa 2 - Force)..."

TARGET_FILE="42_pipeline_checklist.sh"

# Verificação preliminar
if grep -q "dist/src/index.js" "$TARGET_FILE"; then
    echo "🔎 Problema detectado: O arquivo contém referências antigas a 'dist/src/index.js'."
else
    echo "⚠️  Aviso: O padrão 'dist/src/index.js' não foi encontrado. Talvez já esteja corrigido?"
fi

# Substituição global: Troca 'dist/src/index.js' por 'dist/index.js'
# Funciona independente de ter './' ou aspas antes
sed -i 's|dist/src/index.js|dist/index.js|g' "$TARGET_FILE"

# Verificação final
if grep -q "dist/src/index.js" "$TARGET_FILE"; then
    echo "❌ ERRO CRÍTICO: A substituição falhou. Conteúdo restante:"
    grep "dist/src/index.js" "$TARGET_FILE"
    exit 1
else
    echo "✅ Sucesso! Caminho corrigido."
    echo "👉 O servidor agora será iniciado via 'dist/index.js'."
fi

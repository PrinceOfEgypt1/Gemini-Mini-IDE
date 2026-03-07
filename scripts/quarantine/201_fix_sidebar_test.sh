#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/201_fix_sidebar_test.sh
# Objetivo: Corrigir extensão do teste da Sidebar e validar
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🔧 Iniciando correção do teste da Sidebar..."

# 1. Renomear arquivo de teste para corresponder ao padrão do Vitest (TSX)
# ------------------------------------------------------------------------------
SOURCE="packages/ui/src/utils/fileTree.test.ts"
DEST="packages/ui/src/utils/fileTree.test.tsx"

if [ -f "$SOURCE" ]; then
    echo "b  Renomeando $SOURCE -> $DEST"
    mv "$SOURCE" "$DEST"
else
    echo "⚠️  Arquivo $SOURCE não encontrado (talvez já renomeado?). Verificando $DEST..."
    if [ ! -f "$DEST" ]; then
        echo "❌ Erro: Nenhum arquivo de teste encontrado."
        exit 1
    fi
fi

# 2. Executar o teste novamente
# ------------------------------------------------------------------------------
echo "🧪 Executando testes do pacote UI..."
pnpm --filter @mini-ide/ui test src/utils/fileTree.test.tsx

echo "✅ Teste unitário corrigido e aprovado."

# 3. Verificação de integridade do pacote UI
# ------------------------------------------------------------------------------
echo "🏗️  Verificando build do pacote UI..."
pnpm --filter @mini-ide/ui build

echo "🎉 Script 201 concluído com sucesso."

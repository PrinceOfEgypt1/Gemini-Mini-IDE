#!/usr/bin/env bash
set -e

echo "🧹 [Phase 11] Removendo arquivos redundantes/conflitantes na UI..."

# ==============================================================================
# 1. Remover hook obsoleto
# A lógica agora vive em packages/ui/src/contexts/ToastContext.tsx
# ==============================================================================
TARGET_FILE="packages/ui/src/hooks/useToast.ts"

if [ -f "$TARGET_FILE" ]; then
    echo "🗑️  Removendo $TARGET_FILE (Código morto)..."
    rm "$TARGET_FILE"
else
    echo "⚠️  Arquivo $TARGET_FILE não encontrado (já removido?)."
fi

# ==============================================================================
# 2. Validação Final
# ==============================================================================
echo "🏗️  Validando Build da UI (Sem o arquivo conflitante)..."
pnpm --filter @mini-ide/ui build

echo "✅ UI Compilada com sucesso! O sistema de Exportação está pronto."

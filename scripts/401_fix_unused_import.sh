#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 401_fix_unused_import.sh
# DESCRIÇÃO: Remove importação não utilizada 'useEffect' em App.tsx (Erro TS6133).
#            Finaliza o build do frontend.
# AUTOR: Mini-IDE Senior Architect
# ==============================================================================

echo ">>> 🔧 CORRIGINDO IMPORT NÃO UTILIZADO (TS6133)..."

# 1. Substitui a linha de importação problemática
# De: import { useState, useEffect } from 'react';
# Para: import { useState } from 'react';
if [ -f "packages/ui/src/App.tsx" ]; then
    sed -i 's/import { useState, useEffect }/import { useState }/' packages/ui/src/App.tsx
    echo ">>> Import corrigido em packages/ui/src/App.tsx"
else
    echo "❌ Erro: App.tsx não encontrado."
    exit 1
fi

# 2. Recompilar
echo ">>> Recompilando UI..."
pnpm --filter @mini-ide/ui build

echo "======================================================="
echo "✅ BUILD VERDE. APLICAÇÃO PRONTA."
echo "======================================================="
echo "Agora execute:"
echo "pnpm --filter @mini-ide/ui dev"
echo "======================================================="

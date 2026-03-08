#!/usr/bin/env bash
set -e

echo "🚑 Sprint 6.8: Corrigindo Ambiente de Teste (JSDOM)..."

# 1. Reinstalar dependências de teste na UI (Garantia)
# -----------------------------------------------------
echo "📦 Reinstalando jsdom e testing-library..."
pnpm --filter @mini-ide/ui add -D jsdom @testing-library/react @testing-library/dom @types/react @types/react-dom vitest

# 2. Configurar vitest.config.ts ESPECÍFICO da UI
# -----------------------------------------------------
echo "📝 Configurando packages/ui/vitest.config.ts..."
cat > packages/ui/vitest.config.ts <<EOF
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // AQUI ESTÁ A CHAVE
    setupFiles: [],
    include: ['test/**/*.test.tsx', 'src/**/*.test.tsx'],
  },
});
EOF

# 3. Corrigir tsconfig.json da UI para incluir tipos do Vitest
# -----------------------------------------------------
echo "📝 Ajustando tsconfig da UI..."
# Adicionamos "vitest/globals" aos types para o TS não reclamar de 'describe/it'
tmp=$(mktemp)
jq '.compilerOptions.types += ["vitest/globals"]' packages/ui/tsconfig.json > "$tmp" && mv "$tmp" packages/ui/tsconfig.json || echo "Falha ao editar tsconfig com jq, verifique se o campo types existe."

echo "✅ Correção de ambiente aplicada."
echo "👉 Execute ./42_pipeline_checklist.sh para validar."

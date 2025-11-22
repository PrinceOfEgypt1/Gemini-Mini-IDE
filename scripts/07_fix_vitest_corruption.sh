#!/usr/bin/env bash
set -e

echo "🚑 Reparando arquivo vitest.config.ts corrompido..."

# Reescreve o arquivo com o conteúdo TypeScript válido
cat > vitest.config.ts <<EOF
import { defineConfig } from 'vitest/config';
export default defineConfig({
test: {
globals: true,
environment: 'node',
// Ignora pastas de build e dependências
exclude: ['/node_modules/', '/dist/', '/coverage/'],
// Procura testes apenas dentro de src
include: ['packages//src/**/.test.ts'],
},
});
EOF
echo "✅ Arquivo restaurado."
echo "🧹 Limpando caches do Vite/Vitest..."
rm -rf node_modules/.vitest

echo "👉 Tente rodar o pipeline agora: ./42_pipeline_checklist.sh"

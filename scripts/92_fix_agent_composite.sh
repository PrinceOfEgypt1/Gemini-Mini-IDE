#!/usr/bin/env bash
set -e

echo "🚑 [Phase 10] Corrigindo configuração 'composite' do Analysis Agent..."

# ==========================================
# 1. Corrigir TSConfig do AGENT
# Adicionando "composite": true para permitir que o Server o referencie
# ==========================================
echo "⚙️  Atualizando packages/analysis-agent/tsconfig.json..."
cat > packages/analysis-agent/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
EOF

# ==========================================
# 2. Limpar cache de build do TS (para garantir)
# ==========================================
echo "🧹 Limpando cache de build antigo..."
rm -f packages/analysis-agent/tsconfig.tsbuildinfo
rm -f packages/server/tsconfig.tsbuildinfo

# ==========================================
# 3. Build Final
# ==========================================
echo "🏗️  Retomando build..."

echo "   > [Agent] Recompilando com composite..."
pnpm --filter @mini-ide/analysis-agent build

echo "   > [Server] Compilando (deve funcionar agora)..."
pnpm --filter @mini-ide/server build

echo "✅ Fase 10 Concluída: Backend compilado com sucesso."
echo "👉 Próximo passo: Validar com 'pnpm test' ou iniciar a aplicação."

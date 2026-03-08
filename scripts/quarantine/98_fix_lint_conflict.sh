#!/usr/bin/env bash
set -e

echo "🧹 [Phase 10] Removendo conflitos de versão do ESLint..."

# ==========================================
# 1. Corrigir package.json do SHARED
# Mantemos exports/main/types corretos (Script 97)
# REMOVEMOS: eslint das devDependencies (usa a do root)
# ==========================================
echo "📦 Ajustando packages/shared/package.json..."
cat > packages/shared/package.json <<EOF
{
  "name": "@mini-ide/shared",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vitest": "^1.2.1"
  }
}
EOF

# ==========================================
# 2. Corrigir package.json do ANALYSIS-AGENT
# Mantemos exports/main/types corretos (Script 97)
# REMOVEMOS: eslint das devDependencies (usa a do root)
# ==========================================
echo "📦 Ajustando packages/analysis-agent/package.json..."
cat > packages/analysis-agent/package.json <<EOF
{
  "name": "@mini-ide/analysis-agent",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@mini-ide/shared": "workspace:*",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vitest": "^1.2.1"
  }
}
EOF

# ==========================================
# 3. Limpeza Nuclear de Dependências
# Necessário para remover versões "fantasmas" do ESLint 9
# ==========================================
echo "☢️  Limpando node_modules para garantir resolução limpa..."
rm -rf node_modules
rm -rf packages/*/node_modules
# Não removemos pnpm-lock.yaml para manter as versões do root estáveis,
# apenas forçamos a reavaliação da árvore.

echo "🔄 Reinstalando dependências (Linkagem do Monorepo)..."
pnpm install --no-frozen-lockfile

# ==========================================
# 4. Verificação Rápida de Lint
# ==========================================
echo "🧪 Verificando Lint do Shared..."
pnpm --filter @mini-ide/shared lint

echo "✅ Correção de dependências aplicada com sucesso."

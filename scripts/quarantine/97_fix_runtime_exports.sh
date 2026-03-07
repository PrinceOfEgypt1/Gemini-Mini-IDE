#!/usr/bin/env bash
set -e

echo "🕵️  [Auditoria] Corrigindo manifestos de pacote para Node v22+..."

# ==========================================
# 1. Corrigir @mini-ide/shared
# ==========================================
echo "📦 Configurando exports do SHARED..."
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
    "vitest": "^1.2.1",
    "eslint": "^8.56.0"
  }
}
EOF

# ==========================================
# 2. Corrigir @mini-ide/analysis-agent
# ==========================================
echo "📦 Configurando exports do ANALYSIS-AGENT..."
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
    "vitest": "^1.2.1",
    "eslint": "^8.56.0"
  }
}
EOF

# ==========================================
# 3. Atualizar Links do Monorepo
# O PNPM precisa ler os novos package.json para criar os links corretos
# ==========================================
echo "🔄 Atualizando links do workspace (pnpm install)..."
pnpm install --no-frozen-lockfile

# ==========================================
# 4. Rebuild Garantido
# Para ter certeza que os arquivos físicos em dist/ batem com a config
# ==========================================
echo "🏗️  Reconstruindo bibliotecas..."
pnpm --filter @mini-ide/shared build
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build

echo "✅ Auditoria e Correção Concluídas."
echo "👉 O Node agora conseguirá resolver '@mini-ide/analysis-agent' corretamente."

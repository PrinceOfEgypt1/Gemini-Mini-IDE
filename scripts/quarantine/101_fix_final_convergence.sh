#!/usr/bin/env bash
set -e

echo "🔬 [Auditoria] Quebrando o ciclo de regressão (Lint vs Runtime)..."

# ==========================================
# 1. O ARQUIVO DE OURO (Golden Master)
# Requisitos atendidos:
# - Runtime: Fastify + Swagger (para o servidor rodar)
# - Dev: Typescript + Vitest (para build/test)
# - Dev: SEM ESLint (para herdar do root e corrigir o erro 'allowShortCircuit')
# - Main: Aponta para dist/index.js (para o script de start funcionar)
# ==========================================
echo "📦 Escrevendo packages/server/package.json DEFINITIVO..."
cat > packages/server/package.json <<EOF
{
  "name": "@mini-ide/server",
  "version": "0.0.1",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -b",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "vitest run",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "fastify": "^4.26.1",
    "@fastify/cors": "^9.0.1",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^3.0.0",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4",
    "@mini-ide/shared": "workspace:*",
    "@mini-ide/analysis-agent": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.1",
    "vitest": "^1.2.1"
  }
}
EOF

# ==========================================
# 2. Limpeza Cirúrgica de 'node_modules' do Server
# Removemos qualquer versão local do ESLint que o Script 100 tenha instalado
# ==========================================
echo "🧹 Removendo node_modules locais do server..."
rm -rf packages/server/node_modules

# ==========================================
# 3. Instalação e Linkagem
# ==========================================
echo "🔄 Reinstalando dependências..."
pnpm install --no-frozen-lockfile

# ==========================================
# 4. Verificação Dupla (Lint + Build)
# ==========================================
echo "🧪 Testando Lint do Server (deve passar agora)..."
pnpm --filter @mini-ide/server lint

echo "🏗️  Testando Build do Server..."
pnpm --filter @mini-ide/server build

echo "✅ Convergência atingida. O ambiente está limpo."

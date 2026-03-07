#!/usr/bin/env bash
set -e

echo "🔬 [Auditoria] Reconciliando dependências do Servidor (Express -> Fastify)..."

# ==========================================
# 1. Corrigir package.json do SERVER
# O código exige Fastify, mas o manifesto tinha Express.
# ==========================================
echo "📦 Ajustando packages/server/package.json para usar Fastify..."
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
# 2. Limpeza de Dependências Antigas
# Removemos express/cors para limpar o ambiente
# ==========================================
echo "🧹 Limpando node_modules do server..."
rm -rf packages/server/node_modules

# ==========================================
# 3. Instalação e Linkagem
# ==========================================
echo "🔄 Instalando novas dependências (Fastify)..."
pnpm install --no-frozen-lockfile

# ==========================================
# 4. Rebuild de Segurança
# Garante que o TS aceita as novas libs (caso use tipos globais)
# ==========================================
echo "🏗️  Reconstruindo Server..."
pnpm --filter @mini-ide/server build

echo "✅ Dependências corrigidas. O servidor agora possui o runtime 'fastify' necessário."

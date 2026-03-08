#!/usr/bin/env bash
set -e

echo "🔬 [Auditoria Final] Sincronizando Stack Fastify Completa..."

# ==========================================
# 1. Definir Manifesto Definitivo do Server
# Inclui Fastify Core + CORS + Swagger + UI
# ==========================================
echo "📦 Escrevendo packages/server/package.json completo..."
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
    "vitest": "^1.2.1",
    "eslint": "^8.56.0"
  }
}
EOF

# ==========================================
# 2. Limpeza Cirúrgica
# Removemos node_modules do server para forçar re-resolução
# ==========================================
echo "🧹 Limpando dependências antigas do server..."
rm -rf packages/server/node_modules

# ==========================================
# 3. Instalação e Linkagem
# ==========================================
echo "🔄 Instalando stack completa..."
pnpm install --no-frozen-lockfile

# ==========================================
# 4. Build de Verificação
# ==========================================
echo "🏗️  Validando build..."
pnpm --filter @mini-ide/server build

echo "✅ Dependências: Fastify, CORS, Swagger e Swagger-UI instalados."

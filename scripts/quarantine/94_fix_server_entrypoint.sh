#!/usr/bin/env bash
set -e

echo "🚑 [Phase 10] Corrigindo entrypoint e build do Server..."

# ==========================================
# 1. Corrigir package.json do SERVER
# Definir explicitamente o caminho correto para 'dist/index.js'
# ==========================================
echo "📦 Ajustando packages/server/package.json..."
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
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "@mini-ide/shared": "workspace:*",
    "@mini-ide/analysis-agent": "workspace:*"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.1",
    "vitest": "^1.2.1"
  }
}
EOF

# ==========================================
# 2. Corrigir TSConfig do SERVER
# Garantir que rootDir e outDir produzam uma estrutura plana em 'dist/'
# ==========================================
echo "⚙️  Ajustando packages/server/tsconfig.json..."
cat > packages/server/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" },
    { "path": "../analysis-agent" }
  ]
}
EOF

# ==========================================
# 3. Rebuild Limpo do Server
# ==========================================
echo "🧹 Limpando build antigo do server..."
rm -rf packages/server/dist
rm -f packages/server/tsconfig.tsbuildinfo

echo "🏗️  Reconstruindo Server..."
pnpm --filter @mini-ide/server build

# ==========================================
# 4. Verificação de Arquivo
# ==========================================
if [ -f "packages/server/dist/index.js" ]; then
    echo "✅ Arquivo 'packages/server/dist/index.js' encontrado!"
else
    echo "❌ ERRO: O arquivo 'dist/index.js' não foi gerado. Verifique a estrutura de pastas."
    ls -R packages/server/dist
    exit 1
fi

echo "✅ Correção aplicada. O servidor deve iniciar corretamente agora."

#!/usr/bin/env bash
set -e

echo "🚑 Restaurando referências do TypeScript (Pós-Rollback)..."

# 1. Configurar Referências no Analysis Agent
# Ele precisa saber que depende do 'shared'
# -----------------------------------------------------
echo "📝 Corrigindo packages/analysis-agent/tsconfig.json..."
cat > packages/analysis-agent/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
EOF

# 2. Configurar Referências no Server
# Ele precisa saber que depende do 'shared' e do 'analysis-agent'
# -----------------------------------------------------
echo "📝 Corrigindo packages/server/tsconfig.json..."
cat > packages/server/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" },
    { "path": "../analysis-agent" }
  ]
}
EOF

# 3. Forçar atualização dos links do PNPM
# -----------------------------------------------------
echo "🔄 Relinkando dependências..."
pnpm install

# 4. Build Sequencial Manual
# -----------------------------------------------------
echo "🏗️ Tentando construir novamente..."

echo "   > [1/4] Shared..."
pnpm --filter @mini-ide/shared build

echo "   > [2/4] Agent..."
pnpm --filter @mini-ide/analysis-agent build

echo "   > [3/4] Server..."
pnpm --filter @mini-ide/server build

echo "   > [4/4] UI..."
pnpm --filter @mini-ide/ui build

echo "✅ Build recuperado com sucesso!"
echo "👉 Agora você pode rodar a aplicação (start/dev)."

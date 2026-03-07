#!/usr/bin/env bash
set -e

echo "🔧 Sprint 7.1: Separando Build e Typecheck no Server..."

# 1. Reverter o tsconfig.json do Server para focar apenas no Build (src)
# Isso garante que o output continue sendo dist/index.js e não dist/src/index.js
# -----------------------------------------------------
echo "📝 Ajustando packages/server/tsconfig.json (Build Config)..."
cat > packages/server/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

# 2. Criar tsconfig.check.json para validação total
# Este arquivo estende o principal mas permite olhar para a pasta test
# e muda o rootDir para a raiz do pacote.
# -----------------------------------------------------
echo "📝 Criando packages/server/tsconfig.check.json (QA Config)..."
cat > packages/server/tsconfig.check.json <<EOF
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "noEmit": true
  },
  "include": ["src/**/*", "test/**/*"]
}
EOF

# 3. Atualizar o script de typecheck no package.json do Server
# Agora ele usa o arquivo de config específico para checagem
# -----------------------------------------------------
echo "⚙️ Atualizando script typecheck no @mini-ide/server..."
tmp=$(mktemp)
jq '.scripts.typecheck = "tsc --noEmit -p tsconfig.check.json"' packages/server/package.json > "$tmp" && mv "$tmp" packages/server/package.json

echo "✅ Configuração de TypeScript corrigida."
echo "👉 O build continuará limpo, e o typecheck validará os testes."
echo "👉 Execute ./42_pipeline_checklist.sh"

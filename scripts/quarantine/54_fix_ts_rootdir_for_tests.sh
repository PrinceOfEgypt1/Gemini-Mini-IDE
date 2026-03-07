#!/usr/bin/env bash
set -e

echo "🚑 Sprint 8.2: Ajustando rootDir para suportar testes fora de src..."

# Função para ajustar pacotes que têm testes na pasta /test
fix_package_structure() {
    local pkg=$1
    local refs=$2
    
    echo "⚙️ Ajustando @mini-ide/$pkg..."

    # 1. Atualizar tsconfig.json
    # Mudamos rootDir para "." para incluir tanto 'src' quanto 'test'
    cat > packages/$pkg/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "test/**/*"],
  "references": $refs
}
EOF

    # 2. Atualizar package.json
    # Como o rootDir mudou, a estrutura do dist muda de 'dist/index.js' para 'dist/src/index.js'
    tmp=$(mktemp)
    jq '.main = "./dist/src/index.js" | .exports["."].import = "./dist/src/index.js" | .exports["."].types = "./dist/src/index.d.ts" | .types = "./dist/src/index.d.ts"' packages/$pkg/package.json > "$tmp" && mv "$tmp" packages/$pkg/package.json
}

# Aplicar correção no Analysis Agent
fix_package_structure "analysis-agent" '[{"path": "../shared"}]'

# Aplicar correção no Server (preventivo, pois também tem testes fora de src)
fix_package_structure "server" '[{"path": "../shared"}, {"path": "../analysis-agent"}]'

# 3. Limpeza e Rebuild
# -----------------------------------------------------
echo "broom: Limpando caches e builds..."
rm -rf packages/*/dist packages/*/tsconfig.tsbuildinfo

echo "🏗️ Reconstruindo cadeia de dependências..."
pnpm --filter @mini-ide/shared build
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build

echo "✅ Correção aplicada: rootDir expandido para incluir testes."
echo "👉 Execute ./42_pipeline_checklist.sh"

#!/usr/bin/env bash
set -e

echo "🚑 Sprint 7.9: Ajustando 'rootDir' em todos os pacotes para suportar Source Mapping..."

# Função para atualizar tsconfig de um pacote
fix_tsconfig() {
    local pkg=$1
    echo "📝 Atualizando packages/$pkg/tsconfig.json..."
    
    # Configuramos rootDir para ../.. (raiz do monorepo) para englobar todos os pacotes
    # E ajustamos o outDir para manter a estrutura correta dist/packages/pkg/src
    # MAS, para simplificar e evitar aninhamento profundo no dist, 
    # vamos remover 'rootDir' e deixar o TS decidir, ou usar 'include' restritivo.
    
    # A estratégia vencedora aqui é: rootDir: "../.." e outDir: "dist" 
    # O TS vai espelhar a estrutura de pastas dentro de dist.
    # Ex: dist/packages/server/src/index.js
    # Isso exige ajustar o package.json "main" depois.
    
    # ALTERNATIVA MAIS SIMPLES QUE NÃO QUEBRA O RUNTIME:
    # Manter rootDir: "src" mas usar 'references' (Project References) corretamente.
    # Como 'paths' falhou com rootDir, vamos TENTAR uma abordagem híbrida:
    # rootDir: "." e include: ["src"]
    
    cat > packages/$pkg/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "." 
  },
  "include": ["src/**/*"]
}
EOF
}

# Aplica a correção em todos os pacotes
fix_tsconfig "server"
fix_tsconfig "ui"
fix_tsconfig "shared"
fix_tsconfig "analysis-agent"
fix_tsconfig "cli"

# O server tem um arquivo extra de check, vamos removê-lo para simplificar
rm -f packages/server/tsconfig.check.json
# Reverter o script de typecheck do server para o padrão
tmp=$(mktemp)
jq '.scripts.typecheck = "tsc --noEmit"' packages/server/package.json > "$tmp" && mv "$tmp" packages/server/package.json


# AGORA, UM DETALHE CRUCIAL:
# Se mudamos rootDir para ".", o output será "dist/src/index.js" em vez de "dist/index.js"
# Precisamos atualizar os package.json "main" e "exports" de TODOS os pacotes.

update_pkg_main() {
    local pkg=$1
    echo "⚙️ Ajustando entry points em $pkg..."
    tmp=$(mktemp)
    # Atualiza main e exports para apontar para dist/src/index.js
    jq '.main = "./dist/src/index.js" | .exports["."].import = "./dist/src/index.js" | .exports["."].types = "./dist/src/index.d.ts" | .types = "./dist/src/index.d.ts"' packages/$pkg/package.json > "$tmp" && mv "$tmp" packages/$pkg/package.json
}

update_pkg_main "server"
update_pkg_main "shared"
update_pkg_main "analysis-agent"
update_pkg_main "cli"
# UI é tratada pelo Vite, não precisa mudar main

# Limpeza geral
echo "🧹 Limpando tudo..."
rm -rf packages/*/dist packages/*/tsconfig.tsbuildinfo

echo "🏗️ Reconstruindo..."
pnpm --filter @mini-ide/shared build
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build
pnpm --filter @mini-ide/cli build

echo "✅ Correção de RootDir aplicada."
echo "👉 Execute ./42_pipeline_checklist.sh"

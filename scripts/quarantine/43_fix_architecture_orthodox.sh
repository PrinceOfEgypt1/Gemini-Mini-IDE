#!/usr/bin/env bash
set -e

echo "🚑 Sprint 7.10: Aplicando Arquitetura Ortodoxa (Project References sem Paths)..."

# 1. Limpar 'paths' do tsconfig.base.json
# Removemos a causa raiz dos erros TS6059
# -----------------------------------------------------
echo "📝 Limpando tsconfig.base.json..."
cat > tsconfig.base.json <<EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src" 
  }
}
EOF
# Note: rootDir voltou a ser ./src, que é o padrão correto para estrutura limpa.

# 2. Configurar Pacotes Individuais
# Ajustamos para usar 'references' e apontar main/exports para ./dist/index.js
# -----------------------------------------------------

setup_package() {
    local pkg=$1
    local refs=$2 # String JSON de referencias, ex: '[{"path": "../shared"}]'
    
    echo "⚙️ Configurando @mini-ide/$pkg..."
    
    # 2.1 TSConfig: Usa references
    cat > packages/$pkg/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": $refs
}
EOF
    
    # 2.2 Package.json: Aponta para dist/index.js (Revertendo script 42)
    tmp=$(mktemp)
    jq '.main = "./dist/index.js" | .exports["."].import = "./dist/index.js" | .exports["."].types = "./dist/index.d.ts" | .types = "./dist/index.d.ts"' packages/$pkg/package.json > "$tmp" && mv "$tmp" packages/$pkg/package.json
}

# Shared (Base, sem referencias)
setup_package "shared" "[]"

# Analysis Agent (Depende de Shared)
setup_package "analysis-agent" '[{"path": "../shared"}]'

# Server (Depende de Shared e Agent)
setup_package "server" '[{"path": "../shared"}, {"path": "../analysis-agent"}]'

# CLI (Depende de Shared indiretamente, mas vamos configurar limpo)
setup_package "cli" "[]"

# UI (Caso especial, usa bundler, mantemos config especifica mas ajustamos paths)
# A UI vai resolver via Node resolution do Vite
cat > packages/ui/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "composite": false
  },
  "include": ["src/**/*"]
}
EOF

# 3. Limpeza Profunda
# -----------------------------------------------------
echo "🧹 Limpando artefatos..."
rm -rf packages/*/dist
rm -rf packages/*/tsconfig.tsbuildinfo
# Forçar regeneração dos symlinks
rm -rf node_modules
pnpm install

# 4. Build em Cascata (A Ordem é Sagrada)
# -----------------------------------------------------
echo "🏗️ Reconstruindo o sistema..."

# Passo A: Shared (Gera dist/index.d.ts que os outros precisam)
echo "   > Building Shared..."
pnpm --filter @mini-ide/shared build

# Passo B: Agent (Lê tipos do shared/dist)
echo "   > Building Agent..."
pnpm --filter @mini-ide/analysis-agent build

# Passo C: Server (Lê tipos do shared/dist e agent/dist)
echo "   > Building Server..."
pnpm --filter @mini-ide/server build

# Passo D: Resto
pnpm --filter @mini-ide/cli build
pnpm --filter @mini-ide/ui build

echo "✅ Arquitetura corrigida. Dependências agora são resolvidas via 'references' e 'dist'."
echo "👉 Execute ./42_pipeline_checklist.sh"

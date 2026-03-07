#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# SPRINT 1: FUNDAÇÃO E GOVERNANÇA (Mini-IDE)
# ==========================================
# Objetivo: Configurar Monorepo, Tooling e Pipeline de Qualidade.
# Autor: Mini-IDE AI Team
# ==========================================

echo "🚀 Iniciando setup da Fundação do Mini-IDE..."

# 1. Verificações Iniciais
# ------------------------------------------
if ! command -v pnpm &> /dev/null; then
    echo "❌ Erro: 'pnpm' não encontrado. Por favor, instale o pnpm antes de continuar."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "⚠️ Aviso: 'git' não encontrado. A inicialização do git será pulada."
else
    if [ ! -d ".git" ]; then
        echo "📦 Inicializando repositório Git..."
        git init
        git branch -m main 2>/dev/null || true
    fi
fi

# 2. Estrutura de Diretórios (Monorepo)
# ------------------------------------------
echo "📂 Criando estrutura de pastas..."
mkdir -p packages/server
mkdir -p packages/ui
mkdir -p packages/shared
mkdir -p packages/analysis-agent
mkdir -p packages/cli
mkdir -p docs/adr

# 3. Configuração Raiz (package.json & pnpm-workspace)
# ------------------------------------------
echo "⚙️ Configurando workspace raiz..."

if [ ! -f "package.json" ]; then
    pnpm init
    # Ajusta o package.json para ser privado (root de monorepo)
    tmp=$(mktemp)
    jq '.private = true | .name = "mini-ide-monorepo"' package.json > "$tmp" && mv "$tmp" package.json
fi

# Cria pnpm-workspace.yaml
cat > pnpm-workspace.yaml <<EOF
packages:
  - 'packages/*'
EOF

# Cria .gitignore padrão para Node/Monorepo
cat > .gitignore <<EOF
node_modules
dist
build
coverage
.env
.DS_Store
*.log
.pnpm-debug.log*
EOF

# 4. Instalação de Dependências Globais de Desenvolvimento
# ------------------------------------------
echo "⬇️ Instalando ferramentas de qualidade (TypeScript, ESLint, Vitest)..."
# Instala na raiz (-w)
pnpm add -D -w typescript eslint prettier vitest @types/node \
    @typescript-eslint/parser @typescript-eslint/eslint-plugin \
    jq # jq é útil para scripts, garantindo que esteja disponível se formos usar em scripts npm

# 5. Configurações de Tooling (Base)
# ------------------------------------------
echo "📝 Criando arquivos de configuração base..."

# tsconfig.base.json (para ser estendido pelos pacotes)
cat > tsconfig.base.json <<EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
EOF

# Cria um tsconfig.json raiz apenas para incluir o base (boas práticas)
cat > tsconfig.json <<EOF
{
  "extends": "./tsconfig.base.json",
  "files": [],
  "references": [
    { "path": "./packages/server" },
    { "path": "./packages/ui" },
    { "path": "./packages/shared" },
    { "path": "./packages/cli" },
    { "path": "./packages/analysis-agent" }
  ]
}
EOF

# .prettierrc
cat > .prettierrc <<EOF
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
EOF

# .eslintrc.js (Configuração mínima e moderna)
cat > .eslintrc.js <<EOF
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    'no-console': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  }
};
EOF

# 6. Inicialização Mínima dos Pacotes (para evitar erro no install)
# ------------------------------------------
echo "📦 Inicializando pacotes vazios..."

init_package() {
    local pkg_name=$1
    local pkg_dir="packages/$pkg_name"

    if [ ! -f "$pkg_dir/package.json" ]; then
        mkdir -p "$pkg_dir/src"
        cat > "$pkg_dir/package.json" <<EOF
{
  "name": "@mini-ide/$pkg_name",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
EOF
        # Cria um arquivo dummy para o TS não reclamar
        echo "export const name = '$pkg_name';" > "$pkg_dir/src/index.ts"

        # Cria tsconfig específico do pacote
        cat > "$pkg_dir/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF
    fi
}

init_package "server"
init_package "ui"
init_package "shared"
init_package "analysis-agent"
init_package "cli"

# 7. O Guardião da Qualidade (Pipeline Local)
# ------------------------------------------
echo "🛡️ Criando o script Guardião (Pipeline Checklist)..."

cat > 42_pipeline_checklist.sh <<'EOF'
#!/usr/bin/env bash
set -e

echo "=============================================="
echo "🛡️  MINI-IDE PIPELINE CHECKLIST (Local Gate)"
echo "=============================================="

echo "[1/4] 🧹 Linting..."
pnpm lint

echo "[2/4] 🔍 Type Checking..."
pnpm typecheck --recursive

echo "[3/4] 🧪 Running Tests..."
pnpm test --recursive

echo "[4/4] 🏗️  Building..."
pnpm build --recursive

echo "=============================================="
echo "✅  PIPELINE VERDE! Pronto para commit."
echo "=============================================="
EOF

chmod +x 42_pipeline_checklist.sh

# 8. Documentação Viva
# ------------------------------------------
echo "📚 Gerando documentação inicial..."

cat > README.md <<EOF
# Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA.

## Estrutura
- **@mini-ide/server**: Backend Fastify + LLM Orchestration.
- **@mini-ide/ui**: Frontend React (Explore Workspace).
- **@mini-ide/shared**: Tipos e contratos compartilhados.
- **@mini-ide/cli**: Ferramenta de linha de comando.

## Governança
Antes de commitar, execute sempre:
\`bash ./42_pipeline_checklist.sh\`
EOF

cat > DEVELOPMENT.md <<EOF
# DEVELOPMENT.md - Mini-IDE

> **Estado:** Sprint 1 (Fundação)
> **Pipeline:** Ativo

## Como Desenvolver

1. **Instalar dependências:** \`pnpm install\`
2. **Rodar pipeline:** \`bash ./42_pipeline_checklist.sh\`

## Padrões
- **Monorepo:** pnpm workspaces.
- **Backend First:** Definir tipos em \`shared\` antes de implementar.
- **Qualidade:** Nenhum commit com lint ou testes falhando.
EOF

# 9. Finalização
# ------------------------------------------
echo "🔄 Rodando install final para linkar pacotes..."
pnpm install

echo "✅ Setup da Sprint 1 concluído com sucesso!"
echo "👉 Próximo passo: Rode 'bash ./42_pipeline_checklist.sh' para validar o ambiente."

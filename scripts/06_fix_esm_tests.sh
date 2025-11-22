#!/usr/bin/env bash
set -e

echo "🔧 Ajustando projeto para ES Modules (ESM) e corrigindo Vitest..."

# 1. Adicionar "type": "module" em todos os package.json
# Isso diz ao Node.js e ao Vitest que estamos usando 'import/export' nativo
# --------------------------------------------------------------------
add_type_module() {
    local pkg_dir=$1
    if [ -f "$pkg_dir/package.json" ]; then
        tmp=$(mktemp)
        jq '.type = "module"' "$pkg_dir/package.json" > "$tmp" && mv "$tmp" "$pkg_dir/package.json"
        echo "  -> ESM ativado em $pkg_dir"
    fi
}

add_type_module "." # Raiz
add_type_module "packages/server"
add_type_module "packages/ui"
add_type_module "packages/shared"
add_type_module "packages/analysis-agent"
add_type_module "packages/cli"


# 2. Criar vitest.config.ts na raiz (Configuração Global de Testes)
# --------------------------------------------------------------------
echo "📝 Criando vitest.config.ts..."
cat > vitest.config.ts <<EOF


Model
O erro Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead. indica um conflito entre o formato de módulo do projeto (provavelmente CommonJS por padrão no tsconfig) e o Vitest (que é nativo ESM).
Além disso, o Vitest está tentando rodar testes dentro da pasta dist/ (dist/index.test.js), o que não deveria acontecer. Devemos testar apenas o src/.
Vamos corrigir isso na Sprint 2.1 (Fix de Testes).
Correção (Sprint 2.1 - Modernização ESM)
Este script vai:
Forçar todos os pacotes a serem ES Modules ("type": "module" no package.json).
Configurar o vitest.config.ts na raiz para ignorar a pasta dist.
Ajustar os tsconfig.json para emitir módulos modernos.
Crie o arquivo:
code
Bash
nano 06_fix_esm_tests.sh
Cole o conteúdo:
code
Bash
#!/usr/bin/env bash
set -e

echo "🔧 Ajustando projeto para ES Modules (ESM) e corrigindo Vitest..."

# 1. Adicionar "type": "module" em todos os package.json
# Isso diz ao Node.js e ao Vitest que estamos usando 'import/export' nativo
# --------------------------------------------------------------------
add_type_module() {
    local pkg_dir=$1
    if [ -f "$pkg_dir/package.json" ]; then
        tmp=$(mktemp)
        jq '.type = "module"' "$pkg_dir/package.json" > "$tmp" && mv "$tmp" "$pkg_dir/package.json"
        echo "  -> ESM ativado em $pkg_dir"
    fi
}

add_type_module "." # Raiz
add_type_module "packages/server"
add_type_module "packages/ui"
add_type_module "packages/shared"
add_type_module "packages/analysis-agent"
add_type_module "packages/cli"


# 2. Criar vitest.config.ts na raiz (Configuração Global de Testes)
# --------------------------------------------------------------------
echo "📝 Criando vitest.config.ts..."
cat > vitest.config.ts <<EOF
import { defineConfig } from 'vitest/config';
export default defineConfig({
test: {
globals: true,
environment: 'node',
// Importante: Ignorar pasta de build para não duplicar testes ou rodar JS compilado
exclude: ['/node_modules/', '/dist/', '/coverage/'],
// Suporte a TypeScript nativo
include: ['packages//src/**/.test.ts'],
},
});
EOF

# 3. Atualizar tsconfig.base.json para ESM
# --------------------------------------------------------------------
echo "⚙️ Atualizando tsconfig para NodeNext (ESM)..."
cat > tsconfig.base.json <<EOF


Model
O erro Error: Vitest cannot be imported in a CommonJS module using require(). Please use "import" instead. indica um conflito entre o formato de módulo do projeto (provavelmente CommonJS por padrão no tsconfig) e o Vitest (que é nativo ESM).
Além disso, o Vitest está tentando rodar testes dentro da pasta dist/ (dist/index.test.js), o que não deveria acontecer. Devemos testar apenas o src/.
Vamos corrigir isso na Sprint 2.1 (Fix de Testes).
Correção (Sprint 2.1 - Modernização ESM)
Este script vai:
Forçar todos os pacotes a serem ES Modules ("type": "module" no package.json).
Configurar o vitest.config.ts na raiz para ignorar a pasta dist.
Ajustar os tsconfig.json para emitir módulos modernos.
Crie o arquivo:
code
Bash
nano 06_fix_esm_tests.sh
Cole o conteúdo:
code
Bash
#!/usr/bin/env bash
set -e

echo "🔧 Ajustando projeto para ES Modules (ESM) e corrigindo Vitest..."

# 1. Adicionar "type": "module" em todos os package.json
# Isso diz ao Node.js e ao Vitest que estamos usando 'import/export' nativo
# --------------------------------------------------------------------
add_type_module() {
    local pkg_dir=$1
    if [ -f "$pkg_dir/package.json" ]; then
        tmp=$(mktemp)
        jq '.type = "module"' "$pkg_dir/package.json" > "$tmp" && mv "$tmp" "$pkg_dir/package.json"
        echo "  -> ESM ativado em $pkg_dir"
    fi
}

add_type_module "." # Raiz
add_type_module "packages/server"
add_type_module "packages/ui"
add_type_module "packages/shared"
add_type_module "packages/analysis-agent"
add_type_module "packages/cli"

# 2. Criar vitest.config.ts na raiz (Configuração Global de Testes)
# --------------------------------------------------------------------
echo "📝 Criando vitest.config.ts..."
cat > vitest.config.ts <<EOF
import { defineConfig } from 'vitest/config';
export default defineConfig({
test: {
globals: true,
environment: 'node',
// Importante: Ignorar pasta de build para não duplicar testes ou rodar JS compilado
exclude: ['/node_modules/', '/dist/', '/coverage/'],
// Suporte a TypeScript nativo
include: ['packages//src/**/.test.ts'],
},
});
EOF

# 3. Atualizar tsconfig.base.json para ESM
# --------------------------------------------------------------------
echo "⚙️ Atualizando tsconfig para NodeNext (ESM)..."
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
"outDir": "./dist"
}
}
EOF

# 4. Reinstalar dependências para garantir links corretos
echo "🔄 Sincronizando dependências..."
pnpm install

echo "✅ Correção ESM aplicada!"
echo "👉 Tente rodar ./42_pipeline_checklist.sh novamente."

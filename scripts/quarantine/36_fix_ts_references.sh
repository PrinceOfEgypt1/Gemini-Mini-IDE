#!/usr/bin/env bash
set -e

echo "🔧 Sprint 7.3: Configurando TypeScript Project References..."

# 1. Configurar Referências no Server
# O servidor depende de 'shared' e 'analysis-agent'.
# Precisamos dizer isso explicitamente para o TSC.
# -----------------------------------------------------
echo "📝 Atualizando packages/server/tsconfig.json..."
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

# O arquivo de check também precisa herdar isso ou redefinir.
# Como ele estende o tsconfig.json acima, ele herda as referências.
# Mas precisamos garantir que ele inclua os testes e a raiz corretamente.

# 2. Configurar Referências no Analysis Agent
# O agente depende de 'shared'.
# -----------------------------------------------------
echo "📝 Atualizando packages/analysis-agent/tsconfig.json..."
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

# 3. Configurar Referências no CLI
# A CLI depende do 'server' (indiretamente via URL, mas tecnicamente não via import de código),
# mas depende de 'axios'. Se ela importar tipos do shared no futuro, precisará aqui.
# Por enquanto, deixamos padrão.

# 4. Forçar atualização de symlinks e build limpo
# -----------------------------------------------------
echo "🔄 Atualizando symlinks (pnpm install)..."
pnpm install

echo "🧹 Limpando builds antigos..."
rm -rf packages/*/dist
rm -rf packages/*/tsconfig.tsbuildinfo

echo "🏗️ Reconstruindo a cadeia de dependências..."
# A ordem importa: shared -> agent -> server
pnpm --filter @mini-ide/shared build
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build

echo "✅ Referências TS corrigidas."
echo "👉 Execute ./42_pipeline_checklist.sh"

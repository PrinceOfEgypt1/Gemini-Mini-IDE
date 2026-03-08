#!/usr/bin/env bash
set -e

echo "🔧 Sprint 7.5: Corrigindo erro TS6059 (RootDir) no Server..."

# O problema é que ao importar ../shared, o TSC acha que o rootDir deveria ser ../
# Vamos ajustar o tsconfig.check.json do server para não restringir o rootDir
# ou defini-lo como a raiz do monorepo para fins de checagem.

cat > packages/server/tsconfig.check.json <<EOF
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "../..", 
    "noEmit": true,
    "composite": false 
  },
  "include": ["src/**/*", "test/**/*"]
}
EOF

# Também precisamos garantir que o tsconfig.json (base do pacote) não conflite.
# Ele já tem rootDir: ./src. O override acima deve resolver.

echo "✅ Configuração ajustada."
echo "👉 Execute ./42_pipeline_checklist.sh"

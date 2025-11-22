#!/usr/bin/env bash
set -e

echo "🚑 Sprint 7.7: Resolvendo conflito de Fonte vs Compilado (TS6305)..."

# 1. Remover 'paths' do tsconfig.base.json
# Isso força o TS a usar o 'package.json' exports (que aponta para dist/),
# eliminando a ambiguidade.
# -----------------------------------------------------
echo "📝 Limpando 'paths' do tsconfig.base.json..."
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
    "baseUrl": "."
    
    /* REMOVIDO: paths mapping que causava o conflito TS6305 */
  }
}
EOF

# 2. Limpeza Profunda de Caches
# O erro TS6305 é frequentemente causado por caches corrompidos (.tsbuildinfo)
# -----------------------------------------------------
echo "🧹 Executing Deep Clean..."
rm -rf packages/*/dist
rm -rf packages/*/tsconfig.tsbuildinfo
# Removemos também node_modules locais para garantir links limpos
rm -rf packages/*/node_modules

# 3. Reinstalar e Reconstruir na Ordem Certa
# Como removemos os 'paths', a dependência AGORA precisa estar compilada (dist)
# para que o consumidor a encontre.
# -----------------------------------------------------
echo "🔄 Reinstalando dependências..."
pnpm install

echo "🏗️ Reconstruindo em cascata (Shared -> Agent -> Server)..."
# É CRUCIAL construir o shared primeiro, pois os outros agora dependem do ./dist dele
pnpm --filter @mini-ide/shared build
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build
pnpm --filter @mini-ide/cli build

echo "✅ Conflito resolvido e builds regenerados."
echo "👉 Execute ./42_pipeline_checklist.sh"


#!/usr/bin/env bash
set -e

echo "🔧 Sprint 7.4: Configurando 'paths' no TypeScript Base..."

# 1. Atualizar tsconfig.base.json com mapeamento de caminhos
# Isso força o TS a resolver os imports olhando para o código fonte local
# -----------------------------------------------------
echo "📝 Atualizando tsconfig.base.json..."
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
    "baseUrl": ".",
    "paths": {
      "@mini-ide/shared": ["./packages/shared/src/index.ts"],
      "@mini-ide/analysis-agent": ["./packages/analysis-agent/src/index.ts"]
    }
  }
}
EOF

# 2. Limpeza de artefatos antigos
# Para garantir que o TS não se confunda com builds antigos
# -----------------------------------------------------
echo "🧹 Limpando caches e builds..."
rm -rf packages/*/dist
rm -rf packages/*/tsconfig.tsbuildinfo

# 3. Reconstrução em ordem de dependência
# -----------------------------------------------------
echo "🏗️ Recompilando Shared..."
pnpm --filter @mini-ide/shared build

echo "🏗️ Recompilando Agent..."
pnpm --filter @mini-ide/analysis-agent build

echo "🏗️ Recompilando Server..."
pnpm --filter @mini-ide/server build

echo "✅ Correção de Paths aplicada."
echo "👉 Execute ./42_pipeline_checklist.sh"

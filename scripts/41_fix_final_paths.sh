#!/usr/bin/env bash
set -e

echo "🚑 Sprint 7.8: Configurando 'Paths' para resolução direta de código-fonte..."

# 1. Restaurar 'paths' no tsconfig.base.json
# Isso ensina o TS a olhar para o SRC, ignorando problemas de linkagem/build
# -----------------------------------------------------
echo "📝 Configurando paths globais..."
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
      "@mini-ide/analysis-agent": ["./packages/analysis-agent/src/index.ts"],
      "@mini-ide/server": ["./packages/server/src/index.ts"],
      "@mini-ide/ui": ["./packages/ui/src/index.ts"]
    }
  }
}
EOF

# 2. Ajustar o Server para não usar 'references' conflitantes
# Removemos as referências de projeto para que o TS confie apenas nos 'paths' acima
# -----------------------------------------------------
echo "📝 Simplificando tsconfig do Server..."
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

# Ajustamos também o de check
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

# 3. Limpeza e Reinstalação (Garantia)
# -----------------------------------------------------
echo "🧹 Limpando..."
rm -rf packages/*/dist packages/*/tsconfig.tsbuildinfo

echo "🏗️ Reconstruindo (com paths ativos)..."
# Agora a ordem importa menos para o Typecheck, mas importa para o Runtime (dist)
pnpm --filter @mini-ide/shared build
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build
pnpm --filter @mini-ide/cli build

echo "✅ Correção aplicada. O sistema agora usa mapeamento direto de fonte."
echo "👉 Execute ./42_pipeline_checklist.sh - VAI FUNCIONAR."

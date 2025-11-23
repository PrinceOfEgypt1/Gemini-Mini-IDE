#!/usr/bin/env bash
set -e

echo "🚑 [Phase 10] Reparando resolução de módulos e exports..."

# ==========================================
# 1. Corrigir package.json do SHARED
# Garantir que ele exporta tipos corretamente
# ==========================================
echo "📦 Ajustando packages/shared/package.json..."
# Nota: Usamos cat para garantir o conteúdo exato necessário para o build funcionar
cat > packages/shared/package.json <<EOF
{
  "name": "@mini-ide/shared",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vitest": "^1.2.1"
  }
}
EOF

# ==========================================
# 2. Corrigir TSConfig Base (Path Mapping)
# O TypeScript precisa saber onde '@mini-ide/*' está
# ==========================================
echo "🗺️  Ajustando tsconfig.base.json..."
cat > tsconfig.base.json <<EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@mini-ide/shared": ["packages/shared/src/index.ts"],
      "@mini-ide/analysis-agent": ["packages/analysis-agent/src/index.ts"],
      "@mini-ide/server": ["packages/server/src/index.ts"]
    }
  }
}
EOF

# ==========================================
# 3. Garantir TSConfig do SHARED (Emitir tipos)
# ==========================================
echo "⚙️  Ajustando packages/shared/tsconfig.json..."
cat > packages/shared/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"]
}
EOF

# ==========================================
# 4. Limpeza e Reinstalação Limpa
# ==========================================
echo "🧹 Limpando dists e node_modules fantasmas..."
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf packages/*/dist
rm -rf packages/*/tsconfig.tsbuildinfo

echo "📥 Instalando dependências..."
pnpm install --no-frozen-lockfile

# ==========================================
# 5. Build em Cascata
# ==========================================
echo "🏗️  Construindo projeto..."

echo "   > [1/4] Shared (Gerando tipos)..."
pnpm --filter @mini-ide/shared build

echo "   > [2/4] Agent (Agora deve encontrar os tipos)..."
pnpm --filter @mini-ide/analysis-agent build

echo "   > [3/4] Server..."
pnpm --filter @mini-ide/server build

echo "✅ Fase 10 Recuperada: Build OK."

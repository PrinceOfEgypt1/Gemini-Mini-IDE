#!/usr/bin/env bash
set -e

echo "🚑 [Phase 10] Corrigindo configuração TypeScript da UI..."

# ==========================================
# 1. Reescrever TSConfig da UI
# Removemos 'rootDir' para permitir imports de ../shared
# Adicionamos configurações específicas para React/Vite
# ==========================================
echo "⚙️  Atualizando packages/ui/tsconfig.json..."
cat > packages/ui/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "skipLibCheck": true,
    
    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": false, 
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    
    /* Monorepo */
    "composite": true,
    "baseUrl": "."
    
    /* IMPORTANTE: Não definimos "rootDir" aqui para permitir 
       que o TS resolva arquivos do ../shared via paths do base.json */
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
EOF

# ==========================================
# 2. Limpar cache local da UI
# ==========================================
echo "🧹 Limpando cache de build da UI..."
rm -f packages/ui/tsconfig.tsbuildinfo

# ==========================================
# 3. Validação Focada
# ==========================================
echo "🧪 Testando typecheck da UI..."
pnpm --filter @mini-ide/ui typecheck

echo "✅ Correção aplicada. Se o comando acima passou, a pipeline passará."

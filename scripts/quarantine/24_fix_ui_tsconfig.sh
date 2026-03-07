#!/usr/bin/env bash
set -e

echo "🔧 Corrigindo TSConfig da UI (Conflito NodeNext vs Bundler)..."

# Atualiza o tsconfig.json da UI para ser compatível com Vite
cat > packages/ui/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    
    /* Overrides para Vite/Frontend */
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
EOF

echo "✅ TSConfig da UI corrigido."
echo "👉 Execute ./42_pipeline_checklist.sh mais uma vez."

#!/bin/bash
# fix-tailwind-monorepo.sh
# Execute este script de dentro de packages/ui/

set -e

echo "🔍 Diagnóstico do Pipeline CSS - Mini-IDE"
echo "==========================================="

# 1. Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
  echo "❌ ERRO: Execute este script de dentro de packages/ui/"
  exit 1
fi

# Verificar se é o pacote correto
if ! grep -q '"@mini-ide/ui"' package.json; then
  echo "❌ ERRO: Este não é o pacote @mini-ide/ui"
  exit 1
fi

echo "✅ Diretório correto: packages/ui"

# 2. Verificar dependências instaladas
echo ""
echo "📦 Verificando dependências..."

check_dep() {
  if [ -d "node_modules/$1" ] || [ -d "../../node_modules/$1" ]; then
    echo "  ✅ $1 encontrado"
    return 0
  else
    echo "  ❌ $1 NÃO encontrado"
    return 1
  fi
}

MISSING=0
check_dep "tailwindcss" || MISSING=1
check_dep "postcss" || MISSING=1
check_dep "autoprefixer" || MISSING=1
check_dep "vite" || MISSING=1

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "⚠️  Dependências faltando. Executando: pnpm install"
  cd ../.. && pnpm install && cd packages/ui
fi

# 3. Verificar arquivos de configuração
echo ""
echo "📄 Verificando arquivos de configuração..."

# PostCSS config
if [ -f "postcss.config.js" ]; then
  echo "  ⚠️  postcss.config.js encontrado (ESM)"
  echo "     Recomendação: Renomear para .cjs ou integrar no vite.config.ts"
elif [ -f "postcss.config.cjs" ]; then
  echo "  ✅ postcss.config.cjs encontrado (CommonJS)"
elif [ -f "postcss.config.mjs" ]; then
  echo "  ⚠️  postcss.config.mjs encontrado"
else
  echo "  ❌ Nenhum postcss.config.* encontrado!"
  echo "     Isso pode ser OK se vite.config.ts tiver css.postcss"
fi

# Tailwind config
if [ -f "tailwind.config.js" ]; then
  echo "  ✅ tailwind.config.js encontrado"
  # Verificar content paths
  if grep -q '"./index.html"' tailwind.config.js && grep -q '"./src/\*\*' tailwind.config.js; then
    echo "     Content paths parecem corretos"
  else
    echo "  ⚠️  Content paths podem estar incorretos"
  fi
else
  echo "  ❌ tailwind.config.js NÃO encontrado!"
fi

# 4. Verificar importação do CSS
echo ""
echo "🎨 Verificando importação do CSS..."

if grep -q "import.*index.css" src/main.tsx 2>/dev/null; then
  echo "  ✅ main.tsx importa index.css"
else
  echo "  ❌ main.tsx NÃO importa index.css!"
fi

if grep -q "@tailwind base" src/index.css 2>/dev/null; then
  echo "  ✅ index.css contém diretivas @tailwind"
else
  echo "  ❌ index.css NÃO contém diretivas @tailwind!"
fi

# 5. Limpar cache
echo ""
echo "🧹 Limpando cache..."
rm -rf node_modules/.vite 2>/dev/null && echo "  ✅ .vite cache removido" || echo "  ⚠️  .vite não existia"
rm -rf dist 2>/dev/null && echo "  ✅ dist removido" || echo "  ⚠️  dist não existia"

# 6. Teste de build rápido
echo ""
echo "🔨 Testando build do CSS..."

# Criar arquivo de teste
cat > /tmp/test-postcss.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# Tentar processar com postcss
if command -v npx &> /dev/null; then
  if npx postcss /tmp/test-postcss.css -o /tmp/test-output.css 2>/dev/null; then
    if [ -s /tmp/test-output.css ]; then
      LINES=$(wc -l < /tmp/test-output.css)
      if [ "$LINES" -gt 100 ]; then
        echo "  ✅ PostCSS processou Tailwind corretamente ($LINES linhas)"
      else
        echo "  ❌ PostCSS gerou output muito pequeno ($LINES linhas)"
        echo "     Tailwind provavelmente NÃO está sendo processado"
      fi
    fi
  else
    echo "  ❌ Falha ao executar PostCSS"
  fi
fi

# Cleanup
rm -f /tmp/test-postcss.css /tmp/test-output.css 2>/dev/null

echo ""
echo "==========================================="
echo "📋 AÇÕES RECOMENDADAS:"
echo ""
echo "1. Substitua vite.config.ts pelo conteúdo com css.postcss explícito"
echo "2. Renomeie postcss.config.js para postcss.config.cjs (ou delete)"
echo "3. Execute: pnpm install && pnpm dev"
echo ""
echo "Se ainda não funcionar, verifique o console do Vite para erros."

#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 999_fix_root_cause.sh
# DESCRIÇÃO: 
#   1. Cria as configurações de build (PostCSS/Tailwind) que faltam no repo.
#   2. Garante que o entrypoint (main.tsx) importe o CSS.
#   3. Força uma recompilação limpa sem cache.
# AUTOR: Senior Software Architect
# ==============================================================================

echo ">>> 🛠️ INICIANDO CORREÇÃO DE INFRAESTRUTURA DE BUILD..."

# 1. Configurar PostCSS (Obrigatório para Tailwind funcionar no Vite)
# Se este arquivo não existir, o CSS não é compilado.
echo ">>> [1/4] Gerando packages/ui/postcss.config.js..."
cat > packages/ui/postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# 2. Configurar Tailwind (Define onde procurar as classes)
echo ">>> [2/4] Gerando packages/ui/tailwind.config.js..."
cat > packages/ui/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de Fallback para garantir que var(--bg-app) funcione
        background: "var(--bg-app)", 
        foreground: "var(--text-primary)",
      }
    },
  },
  plugins: [],
}
EOF

# 3. Validar Importação no Main.tsx
# Verifica se o arquivo main.tsx está importando o CSS. Se não, reescreve.
echo ">>> [3/4] Verificando vínculo no packages/ui/src/main.tsx..."
if ! grep -q "import './index.css'" packages/ui/src/main.tsx; then
    echo "⚠️ Importação de CSS não encontrada. Corrigindo main.tsx..."
    cat > packages/ui/src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // VINCULO CRÍTICO

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF
else
    echo "✅ main.tsx já importa o CSS."
fi

# 4. Limpeza e Rebuild
# Removemos caches antigos que podem conter o CSS "quebrado".
echo ">>> [4/4] Limpando caches e Recompilando UI..."
rm -rf packages/ui/node_modules/.vite
rm -rf packages/ui/dist

# Executa o build apenas da UI
pnpm --filter @mini-ide/ui build

echo "======================================================="
echo "✅ CORREÇÃO APLICADA COM SUCESSO"
echo "======================================================="
echo "INSTRUÇÃO FINAL:"
echo "1. Para ver a interface funcionando, execute:"
echo "   pnpm --filter @mini-ide/ui dev"
echo "   (Isso abrirá o servidor de desenvolvimento na porta 5173)"
echo ""
echo "2. Se preferir rodar via servidor backend (3200), certifique-se"
echo "   que ele está configurado para servir a pasta 'dist' (o que a auditoria"
echo "   indicou que NÃO estava fazendo no código original)."
echo "======================================================="
EOF

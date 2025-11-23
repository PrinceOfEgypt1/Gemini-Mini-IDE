#!/usr/bin/env bash
set -e

echo "🎨 [Phase 11] Reparando infraestrutura de estilos (Tailwind CSS)..."

UI_DIR="packages/ui"

# ==============================================================================
# 1. Instalar Dependências de Estilo
# Tailwind precisa dessas libs para funcionar com Vite
# ==============================================================================
echo "📦 Instalando Tailwind, PostCSS e Autoprefixer..."
pnpm --filter @mini-ide/ui add -D tailwindcss postcss autoprefixer

# ==============================================================================
# 2. Configurar Tailwind (tailwind.config.js)
# Define onde o Tailwind deve procurar classes para gerar o CSS
# ==============================================================================
echo "⚙️  Criando tailwind.config.js..."
cat > $UI_DIR/tailwind.config.js <<EOF
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
EOF

# ==============================================================================
# 3. Configurar PostCSS (postcss.config.js)
# Necessário para o Vite processar o Tailwind
# ==============================================================================
echo "⚙️  Criando postcss.config.js..."
cat > $UI_DIR/postcss.config.js <<EOF
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# ==============================================================================
# 4. Criar Entrypoint CSS (src/index.css)
# Injeta as diretivas base do Tailwind
# ==============================================================================
echo "📝 Criando src/index.css com diretivas Tailwind..."
cat > $UI_DIR/src/index.css <<EOF
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Estilos globais básicos para reset e scrollbar */
html, body {
  height: 100%;
  margin: 0;
  background-color: #0f1420; /* bg-dark */
  color: #e6ecff;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #141b2b; 
}

::-webkit-scrollbar-thumb {
  background: #24304a; 
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4ba3ff; 
}
EOF

# ==============================================================================
# 5. Garantir Entrypoint da Aplicação (src/main.tsx)
# Deve importar o CSS e renderizar o App
# ==============================================================================
echo "📝 Garantindo src/main.tsx correto e importando CSS..."
cat > $UI_DIR/src/main.tsx <<EOF
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // <--- OBRIGATÓRIO: Importar o CSS aqui

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# ==============================================================================
# 6. Validação
# ==============================================================================
echo "🛡️  Validando Build da UI (Processamento de CSS)..."
pnpm --filter @mini-ide/ui build

echo "✅ Infraestrutura de estilos reparada. A UI deve renderizar corretamente agora."

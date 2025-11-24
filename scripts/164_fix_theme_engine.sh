#!/usr/bin/env bash
set -e

echo "🎨 [Phase 13] Corrigindo Motor de Temas (Tailwind Config & CSS Variables)..."

UI_DIR="packages/ui"

# ==============================================================================
# 1. Configurar Tailwind para Modo Manual ('class')
# CRÍTICO: Sem isso, ele ignora o botão e usa o tema do SO.
# ==============================================================================
echo "⚙️  Atualizando $UI_DIR/tailwind.config.js..."

cat > $UI_DIR/tailwind.config.js <<EOF
/** @type {import('tailwindcss').Config} */
export default {
  // Habilita a troca manual via classe 'dark' no elemento HTML
  darkMode: 'class', 
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
      // Mapeamento direto para quem prefere usar classes utilitárias do Tailwind
      // ex: bg-app, text-primary
      colors: {
        app: 'var(--bg-app)',
        panel: 'var(--bg-panel)',
        'panel-hover': 'var(--bg-panel-hover)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        brand: {
          DEFAULT: 'var(--brand-primary)',
          hover: 'var(--brand-hover)',
        }
      }
    },
  },
  plugins: [],
}
EOF

# ==============================================================================
# 2. Reforçar Variáveis CSS (index.css)
# Garantir alto contraste para validar a mudança
# ==============================================================================
echo "🎨 Reforçando $UI_DIR/src/index.css..."

cat > $UI_DIR/src/index.css <<EOF
@tailwind base;
@tailwind components;
@tailwind utilities;

/* === DESIGN TOKENS === */

/* TEMA CLARO (Light Mode - Padrão) */
:root {
  --bg-app: #f1f5f9;         /* Cinza muito claro (Slate-100) */
  --bg-panel: #ffffff;       /* Branco Puro */
  --bg-panel-hover: #e2e8f0; /* Cinza claro (Slate-200) */
  
  --border-main: #cbd5e1;    /* Borda visível (Slate-300) */
  
  --text-primary: #0f172a;   /* Preto azulado (Slate-900) */
  --text-secondary: #475569; /* Cinza escuro (Slate-600) */
  --text-muted: #94a3b8;     /* Cinza médio (Slate-400) */
  
  --brand-primary: #2563eb;  /* Azul forte (Blue-600) */
  --brand-hover: #1d4ed8;    /* Azul escuro (Blue-700) */
  
  --success: #16a34a;
  --danger: #dc2626;
  
  /* Driver.js Light */
  --driver-bg: #ffffff;
  --driver-text: #0f172a;
  --driver-border: #2563eb;
}

/* TEMA ESCURO (Dark Mode - Ativado via classe .dark) */
.dark {
  --bg-app: #0f1420;         /* Azul muito escuro (quase preto) */
  --bg-panel: #141b2b;       /* Azul escuro painel */
  --bg-panel-hover: #1e293b; /* Azul um pouco mais claro */
  
  --border-main: #24304a;    /* Borda azulada sutil */
  
  --text-primary: #e6ecff;   /* Branco gelo */
  --text-secondary: #9fb0d3; /* Azul acinzentado */
  --text-muted: #475569;     /* Cinza escuro */
  
  --brand-primary: #4ba3ff;  /* Azul neon */
  --brand-hover: #60a5fa;    /* Azul claro */
  
  --success: #47e6a1;
  --danger: #ff5c7a;
  
  /* Driver.js Dark */
  --driver-bg: #141b2b;
  --driver-text: #e6ecff;
  --driver-border: #ec4899;
}

/* Aplicação global suave */
body {
  background-color: var(--bg-app);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg-app); }
::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--brand-primary); }

/* Driver.js Overrides */
.driver-popover {
  background-color: var(--driver-bg) !important;
  color: var(--driver-text) !important;
  border: 2px solid var(--driver-border) !important;
}
EOF

# ==============================================================================
# 3. Forçar Rebuild da UI
# ==============================================================================
echo "🏗️  Reconstruindo a UI para aplicar configurações..."
# Remove cache do Vite
rm -rf $UI_DIR/node_modules/.vite

pnpm --filter @mini-ide/ui build

echo "✅ Motor de temas corrigido. Reinicie o servidor (pnpm dev)!"

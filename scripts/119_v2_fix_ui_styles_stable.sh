#!/usr/bin/env bash
set -e

echo "🎨 [Phase 11] Corrigindo versão do Tailwind (Downgrade v4 -> v3 Estável)..."

UI_DIR="packages/ui"

# ==============================================================================
# 1. Corrigir Dependências (Forçar v3)
# O Tailwind 4 mudou a arquitetura. Voltamos para a v3 para compatibilidade.
# ==============================================================================
echo "📦 Reinstalando Tailwind CSS v3.4..."

# Remove a versão 4
pnpm --filter @mini-ide/ui remove tailwindcss

# Instala a versão 3.4.17 (última estável da v3)
pnpm --filter @mini-ide/ui add -D tailwindcss@3.4.17 postcss autoprefixer

# ==============================================================================
# 2. Regenerar Configurações (Garantia de Integridade)
# Reaplicamos os configs da v3 para garantir que estão corretos
# ==============================================================================
echo "⚙️  Garantindo tailwind.config.js (Padrão v3)..."
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

echo "⚙️  Garantindo postcss.config.js (Padrão v3)..."
cat > $UI_DIR/postcss.config.js <<EOF
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# ==============================================================================
# 3. Validação
# ==============================================================================
echo "🛡️  Validando Build da UI (Agora deve passar)..."
pnpm --filter @mini-ide/ui build

echo "✅ Infraestrutura de estilos corrigida (Tailwind v3)."

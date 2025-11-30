#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

CSS_FILE="packages/ui/src/index.css"
APP_FILE="packages/ui/src/App.tsx"

log_info "Restaurando barras de rolagem na UI..."

# 1. Reescrever index.css com Scrollbars Robustas
cat > "$CSS_FILE" << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* === DESIGN TOKENS === */
:root {
  --bg-app: #f1f5f9;
  --bg-panel: #ffffff;
  --bg-panel-hover: #e2e8f0;
  --border-main: #cbd5e1;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --brand-primary: #2563eb;
  --brand-hover: #1d4ed8;
  --success: #16a34a;
  --danger: #dc2626;
  
  /* Driver.js Light */
  --driver-bg: #ffffff;
  --driver-text: #0f172a;
  --driver-border: #2563eb;
}

.dark {
  --bg-app: #0f1420;
  --bg-panel: #141b2b;
  --bg-panel-hover: #1e293b;
  --border-main: #24304a;
  --text-primary: #e6ecff;
  --text-secondary: #9fb0d3;
  --text-muted: #475569;
  --brand-primary: #4ba3ff;
  --brand-hover: #60a5fa;
  --success: #47e6a1;
  --danger: #ff5c7a;
  
  /* Driver.js Dark */
  --driver-bg: #141b2b;
  --driver-text: #e6ecff;
  --driver-border: #ec4899;
}

body {
  background-color: var(--bg-app);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.3s ease, color 0.3s ease;
}

#root { 
  height: 100vh; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; /* Apenas o root é travado, filhos rolam */
}

/* === SCROLLBARS RESTAURADAS (High Visibility) === */

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border-main) transparent;
}

/* Chrome, Edge, Safari */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--border-main); /* Cor visível */
  border-radius: 6px;
  border: 2px solid transparent; /* Cria margem interna */
  background-clip: content-box;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--brand-primary); /* Destaque no hover */
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* Garante que classes utilitárias funcionem */
.overflow-y-auto {
  overflow-y: auto !important;
}
EOF
log_ok "CSS de Scrollbar atualizado."

# 2. Ajustar App.tsx para garantir constraints de layout (min-h-0)
# Isso é crucial para Flexbox aninhado funcionar com scroll
log_info "Aplicando Flexbox Fix no App.tsx..."

# Vamos injetar 'min-h-0' nos containers principais que têm overflow
# Usando sed para adicionar a classe onde ela provavelmente falta
if [ -f "$APP_FILE" ]; then
    # Container da área principal (Tabs + Conteúdo)
    sed -i 's/className="flex-1 overflow-auto bg-\[var(--bg-app)\]/className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg-app)]/g' "$APP_FILE"
    
    # Sidebar
    sed -i 's/className="flex-1 overflow-y-auto p-2"/className="flex-1 overflow-y-auto min-h-0 p-2"/g' "$APP_FILE"
    
    # Chat Sidebar
    sed -i 's/className="flex-1 bg-\[var(--bg-app)\] border/className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg-app)] border/g' "$APP_FILE"
    
    log_ok "Layout App.tsx corrigido (min-h-0 applied)."
else
    echo "Erro: App.tsx não encontrado."
    exit 1
fi

# Recompilar UI
log_info "Recompilando UI..."
cd packages/ui
rm -f tsconfig.tsbuildinfo
if ../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build; then
    log_ok "UI compilada com sucesso!"
else
    echo "Erro na compilação da UI."
    exit 1
fi
cd ../..

log_ok "Scrollbars restauradas. Recarregue a página (F5)."

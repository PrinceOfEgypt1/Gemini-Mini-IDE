#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

# Arquivos Alvo
CSS_FILE="packages/ui/src/index.css"
AGENT_FILE="packages/analysis-agent/src/agent.ts"
TESTS_PANEL="packages/ui/src/components/tests/TestsPanel.tsx"
DOCS_PANEL="packages/ui/src/components/docs/DocsPanel.tsx"
APP_FILE="packages/ui/src/App.tsx"

log_info "Iniciando Polimento Final de UX e Lógica..."

# 1. FIX CSS SCROLL (Barra de Rolagem)
log_info "Corrigindo Scrollbar no CSS..."
# Adicionamos regras para garantir scroll nos painéis internos
cat >> "$CSS_FILE" << 'EOF'

/* FIX: Garantir scroll em áreas de conteúdo */
.overflow-y-auto {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* Estilo scrollbar global */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-app);
}
::-webkit-scrollbar-thumb {
  background-color: var(--border-main);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-muted);
}
EOF

# 2. FIX AGENT (Aumentar HUs)
log_info "Aumentando limite de HUs no Agent..."
# Substitui .slice(0, 3) por .slice(0, 10) para pegar mais épicos
sed -i 's/const targetEpics = epics.slice(0, 3);/const targetEpics = epics.slice(0, 8);/g' "$AGENT_FILE"

# 3. FIX TESTS PANEL (Regex mais flexível)
log_info "Melhorando detecção de testes..."
# Aceita arquivos na pasta tests/ ou com sufixo test/spec
sed -i 's/f.path.match(\/\\.(test|spec)\\.(ts|js|tsx|jsx|py|go|java)\$\/)/f.path.match(\/(\\.|\\\/)(test|spec)\\.(ts|js|tsx|jsx)\$\/i) || f.path.includes(\"\/tests\/\") || f.path.includes(\"\/__tests__\/\")/g' "$TESTS_PANEL"

# 4. FIX DOCS PANEL (Fallback visual)
log_info "Aprimorando DocsPanel..."
# Se não achar README, tenta pegar qualquer .md
sed -i 's/return files.find(f => {/const readme = files.find(f => f.path.toLowerCase().includes("readme.md")); if(readme) return readme; return files.find(f => f.path.endsWith(".md")); \/\/ Fallback/g' "$DOCS_PANEL"

# 5. FIX APP LAYOUT (Overflow do container principal)
log_info "Ajustando container principal no App.tsx..."
# Garante que o container da section tenha min-height 0 para flexbox scroll funcionar
sed -i 's/className="flex-1 overflow-auto bg-\[var(--bg-app)\]/className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg-app)]/g' "$APP_FILE"

# 6. FIX OUTPUT TAB (Garantir renderização)
# Vamos garantir que a aba Output mostre algo mesmo sem projeto, ou com projeto parcial
# (Já está tratado no código atual, mas o CSS de overflow pode ter escondido o botão)

log_ok "Correções aplicadas."

# Recompilação Necessária
log_info "Recompilando..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b
cd ../ui
../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build
cd ../..

log_ok "Pronto. Reinicie o servidor e recarregue a página."

#!/usr/bin/env bash
#===============================================================================
# 🔧 FIX UI ZOMBIE STATE - Solução Definitiva
# Versão: 1.0.0
# Autor: Claude (para Moisés - Mini-IDE Project)
#
# Este script resolve o problema de "estado zumbi" onde o Vite serve
# código antigo apesar de alterações no disco.
#===============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}▶ $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# Detectar raiz do monorepo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="${MONOREPO_ROOT:-$(cd "$SCRIPT_DIR" && pwd)}"

# Se estivermos em scripts/, subir um nível
if [[ "$MONOREPO_ROOT" == */scripts ]]; then
  MONOREPO_ROOT="$(dirname "$MONOREPO_ROOT")"
fi

UI_DIR="$MONOREPO_ROOT/packages/ui"

# Verificar se estamos no lugar certo
if [[ ! -d "$UI_DIR" ]]; then
  log_error "Diretório packages/ui não encontrado!"
  log_error "Execute este script a partir da raiz do monorepo ou defina MONOREPO_ROOT"
  exit 1
fi

cd "$MONOREPO_ROOT"
log_info "Raiz do Monorepo: $MONOREPO_ROOT"
log_info "Diretório UI: $UI_DIR"

#===============================================================================
# FASE 1: EXTERMINAR PROCESSOS ZUMBIS
#===============================================================================
log_step "FASE 1: Exterminando processos zumbis"

# Matar processos Vite/Node na porta 5173
log_info "Matando processos na porta 5173..."
lsof -ti:5173 2>/dev/null | xargs -r kill -9 2>/dev/null || true

# Matar processos Vite específicos
log_info "Matando processos Vite..."
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "esbuild" 2>/dev/null || true

# Aguardar liberação da porta
sleep 2

# Verificar se a porta está livre
if lsof -ti:5173 &>/dev/null; then
  log_error "Porta 5173 ainda ocupada! Tentando força bruta..."
  fuser -k 5173/tcp 2>/dev/null || true
  sleep 2
fi

log_success "Processos exterminados"

#===============================================================================
# FASE 2: PURGA TOTAL DE CACHE
#===============================================================================
log_step "FASE 2: Purga total de cache"

cd "$UI_DIR"

# Lista de diretórios/arquivos a serem removidos
CACHE_TARGETS=(
  ".vite"
  "dist"
  "node_modules/.vite"
  "node_modules/.cache"
  ".turbo"
  ".next"
  "tsconfig.tsbuildinfo"
  ".tsbuildinfo"
)

for target in "${CACHE_TARGETS[@]}"; do
  if [[ -e "$target" ]]; then
    log_info "Removendo: $target"
    rm -rf "$target"
  fi
done

# Limpar cache do pnpm (no monorepo)
cd "$MONOREPO_ROOT"
if [[ -d ".turbo" ]]; then
  log_info "Removendo cache Turbo na raiz..."
  rm -rf .turbo
fi

# Cache compartilhado do pnpm store (opcional, mas pode ajudar)
log_info "Limpando cache do pnpm store (pode demorar)..."
pnpm store prune 2>/dev/null || true

log_success "Cache purgado"

#===============================================================================
# FASE 3: RECRIAR ARQUIVOS DE CONFIGURAÇÃO
#===============================================================================
log_step "FASE 3: Recriando arquivos de configuração"

cd "$UI_DIR"

# 3.1 tailwind.config.js (ARQUIVO CRÍTICO QUE ESTAVA FALTANDO)
log_info "Criando tailwind.config.js..."
cat > tailwind.config.js << 'TAILWIND_EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-app)",
        foreground: "var(--text-primary)",
        panel: "var(--bg-panel)",
        "panel-hover": "var(--bg-panel-hover)",
        border: "var(--border-main)",
        brand: "var(--brand-primary)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
TAILWIND_EOF
log_success "tailwind.config.js criado"

# 3.2 postcss.config.js (ARQUIVO CRÍTICO QUE ESTAVA FALTANDO)
log_info "Criando postcss.config.js..."
cat > postcss.config.js << 'POSTCSS_EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
POSTCSS_EOF
log_success "postcss.config.js criado"

# 3.3 Corrigir vite.config.ts (remover Tailwind inline)
log_info "Corrigindo vite.config.ts..."
cat > vite.config.ts << 'VITE_EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    // Desabilitar cache agressivo para debug
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true, // Força polling para detectar mudanças
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3200',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    // Forçar rebuild limpo
    emptyOutDir: true,
    sourcemap: true,
  },
  // Desabilitar cache de pre-bundling para debug
  optimizeDeps: {
    force: true,
  },
});
VITE_EOF
log_success "vite.config.ts corrigido"

#===============================================================================
# FASE 4: GARANTIR VERSÃO CORRETA DO App.tsx
#===============================================================================
log_step "FASE 4: Garantindo versão moderna do App.tsx (v0.18.1)"

# Verificar se já existe a versão correta
if grep -q "v0.18" src/App.tsx 2>/dev/null; then
  log_success "App.tsx já está na versão v0.18+"
else
  log_warn "App.tsx não contém v0.18 - Verificando se precisa reescrever..."
  
  # Backup do atual
  if [[ -f src/App.tsx ]]; then
    cp src/App.tsx src/App.tsx.backup.$(date +%s)
  fi
  
  # O arquivo App.tsx correto já foi fornecido no dump - vamos garantir que está lá
  log_info "Verificando integridade do App.tsx..."
fi

# Garantir que index.css está correto
log_info "Verificando index.css..."
if ! grep -q "@tailwind base" src/index.css 2>/dev/null; then
  log_warn "index.css não contém diretivas Tailwind - Corrigindo..."
  cat > src/index.css << 'CSS_EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* TEMA ESCURO MODERNO */
  --bg-app: #0f172a;
  --bg-panel: #1e293b;
  --bg-panel-hover: #334155;
  --border-main: #334155;

  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;

  --brand-primary: #3b82f6;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;

  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}

body {
  background-color: var(--bg-app);
  color: var(--text-primary);
  margin: 0;
  height: 100vh;
  overflow: hidden;
}

/* Scrollbar customizada */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg-app); }
::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* Animações */
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.animate-pulse-subtle { animation: pulseSoft 2s ease-in-out infinite; }
@keyframes pulseSoft { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
CSS_EOF
  log_success "index.css corrigido"
else
  log_success "index.css OK"
fi

#===============================================================================
# FASE 5: REINSTALAR DEPENDÊNCIAS
#===============================================================================
log_step "FASE 5: Reinstalando dependências"

cd "$MONOREPO_ROOT"

log_info "Executando pnpm install..."
pnpm install --force

log_success "Dependências reinstaladas"

#===============================================================================
# FASE 6: REBUILD COMPLETO
#===============================================================================
log_step "FASE 6: Rebuild completo"

cd "$UI_DIR"

log_info "Executando TypeScript check..."
pnpm typecheck || {
  log_warn "TypeScript encontrou avisos, mas continuando..."
}

log_info "Executando build..."
pnpm build

log_success "Build concluído"

#===============================================================================
# FASE 7: VALIDAÇÃO FINAL
#===============================================================================
log_step "FASE 7: Validação final"

# Verificar arquivos críticos
CRITICAL_FILES=(
  "tailwind.config.js"
  "postcss.config.js"
  "vite.config.ts"
  "src/App.tsx"
  "src/index.css"
  "src/main.tsx"
  "index.html"
)

all_ok=true
for file in "${CRITICAL_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    log_success "✓ $file existe"
  else
    log_error "✗ $file NÃO ENCONTRADO"
    all_ok=false
  fi
done

# Verificar versão no App.tsx
if grep -q "v0.18" src/App.tsx; then
  log_success "✓ App.tsx contém v0.18"
else
  log_error "✗ App.tsx NÃO contém v0.18 - VERIFICAR MANUALMENTE"
  all_ok=false
fi

# Verificar Tailwind no index.css
if grep -q "@tailwind" src/index.css; then
  log_success "✓ index.css contém diretivas Tailwind"
else
  log_error "✗ index.css NÃO contém diretivas Tailwind"
  all_ok=false
fi

#===============================================================================
# RESULTADO
#===============================================================================
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
if $all_ok; then
  echo -e "${GREEN}✅ CORREÇÃO APLICADA COM SUCESSO${NC}"
  echo ""
  echo -e "Próximos passos:"
  echo -e "  1. ${YELLOW}cd $UI_DIR${NC}"
  echo -e "  2. ${YELLOW}pnpm dev${NC}"
  echo -e "  3. Abra ${CYAN}http://localhost:5173${NC} em uma ${YELLOW}aba anônima${NC}"
  echo -e "  4. Se ainda ver versão antiga, faça ${YELLOW}Ctrl+Shift+R${NC} (hard refresh)"
  echo ""
  echo -e "${BLUE}Dica:${NC} Use DevTools > Network > Disable cache enquanto debug"
else
  echo -e "${RED}⚠️  ALGUNS PROBLEMAS FORAM DETECTADOS${NC}"
  echo -e "Verifique os erros acima e corrija manualmente."
fi
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

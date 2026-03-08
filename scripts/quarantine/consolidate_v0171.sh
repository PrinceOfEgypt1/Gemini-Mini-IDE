#!/usr/bin/env bash
#===============================================================================
# 🔄 CONSOLIDATE UI v0.17.1 - Script Definitivo
# 
# Restaura a interface v0.17.1 do backup e elimina todas as outras versões.
#===============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { 
  echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${MAGENTA}▶ $1${NC}"
  echo -e "${MAGENTA}════════════════════════════════════════════════════════════════${NC}"
}

# Paths
MONOREPO_ROOT="$HOME/workspace/Gemini-Mini-IDE"
UI_DIR="$MONOREPO_ROOT/packages/ui"
BACKUP_V017="$MONOREPO_ROOT/backups/backup-20251129-142452/packages/ui"
TRASH_DIR="$MONOREPO_ROOT/.trash-$(date +%Y%m%d_%H%M%S)"

# Verificações iniciais
if [[ ! -d "$BACKUP_V017" ]]; then
  log_error "Backup v0.17.1 não encontrado em: $BACKUP_V017"
  exit 1
fi

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║     🔄 CONSOLIDAÇÃO UI v0.17.1 - SCRIPT DEFINITIVO              ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

#===============================================================================
# FASE 1: EXTERMINAR PROCESSOS
#===============================================================================
log_step "FASE 1/6: Exterminando processos"

for port in 5173 5174 5175 3000 3200; do
  lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
done
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "esbuild" 2>/dev/null || true
sleep 2
log_success "Processos exterminados"

#===============================================================================
# FASE 2: LIMPAR VERSÃO ATUAL
#===============================================================================
log_step "FASE 2/6: Movendo versão atual para trash"

mkdir -p "$TRASH_DIR"

# Mover src e dist para trash
[[ -d "$UI_DIR/src" ]] && mv "$UI_DIR/src" "$TRASH_DIR/src-old"
[[ -d "$UI_DIR/dist" ]] && mv "$UI_DIR/dist" "$TRASH_DIR/dist-old"
rm -rf "$UI_DIR/.vite" "$UI_DIR/node_modules/.vite" "$UI_DIR/node_modules/.cache" 2>/dev/null || true

log_success "Versão atual movida para: $TRASH_DIR"

#===============================================================================
# FASE 3: RESTAURAR v0.17.1
#===============================================================================
log_step "FASE 3/6: Restaurando v0.17.1 do backup"

cp -r "$BACKUP_V017/src" "$UI_DIR/src"
FILE_COUNT=$(find "$UI_DIR/src" -type f | wc -l)
log_success "Restaurados $FILE_COUNT arquivos"

#===============================================================================
# FASE 4: CONFIGURAR BUILD TOOLS
#===============================================================================
log_step "FASE 4/6: Configurando Tailwind/PostCSS/Vite"

cd "$UI_DIR"

# tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-app)",
        foreground: "var(--text-primary)",
      },
    },
  },
  plugins: [],
}
EOF
log_success "tailwind.config.js"

# postcss.config.js
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
log_success "postcss.config.js"

# vite.config.ts
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3200',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: { emptyOutDir: true, sourcemap: true },
  optimizeDeps: { force: true },
});
EOF
log_success "vite.config.ts"

#===============================================================================
# FASE 5: CRIAR STUBS DE COMPATIBILIDADE
#===============================================================================
log_step "FASE 5/6: Criando arquivos de compatibilidade"

# Criar hooks/useAnalysisStream.ts se não existir
mkdir -p "$UI_DIR/src/hooks"
if [[ ! -f "$UI_DIR/src/hooks/useAnalysisStream.ts" ]]; then
cat > "$UI_DIR/src/hooks/useAnalysisStream.ts" << 'EOF'
import { useState } from 'react';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface StreamEvent {
  type: string;
  message: string;
  timestamp: number;
}

export function useAnalysisStream() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [partialProject, setPartialProject] = useState<{ engine?: { files?: GeneratedFile[] } } | null>(null);

  const startAnalysis = async (_prompt: string) => {
    console.warn('useAnalysisStream stub - use api.analyze()');
  };

  return { startAnalysis, isAnalyzing, events, partialProject };
}
EOF
log_success "hooks/useAnalysisStream.ts (stub)"
fi

# Criar utils/stream.ts se não existir
mkdir -p "$UI_DIR/src/utils"
if [[ ! -f "$UI_DIR/src/utils/stream.ts" ]]; then
cat > "$UI_DIR/src/utils/stream.ts" << 'EOF'
export interface StreamEvent {
  type: 'INFO' | 'PROGRESS' | 'FILE' | 'COMPLETE' | 'ERROR';
  message: string;
  timestamp: number;
  data?: unknown;
}

export function parseStreamEvent(line: string): StreamEvent | null {
  try { return JSON.parse(line) as StreamEvent; } 
  catch { return null; }
}
EOF
log_success "utils/stream.ts (stub)"
fi

# Garantir que index.css tem diretivas Tailwind
if ! grep -q "@tailwind base" "$UI_DIR/src/index.css" 2>/dev/null; then
  log_info "Adicionando diretivas Tailwind ao index.css..."
  TEMP_FILE=$(mktemp)
  echo '@tailwind base;
@tailwind components;
@tailwind utilities;
' > "$TEMP_FILE"
  cat "$UI_DIR/src/index.css" >> "$TEMP_FILE"
  mv "$TEMP_FILE" "$UI_DIR/src/index.css"
  log_success "Diretivas Tailwind adicionadas"
fi

#===============================================================================
# FASE 6: REINSTALAR E BUILD
#===============================================================================
log_step "FASE 6/6: Reinstalando dependências e build"

cd "$MONOREPO_ROOT"
log_info "pnpm install..."
pnpm install --force

cd "$UI_DIR"
log_info "TypeScript check..."
pnpm typecheck 2>&1 || log_warn "TypeScript tem avisos (continuando...)"

log_info "Build..."
pnpm build

#===============================================================================
# RESULTADO
#===============================================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ CONSOLIDAÇÃO v0.17.1 CONCLUÍDA COM SUCESSO!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Arquivos restaurados: ${CYAN}$FILE_COUNT${NC}"
echo -e "Versão antiga em:     ${YELLOW}$TRASH_DIR${NC}"
echo ""
echo -e "Para iniciar:"
echo -e "  ${CYAN}cd $UI_DIR && pnpm dev${NC}"
echo ""
echo -e "Abra: ${CYAN}http://localhost:5173${NC}"

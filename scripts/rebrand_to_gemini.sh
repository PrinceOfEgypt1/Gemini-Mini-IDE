#!/usr/bin/env bash
#===============================================================================
# 🔄 REBRAND: Mini-IDE → Gemini Mini-IDE
# 
# Substitui todas as referências ao nome "Mini-IDE" por "Gemini Mini-IDE"
# no repositório Gemini-Mini-IDE para evitar confusão com o outro projeto.
#===============================================================================

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }

GEMINI_DIR="$HOME/workspace/Gemini-Mini-IDE"
cd "$GEMINI_DIR"

echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔄 REBRAND: Mini-IDE → Gemini Mini-IDE${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

#===============================================================================
# FASE 1: Atualizar package.json (root)
#===============================================================================
echo ""
log_info "Atualizando package.json (root)..."

sed -i 's/"name": "mini-ide-monorepo"/"name": "gemini-mini-ide-monorepo"/g' package.json
sed -i 's/"description": "Mini-IDE/"description": "Gemini Mini-IDE/g' package.json

log_success "package.json (root)"

#===============================================================================
# FASE 2: Atualizar packages/*/package.json
#===============================================================================
log_info "Atualizando packages/*/package.json..."

# UI
sed -i 's/"name": "@mini-ide\/ui"/"name": "@gemini-mini-ide\/ui"/g' packages/ui/package.json 2>/dev/null || true

# Shared
sed -i 's/"name": "@mini-ide\/shared"/"name": "@gemini-mini-ide\/shared"/g' packages/shared/package.json 2>/dev/null || true

# Server
sed -i 's/"name": "@mini-ide\/server"/"name": "@gemini-mini-ide\/server"/g' packages/server/package.json 2>/dev/null || true

# CLI
sed -i 's/"name": "@mini-ide\/cli"/"name": "@gemini-mini-ide\/cli"/g' packages/cli/package.json 2>/dev/null || true

# Analysis Agent
sed -i 's/"name": "@mini-ide\/analysis-agent"/"name": "@gemini-mini-ide\/analysis-agent"/g' packages/analysis-agent/package.json 2>/dev/null || true

log_success "packages/*/package.json"

#===============================================================================
# FASE 3: Atualizar referências internas nos package.json
#===============================================================================
log_info "Atualizando referências de workspace..."

# Atualizar todas as referências @mini-ide/* para @gemini-mini-ide/*
find packages -name "package.json" -exec sed -i 's/@mini-ide\//@gemini-mini-ide\//g' {} \; 2>/dev/null || true

log_success "Referências de workspace"

#===============================================================================
# FASE 4: Atualizar index.html
#===============================================================================
log_info "Atualizando index.html..."

sed -i 's/Mini IDE — Explore/Gemini Mini-IDE — Explore/g' packages/ui/index.html
sed -i 's/<title>Mini IDE/<title>Gemini Mini-IDE/g' packages/ui/index.html

log_success "index.html"

#===============================================================================
# FASE 5: Atualizar componentes UI
#===============================================================================
log_info "Atualizando componentes UI..."

# App.tsx - Header
sed -i 's/>Mini IDE</>Gemini Mini-IDE</g' packages/ui/src/App.tsx 2>/dev/null || true

# Sidebar.tsx
sed -i 's/Mini-IDE v/Gemini Mini-IDE v/g' packages/ui/src/components/Sidebar.tsx 2>/dev/null || true

# HelpModal.tsx
sed -i 's/# Manual da Mini-IDE/# Manual do Gemini Mini-IDE/g' packages/ui/src/components/help/HelpModal.tsx 2>/dev/null || true
sed -i 's/A Mini-IDE é/O Gemini Mini-IDE é/g' packages/ui/src/components/help/HelpModal.tsx 2>/dev/null || true
sed -i 's/a Mini-IDE/o Gemini Mini-IDE/g' packages/ui/src/components/help/HelpModal.tsx 2>/dev/null || true
sed -i 's/A Mini-IDE roda/O Gemini Mini-IDE roda/g' packages/ui/src/components/help/HelpModal.tsx 2>/dev/null || true

# QuickStartGallery.tsx
sed -i 's/Novo na Mini-IDE/Novo no Gemini Mini-IDE/g' packages/ui/src/components/wizard/QuickStartGallery.tsx 2>/dev/null || true

log_success "Componentes UI"

#===============================================================================
# FASE 6: Atualizar CLI
#===============================================================================
log_info "Atualizando CLI..."

sed -i "s/CLI para o Mini-IDE/CLI para o Gemini Mini-IDE/g" packages/cli/src/index.ts 2>/dev/null || true
sed -i "s/Mini-IDE - Ambiente/Gemini Mini-IDE - Ambiente/g" packages/cli/src/index.ts 2>/dev/null || true

log_success "CLI"

#===============================================================================
# FASE 7: Atualizar Personas (Analysis Agent)
#===============================================================================
log_info "Atualizando personas..."

sed -i 's/do Mini-IDE/do Gemini Mini-IDE/g' packages/analysis-agent/src/personas/*.ts 2>/dev/null || true
sed -i 's/pelo Mini-IDE/pelo Gemini Mini-IDE/g' packages/analysis-agent/src/services/*.ts 2>/dev/null || true

log_success "Personas"

#===============================================================================
# FASE 8: Atualizar Documentação
#===============================================================================
log_info "Atualizando documentação..."

# README.md
sed -i 's/# Mini-IDE/# Gemini Mini-IDE/g' README.md 2>/dev/null || true

# DEVELOPMENT.md
sed -i 's/# Mini-IDE/# Gemini Mini-IDE/g' DEVELOPMENT.md 2>/dev/null || true

# docs/
sed -i 's/Mini-IDE/Gemini Mini-IDE/g' docs/BACKLOG.md 2>/dev/null || true
sed -i 's/Mini-IDE/Gemini Mini-IDE/g' docs/DOSSIE-MINI-IDE.md 2>/dev/null || true

# Renomear arquivo de dossiê
if [[ -f "docs/DOSSIE-MINI-IDE.md" ]]; then
  mv docs/DOSSIE-MINI-IDE.md docs/DOSSIE-GEMINI-MINI-IDE.md 2>/dev/null || true
  log_success "Renomeado: DOSSIE-MINI-IDE.md → DOSSIE-GEMINI-MINI-IDE.md"
fi

log_success "Documentação"

#===============================================================================
# FASE 9: Limpar backups antigos (opcional)
#===============================================================================
echo ""
log_warn "ATENÇÃO: O diretório 'backups/' contém referências antigas."
log_warn "Deseja remover o diretório de backups? (as referências antigas serão eliminadas)"
echo ""
read -p "Remover backups/ ? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
  rm -rf backups/
  log_success "Diretório backups/ removido"
else
  log_info "Backups mantidos (contém referências antigas)"
fi

#===============================================================================
# FASE 10: Verificação Final
#===============================================================================
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔍 VERIFICAÇÃO FINAL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo ""
log_info "Buscando referências restantes a 'Mini-IDE' (exceto backups)..."

REMAINING=$(grep -r "Mini-IDE" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" --include="*.html" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "dist/" | grep -v "backups/" | grep -v "Gemini Mini-IDE" | grep -v "gemini-mini-ide" || true)

if [[ -n "$REMAINING" ]]; then
  echo -e "${YELLOW}Referências restantes (podem precisar de ajuste manual):${NC}"
  echo "$REMAINING"
else
  echo -e "${GREEN}✓ Nenhuma referência a 'Mini-IDE' encontrada (exceto 'Gemini Mini-IDE')${NC}"
fi

#===============================================================================
# RESULTADO
#===============================================================================
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ REBRAND CONCLUÍDO!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Próximos passos:"
echo -e "  1. ${CYAN}pnpm install${NC} (atualizar lockfile com novos nomes)"
echo -e "  2. ${CYAN}pnpm -r build${NC} (rebuild completo)"
echo -e "  3. ${CYAN}git add -A && git commit -m 'rebrand: Mini-IDE → Gemini Mini-IDE'${NC}"
echo -e "  4. ${CYAN}git push${NC}"
echo ""

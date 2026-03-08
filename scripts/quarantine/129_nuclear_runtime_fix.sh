#!/usr/bin/env bash
################################################################################
# Script: 129_nuclear_runtime_fix.sh
# Objetivo: Resetar completamente o ambiente de runtime do servidor
# Estratégia: Kill agressivo + Limpeza profunda + Build verificado
# Data: 2024-11-23
################################################################################

set -euo pipefail

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

log_info() { echo -e "${BLUE}[info]${NC} $1"; }
log_ok() { echo -e "${GREEN}[ok]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
log_error() { echo -e "${RED}[erro]${NC} $1"; }

readonly TARGET_PORT=3200
readonly SERVER_PATH="packages/server"
readonly DIST_PATH="$SERVER_PATH/dist"
readonly DIST_FILE="$DIST_PATH/index.js"

echo "════════════════════════════════════════════════════════════════"
log_info "NUCLEAR RUNTIME FIX - Resetando ambiente do servidor"
echo "════════════════════════════════════════════════════════════════"
echo ""

################################################################################
# FASE 1: EXTERMÍNIO DE PROCESSOS ZUMBIS
################################################################################

log_info "FASE 1: Caçando processos na porta $TARGET_PORT..."

# Método 1: lsof (mais confiável)
if command -v lsof &> /dev/null; then
  PIDS=$(lsof -ti:$TARGET_PORT 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    log_warn "Processos encontrados via lsof: $PIDS"
    echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
    log_ok "Processos eliminados (lsof)"
  fi
fi

# Método 2: fuser (backup)
if command -v fuser &> /dev/null; then
  fuser -k -9 ${TARGET_PORT}/tcp 2>/dev/null || true
  log_ok "fuser executado na porta $TARGET_PORT"
fi

# Método 3: netstat + grep (paranoia mode)
if command -v netstat &> /dev/null; then
  NETSTAT_PIDS=$(netstat -tlnp 2>/dev/null | grep ":$TARGET_PORT " | awk '{print $7}' | cut -d'/' -f1 | grep -E '^[0-9]+$' || true)
  if [[ -n "$NETSTAT_PIDS" ]]; then
    log_warn "PIDs adicionais via netstat: $NETSTAT_PIDS"
    echo "$NETSTAT_PIDS" | xargs -r kill -9 2>/dev/null || true
  fi
fi

# Verificação Final: Porta está livre?
sleep 2
if lsof -ti:$TARGET_PORT &> /dev/null; then
  log_error "FALHA: Porta $TARGET_PORT ainda está ocupada!"
  lsof -i:$TARGET_PORT
  exit 1
fi

log_ok "Porta $TARGET_PORT completamente liberada"
echo ""

################################################################################
# FASE 2: LIMPEZA PROFUNDA DE ARTEFATOS
################################################################################

log_info "FASE 2: Removendo artefatos antigos..."

# Remover pasta dist
if [[ -d "$DIST_PATH" ]]; then
  log_info "Removendo $DIST_PATH..."
  rm -rf "$DIST_PATH"
  log_ok "dist/ removido"
else
  log_warn "dist/ já não existia"
fi

# Remover caches do TypeScript
find "$SERVER_PATH" -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
log_ok "Caches do TypeScript limpos"

# Remover node_modules local (opcional mas recomendado)
if [[ -d "$SERVER_PATH/node_modules" ]]; then
  log_warn "Removendo node_modules local do servidor..."
  rm -rf "$SERVER_PATH/node_modules"
  log_ok "node_modules removido"
fi

echo ""

################################################################################
# FASE 3: REINSTALAÇÃO E BUILD VERIFICADO
################################################################################

log_info "FASE 3: Reinstalando dependências..."
pnpm install --frozen-lockfile
log_ok "Dependências sincronizadas"

echo ""
log_info "FASE 4: Executando build do servidor..."

# Timestamp ANTES do build
BEFORE_BUILD=$(date +%s)
sleep 1

# Build
pnpm --filter @mini-ide/server build

# Timestamp DEPOIS do build
AFTER_BUILD=$(date +%s)

log_ok "Build concluído"
echo ""

################################################################################
# FASE 5: VERIFICAÇÃO DE INTEGRIDADE
################################################################################

log_info "FASE 5: Verificando integridade do artefato..."

# Verificar se o arquivo existe
if [[ ! -f "$DIST_FILE" ]]; then
  log_error "FALHA CRÍTICA: $DIST_FILE não foi criado!"
  exit 1
fi

# Verificar timestamp do arquivo
FILE_MTIME=$(stat -c %Y "$DIST_FILE" 2>/dev/null || stat -f %m "$DIST_FILE" 2>/dev/null)

if [[ $FILE_MTIME -lt $BEFORE_BUILD ]]; then
  log_error "AVISO: $DIST_FILE tem timestamp ANTIGO!"
  log_error "O build pode não ter atualizado o arquivo corretamente."
  exit 1
fi

log_ok "Artefato $DIST_FILE verificado (timestamp atual)"

# Mostrar primeiras linhas do artefato para debug
log_info "Primeiras 5 linhas do artefato compilado:"
head -n 5 "$DIST_FILE"
echo ""

################################################################################
# FASE 6: INSTRUÇÕES FINAIS
################################################################################

echo "════════════════════════════════════════════════════════════════"
log_ok "✅ AMBIENTE RESETADO COM SUCESSO"
echo "════════════════════════════════════════════════════════════════"
echo ""
log_info "Próximos passos:"
echo ""
echo "  1. Iniciar o servidor manualmente:"
echo "     $ cd $SERVER_PATH"
echo "     $ pnpm start"
echo ""
echo "  2. OU via script de pipeline:"
echo "     $ ./scripts/bash_42_pipeline_checklist.sh"
echo ""
echo "  3. Verificar no browser:"
echo "     http://localhost:$TARGET_PORT/healthz"
echo "     http://localhost:$TARGET_PORT/docs"
echo ""
log_warn "Se o problema persistir, verifique:"
echo "  - Logs do servidor em /tmp/server.log"
echo "  - Se há proxies/VPNs interferindo na porta $TARGET_PORT"
echo "  - Configuração de firewall local"
echo ""

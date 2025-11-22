#!/usr/bin/env bash
################################################################################
# Script: 42_pipeline_checklist.sh
# Versão: 1.2.1 (Fixed Server Path for TS RootDir)
# Data: 2024-11-22
################################################################################

set -euo pipefail

# Configuração
readonly SERVER_PORT="${PORT:-3200}"
readonly REQUIRE_GLOBAL_CLI="${REQUIRE_GLOBAL_CLI:-1}"
readonly SKIP_SERVER_START="${SKIP_SERVER_START:-0}"

# Cores
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Funções de log
log_info() { echo -e "${BLUE}[info]${NC} $1"; }
log_ok() { echo -e "${GREEN}[ok]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
log_error() { echo -e "${RED}[erro]${NC} $1"; }
log_fail() { echo -e "${RED}[fail]${NC} $1"; }

# Variável para rastrear falhas
FAILURES=0

################################################################################
# ETAPA 1: Lint
################################################################################

log_info "ETAPA 1/6: Executando lint (ESLint)..."
if pnpm lint > /tmp/lint.log 2>&1; then
  log_ok "Lint passou"
else
  log_fail "Lint falhou"
  cat /tmp/lint.log
  ((FAILURES++))
fi
echo ""

################################################################################
# ETAPA 2: Type-check
################################################################################

log_info "ETAPA 2/6: Executando type-check (TypeScript)..."
if pnpm typecheck > /tmp/typecheck.log 2>&1; then
  log_ok "Type-check passou"
else
  log_fail "Type-check falhou"
  cat /tmp/typecheck.log
  ((FAILURES++))
fi
echo ""

################################################################################
# ETAPA 3: Testes
################################################################################

log_info "ETAPA 3/6: Executando testes (Vitest)..."
if pnpm test > /tmp/test.log 2>&1; then
  log_ok "Testes passaram"
else
  log_fail "Testes falharam"
  cat /tmp/test.log
  ((FAILURES++))
fi
echo ""

################################################################################
# ETAPA 4: Build
################################################################################

log_info "ETAPA 4/6: Executando build de todos os pacotes..."
if pnpm build > /tmp/build.log 2>&1; then
  log_ok "Build passou"
else
  log_fail "Build falhou"
  cat /tmp/build.log
  ((FAILURES++))
fi
echo ""

################################################################################
# ETAPA 5: Smoke test - /healthz
################################################################################

SERVER_PID=""

if [[ "$SKIP_SERVER_START" == "0" ]]; then
  log_info "ETAPA 5/6: Smoke test - endpoint /healthz"

  # FIX CRÍTICO: Caminho aponta para dist/src/index.js
  # Verifique se este arquivo existe com 'ls packages/server/dist/src/index.js'
  log_info "Iniciando servidor na porta $SERVER_PORT..."
  PORT=$SERVER_PORT node packages/server/dist/src/index.js > /tmp/server.log 2>&1 &
  SERVER_PID=$!

  # Aguardar servidor inicializar
  log_info "Aguardando servidor inicializar..."
  sleep 5

  # Verificar se processo está rodando
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    log_fail "Servidor não iniciou corretamente"
    cat /tmp/server.log
    ((FAILURES++))
  else
    # Testar /healthz
    if curl -f -s "http://127.0.0.1:$SERVER_PORT/healthz" > /tmp/healthz.json 2>&1; then
      log_ok "/healthz respondeu com sucesso"
    else
      log_fail "/healthz não respondeu"
      cat /tmp/healthz.json 2>/dev/null || true
      cat /tmp/server.log
      ((FAILURES++))
    fi
  fi
  echo ""
else
  log_warn "ETAPA 5/6: Smoke test /healthz pulado (SKIP_SERVER_START=1)"
  echo ""
fi

################################################################################
# ETAPA 6: Smoke test - /analyze com validação de contrato
################################################################################

if [[ "$SKIP_SERVER_START" == "0" ]] && [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
  log_info "ETAPA 6/6: Smoke test - endpoint /analyze com validação de contrato"

  # Payload de teste
  PAYLOAD='{"text":"Teste do contrato oficial do endpoint analyze","maxLen":50}'

  # Fazer requisição
  if curl -f -s -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "http://127.0.0.1:$SERVER_PORT/analyze" > /tmp/analyze.json 2>&1; then

    # Ler resposta
    RESPONSE=$(cat /tmp/analyze.json)

    # Validar contrato usando Node.js
    VALIDATION_RESULT=$(node -e "
      const response = $RESPONSE;

      function isAnalyzeResponse(obj) {
        if (typeof obj !== 'object' || obj === null) return false;

        const hasSummary = typeof obj['summary'] === 'string';
        const hasInputLength = typeof obj['inputLength'] === 'number';
        const hasOutputLength = typeof obj['outputLength'] === 'number';
        const hasRequestId = typeof obj['requestId'] === 'string';
        const hasTimestamp = typeof obj['timestamp'] === 'string';

        if (!hasSummary || !hasInputLength || !hasOutputLength || !hasRequestId || !hasTimestamp) {
          return false;
        }
        return true;
      }

      const isValid = isAnalyzeResponse(response);
      if (isValid) console.log('VALID');
      else {
        console.log('INVALID');
        console.error('Response:', JSON.stringify(response, null, 2));
      }
    " 2>&1)

    if echo "$VALIDATION_RESULT" | grep -q "^VALID$"; then
      log_ok "/analyze válido (contrato respeitado)"
    else
      log_fail "/analyze com shape inválido"
      echo "$VALIDATION_RESULT"
      cat /tmp/analyze.json
      ((FAILURES++))
    fi
  else
    log_fail "/analyze não respondeu ou retornou erro"
    cat /tmp/analyze.json 2>/dev/null || true
    cat /tmp/server.log
    ((FAILURES++))
  fi

  # Finalizar servidor
  if [[ -n "$SERVER_PID" ]]; then
    log_info "Finalizando servidor (PID: $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  echo ""
else
  # Se falhou na etapa 5, avisa aqui também
  if [[ "$SKIP_SERVER_START" == "0" ]]; then
      log_warn "ETAPA 6/6: Smoke test /analyze pulado (servidor não disponível)"
  fi
  echo ""
fi

################################################################################
# RESULTADO FINAL
################################################################################

echo "════════════════════════════════════════════════════════════════"
if [[ $FAILURES -eq 0 ]]; then
  log_ok "Pipeline completa - TODAS as etapas passaram ✓"
  echo "════════════════════════════════════════════════════════════════"
  exit 0
else
  log_fail "Pipeline falhou - $FAILURES etapa(s) com erro ✗"
  echo "════════════════════════════════════════════════════════════════"
  exit 1
fi

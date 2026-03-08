#!/usr/bin/env bash
set -e

echo "🚑 [Phase 14] Atualizando Checklist de Pipeline para suportar modo Dry-Run..."

# ==============================================================================
# Reescrever 42_pipeline_checklist.sh (Versão Definitiva Fase 14)
# ==============================================================================
cat > 42_pipeline_checklist.sh << 'EOF'
#!/usr/bin/env bash
set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[info]${NC} $1"; }
log_ok() { echo -e "${GREEN}[ok]${NC} $1"; }
log_fail() { echo -e "${RED}[fail]${NC} $1"; }

# Variável para pular o servidor se necessário (útil para debug)
SKIP_SERVER=${SKIP_SERVER:-0}

echo "════════════════════════════════════════════════════════════════"
echo "🚀 INICIANDO PIPELINE DE VALIDAÇÃO (FASE 14)"
echo "════════════════════════════════════════════════════════════════"

# 1. LINT
log_info "ETAPA 1/6: Executando lint (ESLint)..."
if pnpm -r lint; then
  log_ok "Lint passou"
else
  log_fail "Lint falhou"
  exit 1
fi

echo ""

# 2. TYPECHECK
log_info "ETAPA 2/6: Executando type-check (TypeScript)..."
if pnpm -r typecheck; then
  log_ok "Type-check passou"
else
  log_fail "Type-check falhou"
  exit 1
fi

echo ""

# 3. TESTS
log_info "ETAPA 3/6: Executando testes (Vitest)..."
if pnpm -r test; then
  log_ok "Testes passaram"
else
  log_fail "Testes falharam"
  exit 1
fi

echo ""

# 4. BUILD
log_info "ETAPA 4/6: Executando build de todos os pacotes..."
if pnpm -r build; then
  log_ok "Build passou"
else
  log_fail "Build falhou"
  exit 1
fi

echo ""

# Se SKIP_SERVER for 1, para por aqui
if [ "$SKIP_SERVER" -eq 1 ]; then
  log_info "Pualando testes de servidor (SKIP_SERVER=1)"
  exit 0
fi

# 5. SMOKE TEST - SERVER START
log_info "ETAPA 5/6: Smoke test - endpoint /healthz"

# Garante que nada está rodando na porta 3200
fuser -k 3200/tcp > /dev/null 2>&1 || true

# Inicia o servidor em background
log_info "Iniciando servidor na porta 3200..."
# Usamos o script de start direto do pacote para garantir que usa o dist/index.js
(cd packages/server && node dist/index.js) > /dev/null 2>&1 &
SERVER_PID=$!

# Aguarda o servidor subir
log_info "Aguardando servidor inicializar..."
sleep 5

# Testa /healthz
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/healthz)

if [ "$HTTP_CODE" -eq 200 ]; then
  log_ok "/healthz respondeu com sucesso"
else
  log_fail "Servidor não iniciou corretamente (HTTP $HTTP_CODE)"
  kill $SERVER_PID
  exit 1
fi

echo ""

# 6. SMOKE TEST - ANALYZE (DRY RUN)
log_info "ETAPA 6/6: Smoke test - endpoint /analyze com validação de contrato"

# Payload de teste
PAYLOAD='{"text": "teste de pipeline", "maxLen": 100}'

# Requisição com Header X-Dry-Run: true (O SEGREDO DO SUCESSO)
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Dry-Run: true" \
  -d "$PAYLOAD" \
  http://localhost:3200/analyze)

# Validação simples se retornou JSON válido e contem campos chave
if echo "$RESPONSE" | grep -q "summary" && echo "$RESPONSE" | grep -q "requestId"; then
  log_ok "/analyze válido (contrato respeitado)"
else
  log_fail "/analyze não respondeu ou retornou erro"
  echo "Response: $RESPONSE"
  kill $SERVER_PID
  exit 1
fi

# Limpeza
log_info "Finalizando servidor (PID: $SERVER_PID)..."
kill $SERVER_PID

echo ""
echo "════════════════════════════════════════════════════════════════"
log_ok "Pipeline completa - TODAS as etapas passaram ✓"
echo "════════════════════════════════════════════════════════════════"
EOF

chmod +x 42_pipeline_checklist.sh
echo "✅ Script de Pipeline atualizado com sucesso!"

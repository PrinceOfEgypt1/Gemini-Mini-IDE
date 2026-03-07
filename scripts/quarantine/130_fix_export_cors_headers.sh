#!/usr/bin/env bash
################################################################################
# Script: 130_fix_export_cors_headers.sh
# Objetivo: Corrigir headers CORS e Content-Type na rota /export
# Diagnóstico: Servidor responde 200 mas navegador não recebe headers CORS
# Data: 2024-11-23
################################################################################

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

log_info() { echo -e "${BLUE}[info]${NC} $1"; }
log_ok() { echo -e "${GREEN}[ok]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
log_error() { echo -e "${RED}[erro]${NC} $1"; }

readonly SERVER_INDEX="packages/server/src/index.ts"

echo "════════════════════════════════════════════════════════════════"
log_info "FIX: Adicionando headers CORS explícitos na rota /export"
echo "════════════════════════════════════════════════════════════════"
echo ""

################################################################################
# DIAGNÓSTICO DO PROBLEMA
################################################################################

log_warn "DIAGNÓSTICO:"
echo "  - Servidor responde 200 OK para POST /export"
echo "  - Navegador reclama: 'No Access-Control-Allow-Origin header'"
echo "  - CAUSA: Plugin @fastify/cors não adiciona headers em respostas stream/binary"
echo ""

################################################################################
# BACKUP
################################################################################

log_info "Criando backup do index.ts..."
cp "$SERVER_INDEX" "${SERVER_INDEX}.bak"
log_ok "Backup criado: ${SERVER_INDEX}.bak"

################################################################################
# APLICAR FIX: Wrapper manual de CORS na rota /export
################################################################################

log_info "Modificando rota /export com headers CORS explícitos..."

cat > "$SERVER_INDEX" << 'EOF'
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'node:crypto';
import { ExportController } from './controllers/export.controller';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

async function bootstrap() {
  // CORS Fix: Permissivo para desenvolvimento local
  await server.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: false
  });

  await server.register(swagger, {
    swagger: {
      info: { title: 'Mini-IDE Server', version: '0.1.0' }
    }
  });
  await server.register(swaggerUi, { routePrefix: '/docs' });

  server.get('/healthz', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  server.post('/analyze', async (req, reply) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      summary: "Análise simulada com sucesso.",
      inputLength: 150,
      outputLength: 300,
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      budgetUsed: 0.00,
      budgetRemaining: 10.00,
      status: "success"
    };
  });

  // FIX CRÍTICO: Wrapper manual para garantir headers CORS em resposta binária
  server.post('/export', async (req, reply) => {
    // Headers CORS explícitos (não confia apenas no plugin)
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Delegar para o controller
    return ExportController.downloadZip(req, reply);
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3200;
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
EOF

log_ok "Arquivo modificado com wrapper CORS manual"

################################################################################
# REBUILD
################################################################################

log_info "Executando rebuild do servidor..."
pnpm --filter @mini-ide/server build

if [[ ! -f "packages/server/dist/index.js" ]]; then
  log_error "FALHA: Build não gerou o artefato!"
  exit 1
fi

log_ok "Build concluído com sucesso"

################################################################################
# INSTRUÇÕES
################################################################################

echo ""
echo "════════════════════════════════════════════════════════════════"
log_ok "✅ FIX APLICADO"
echo "════════════════════════════════════════════════════════════════"
echo ""
log_info "O que foi alterado:"
echo "  • Rota /export agora define headers CORS explicitamente"
echo "  • Headers: Access-Control-Allow-Origin: *"
echo ""
log_warn "AÇÃO OBRIGATÓRIA:"
echo "  1. Mate o servidor rodando (Ctrl+C no terminal do pnpm start)"
echo "  2. Reinicie: cd packages/server && pnpm start"
echo "  3. Teste novamente no frontend"
echo ""
log_info "Se ainda falhar, verifique:"
echo "  • Console do navegador (F12) para ver headers da resposta"
echo "  • Implementação do ExportController.downloadZip"
echo ""

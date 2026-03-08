#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Restaurando contrato do endpoint /analyze (Mock Compliant)..."

# ==============================================================================
# 1. Reescrever index.ts com Mock Completo e Rota de Exportação
# ==============================================================================
echo "📝 Atualizando packages/server/src/index.ts..."

cat > packages/server/src/index.ts <<EOF
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
  // Plugins
  await server.register(cors, { origin: '*' });
  
  await server.register(swagger, {
    swagger: {
      info: { title: 'Mini-IDE Server', version: '0.1.0' }
    }
  });
  await server.register(swaggerUi, { routePrefix: '/docs' });

  // Routes
  server.get('/healthz', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Endpoint de Análise (Mock aderente ao contrato da HU 1.7)
  server.post('/analyze', async (req, reply) => {
    // Simulação de delay para UX (loading states)
    await new Promise(resolve => setTimeout(resolve, 800));

    // Retorna o shape completo esperado pelo 42_pipeline_checklist.sh
    return {
      summary: "Análise simulada com sucesso (Mock Restaurado).",
      inputLength: 150,
      outputLength: 300,
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      budgetUsed: 0.00,
      budgetRemaining: 10.00,
      // Campos adicionais úteis
      status: "success" 
    };
  });

  // Endpoint de Exportação (Implementado na Sprint 11.3)
  server.post('/export', ExportController.downloadZip);

  // Start
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3200;
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(\`🚀 Server running on http://localhost:\${port}\`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
EOF

# ==============================================================================
# 2. Validação
# ==============================================================================
echo "🛡️  Validando build do servidor..."
pnpm --filter @mini-ide/server build

echo "✅ Contrato /analyze restaurado. O pipeline deve passar agora."

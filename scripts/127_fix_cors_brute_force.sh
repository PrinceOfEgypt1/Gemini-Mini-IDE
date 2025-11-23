#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Aplicando configuração CORS 'Permissive Mode'..."

# ==============================================================================
# 1. Reescrever index.ts com CORS '*' (Aceitar Tudo)
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
  // 1. Configuração CORS "Marreta" (Brute Force)
  // origin: '*' permite qualquer origem.
  // credentials: false é obrigatório quando origin é '*'.
  await server.register(cors, { 
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: false
  });
  
  // 2. Swagger
  await server.register(swagger, {
    swagger: {
      info: { title: 'Mini-IDE Server', version: '0.1.0' }
    }
  });
  await server.register(swaggerUi, { routePrefix: '/docs' });

  // 3. Routes
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
# 2. Forçar Rebuild do Server
# ==============================================================================
echo "qy 🏗️  Limpando e Reconstruindo o servidor..."
rm -rf packages/server/dist
pnpm --filter @mini-ide/server build

echo "✅ Configuração CORS atualizada para aceitar tudo (*)."

#!/usr/bin/env bash
set -e

echo "🚑 Sprint 8.8: Ajustando configuração do Ajv no Fastify (Schema Strict Mode)..."

# Reescrevendo index.ts do servidor com a configuração correta do AJV
cat > packages/server/src/index.ts <<EOF
import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { AnalysisAgent, PromptOptimizer } from '@mini-ide/analysis-agent';
import { PersistenceService } from './services/persistence.js';
import { BudgetService } from './services/budget.js';
import { AnalyzeRequestSchema, AnalyzeResponseSchema } from './schemas.js';
import path from 'path';

const PORT = Number(process.env.PORT) || 3200;

// Serviços
const agent = new AnalysisAgent();
const persistence = new PersistenceService();
const budgetService = new BudgetService();

const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      targets: [
        { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } },
        { 
          target: 'pino-roll', 
          options: { file: path.join(process.cwd(), 'logs', 'audit.log'), size: '10m', interval: '1d', mkdir: true } 
        }
      ]
    }
  },
  // FIX: Configuração do AJV para aceitar 'example' (usado no Swagger)
  ajv: {
    customOptions: {
      keywords: ['example']
    }
  }
});

// Plugins
fastify.register(cors, { origin: true });

fastify.register(swagger, {
  swagger: {
    info: {
      title: 'Mini-IDE API',
      description: 'API do Backend de Inteligência do Mini-IDE',
      version: '0.7.0'
    },
    host: 'localhost:' + PORT,
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
});

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'full', deepLinking: false }
});

// Global Error Handler
fastify.setErrorHandler((error: FastifyError, request, reply) => {
  request.log.error(error);
  
  const statusCode = error.statusCode || 500;
  const message = error.statusCode ? error.message : 'Erro interno do servidor.';
  
  reply.status(statusCode).send({
    error: true,
    message,
    requestId: request.id
  });
});

// Rotas
fastify.get('/healthz', async () => {
  return { status: 'ok', uptime: process.uptime() };
});

fastify.get('/analyze/history', async () => {
  return await persistence.listHistory();
});

fastify.post<{ Body: AnalyzeRequest; Reply: AnalyzeResponse | { error: string, message?: string } }>(
  '/analyze', 
  {
    schema: {
      description: 'Analisa um texto usando IA',
      body: AnalyzeRequestSchema,
      response: { 200: AnalyzeResponseSchema }
    }
  },
  async (request, reply) => {
    const { text } = request.body;
    const costEstimate = 0.05;

    // Budget Check
    const canProceed = await budgetService.checkBudget(costEstimate);
    if (!canProceed) {
      return reply.code(402).send({ error: 'Payment Required', message: 'Orçamento diário excedido.' });
    }

    // Prompt Optimizer
    const optimizedText = PromptOptimizer.optimize(text);
    
    request.log.info({ 
      msg: 'Iniciando análise', 
      originalLength: text.length, 
      optimizedLength: optimizedText.length 
    });

    // Processamento
    const response = await agent.process({ ...request.body, text: optimizedText });
      
    // Persistência e Consumo
    await budgetService.consume(costEstimate);
    
    // Catch silencioso apenas na persistência
    persistence.saveBundle(response).catch((err: unknown) => {
        request.log.error({ msg: 'Erro persistência', err });
    });

    response.budgetUsed = 5.00 - budgetService.getRemaining();
    response.budgetRemaining = budgetService.getRemaining();

    return response;
  }
);

const start = async () => {
  try {
    await persistence.init();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    // eslint-disable-next-line no-console
    console.log(\`🚀 Mini-IDE Server rodando em http://localhost:\${PORT}\`);
    console.log(\`📚 Documentação disponível em http://localhost:\${PORT}/docs\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF

# Recompilar o servidor para aplicar a mudança
echo "🏗️ Recompilando Server..."
pnpm --filter @mini-ide/server build

echo "✅ Fix de Schema aplicado."
echo "👉 Execute ./42_pipeline_checklist.sh (Agora deve passar no Smoke Test!)"

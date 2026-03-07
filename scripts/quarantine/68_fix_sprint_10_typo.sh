#!/usr/bin/env bash
set -e

echo "🚑 Sprint 10.2: Corrigindo erro de digitação no Servidor (Method Name Mismatch)..."

# 1. Reescrever o index.ts do Servidor com a chamada correta
# O erro estava na linha 126 (aprox): agent.discovery.generateHUs -> agent.discovery.generateUserStories
# -----------------------------------------------------
echo "📝 Corrigindo packages/server/src/index.ts..."

cat > packages/server/src/index.ts <<EOF
import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AnalyzeRequest, AnalyzeResponse, ProjectDefinition } from '@mini-ide/shared';
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
  ajv: { customOptions: { keywords: ['example'] } }
});

// Plugins
fastify.register(cors, { origin: true });

fastify.register(swagger, {
  swagger: {
    info: { title: 'Mini-IDE API', description: 'API Backend v0.9.0', version: '0.9.0' },
    host: 'localhost:' + PORT,
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
});

fastify.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list', deepLinking: false } });

// Error Handler
fastify.setErrorHandler((error: FastifyError, request, reply) => {
  request.log.error(error);
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({ error: true, message: error.message || 'Erro interno.', requestId: request.id });
});

// --- ROTAS ---

fastify.get('/healthz', async () => {
  return { status: 'ok', uptime: process.uptime() };
});

fastify.get('/analyze/history', async () => {
  return await persistence.listHistory();
});

// Rota Principal de Análise
fastify.post<{ Body: AnalyzeRequest; Reply: AnalyzeResponse | { error: string, message?: string } }>(
  '/analyze', 
  { schema: { body: AnalyzeRequestSchema, response: { 200: AnalyzeResponseSchema } } },
  async (request, reply) => {
    const { text } = request.body;
    const costEstimate = 0.05;

    if (!(await budgetService.checkBudget(costEstimate))) {
      return reply.code(402).send({ error: 'Payment Required', message: 'Orçamento diário excedido.' });
    }

    const optimizedText = PromptOptimizer.optimize(text);
    const response = await agent.process({ ...request.body, text: optimizedText });
    
    await budgetService.consume(costEstimate);
    persistence.saveBundle(response).catch((err: unknown) => request.log.error({ msg: 'Erro persistência', err }));

    response.budgetUsed = 5.00 - budgetService.getRemaining();
    response.budgetRemaining = budgetService.getRemaining();
    return response;
  }
);

// --- ROTAS FASE 10 (WIZARD) ---

// 1. Gerar HUs (Passo 1 do Wizard)
fastify.post<{ Body: { intention: string } }>('/discovery/hus', async (request, reply) => {
  const { intention } = request.body; // Corrigido para ler 'intention' do body
  if (!intention) return reply.code(400).send({ error: 'Intention is required' });

  request.log.info('Gerando HUs para: ' + intention);
  
  // FIX: Chamando o método com o nome CORRETO (generateUserStories)
  const hus = await agent.discovery.generateUserStories(intention);
  
  return { userStories: hus };
});

// 2. Gerar Scripts de Ambiente (Passo Final do Wizard)
fastify.post<{ Body: ProjectDefinition }>('/wizard/generate', async (request) => {
  request.log.info('Wizard: Gerando scripts para ' + request.body.name);
  const scripts = agent.generator.generateScaffolding(request.body);
  
  // Persistir o plano final como um bundle também
  persistence.saveBundle({
    requestId: 'wizard-' + Date.now(),
    summary: 'Wizard Setup: ' + request.body.name,
    inputLength: 0, outputLength: scripts.setupScript.length,
    timestamp: new Date().toISOString(),
    // Campos obrigatórios mockados para o bundle
    budgetUsed: 0,
    budgetRemaining: 0
  } as any).catch(() => {});
  
  return scripts;
});

const start = async () => {
  try {
    await persistence.init();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    // eslint-disable-next-line no-console
    console.log(\`🚀 Server rodando em http://localhost:\${PORT}\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF

# 2. Reconstruir pacotes na ordem certa para garantir tipos
# -----------------------------------------------------
echo "🏗️ Reconstruindo..."
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build

echo "✅ Fix aplicado: generateHUs -> generateUserStories."
echo "👉 Execute ./42_pipeline_checklist.sh"

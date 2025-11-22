#!/usr/bin/env bash
set -e

echo "🚑 Sprint 8.4: Corrigindo imports, exports e tipos no Backend..."

# 1. Expor PromptOptimizer no Analysis Agent
# Para que o servidor possa importar { PromptOptimizer } de '@mini-ide/analysis-agent'
# -----------------------------------------------------
echo "📝 Atualizando exports do Agente..."
cat > packages/analysis-agent/src/index.ts <<EOF
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { LLMProvider } from './providers/llm-provider.js';
import { MockProvider } from './providers/mock-provider.js';
import { DeepSeekProvider } from './providers/deepseek-provider.js';
import { v4 as uuidv4 } from 'uuid';

// Re-exportar utilitários para consumidores
export { PromptOptimizer } from './utils/prompt-optimizer.js';

function getProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
  }
  return new MockProvider();
}

export class AnalysisAgent {
  private provider: LLMProvider;

  constructor() {
    this.provider = getProvider();
  }

  async process(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const requestId = uuidv4();
    
    const prompt = \`Contexto: \${request.text}\n\nInstrução: Gere um JSON com o plano de desenvolvimento.\`;

    const llmResult = await this.provider.generate(prompt);
    
    let summary = llmResult.content;
    try {
        const parsed = JSON.parse(llmResult.content);
        summary = parsed.summary || JSON.stringify(parsed);
    } catch {
        // Ignora falha de parse
    }

    if (request.maxLen && summary.length > request.maxLen) {
        summary = summary.substring(0, request.maxLen) + '...';
    }

    const estimatedCost = (llmResult.usage.inputTokens + llmResult.usage.outputTokens) * 0.00001;

    return {
      requestId,
      summary,
      inputLength: request.text.length,
      outputLength: llmResult.content.length,
      timestamp: new Date().toISOString(),
      budgetUsed: estimatedCost,
      budgetRemaining: 100 
    };
  }
}
EOF

# 2. Corrigir Server Index (Import correto e Tipo de Erro)
# -----------------------------------------------------
echo "📝 Corrigindo Server Index (Imports e Types)..."
cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
// FIX: Importando PromptOptimizer do pacote raiz, não de um caminho profundo
import { AnalysisAgent, PromptOptimizer } from '@mini-ide/analysis-agent';
import { PersistenceService } from './services/persistence.js';
import { BudgetService } from './services/budget.js';
import { AnalyzeRequestSchema, AnalyzeResponseSchema } from './schemas.js';
import path from 'path';

const PORT = Number(process.env.PORT) || 3200;

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
  }
});

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

// FIX: Tipando error como 'any' para evitar erro TS18046 (Object is of type 'unknown')
fastify.setErrorHandler((error: any, request, reply) => {
  request.log.error(error);
  
  const statusCode = error.statusCode || 500;
  const message = error.statusCode ? error.message : 'Erro interno do servidor. Nossa equipe foi notificada.';
  
  reply.status(statusCode).send({
    error: true,
    message,
    requestId: request.id
  });
});

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

    const canProceed = await budgetService.checkBudget(costEstimate);
    if (!canProceed) {
      return reply.code(402).send({ error: 'Payment Required', message: 'Orçamento diário excedido.' });
    }

    const optimizedText = PromptOptimizer.optimize(text);
    
    request.log.info({ 
      msg: 'Iniciando análise', 
      originalLength: text.length, 
      optimizedLength: optimizedText.length 
    });

    try {
      const response = await agent.process({ ...request.body, text: optimizedText });
      
      await budgetService.consume(costEstimate);
      persistence.saveBundle(response).catch(err => request.log.error({ msg: 'Erro persistência', err }));

      response.budgetUsed = 5.00 - budgetService.getRemaining();
      response.budgetRemaining = budgetService.getRemaining();

      return response;
    } catch (error: any) {
      throw error; 
    }
  }
);

const start = async () => {
  try {
    await persistence.init();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    // eslint-disable-next-line no-console
    console.log(\`🚀 Mini-IDE Server rodando em http://localhost:\${PORT}\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF

# 3. Corrigir Teste de Budget (Faltou .js)
# -----------------------------------------------------
echo "📝 Corrigindo teste do Budget..."
cat > packages/server/test/services/budget.test.ts <<EOF
import { describe, it, expect, beforeEach } from 'vitest';
// FIX: Adicionada extensão .js
import { BudgetService } from '../../src/services/budget.js';

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(() => {
    service = new BudgetService();
  });

  it('deve iniciar com orçamento total', () => {
    expect(service.getRemaining()).toBe(5.00);
  });

  it('deve deduzir custo corretamente', async () => {
    await service.consume(1.50);
    expect(service.getRemaining()).toBe(3.50);
  });

  it('deve bloquear se exceder o limite', async () => {
    await service.consume(4.90);
    const allowed = await service.checkBudget(0.20); 
    expect(allowed).toBe(false);
  });
});
EOF

# 4. Rebuild Necessário
# Como mudamos o export do Agent, precisamos recompilá-lo antes do server
# -----------------------------------------------------
echo "🏗️ Reconstruindo Agente e Servidor..."
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build

echo "✅ Correções aplicadas."
echo "👉 Execute ./42_pipeline_checklist.sh (Agora VAI!)"

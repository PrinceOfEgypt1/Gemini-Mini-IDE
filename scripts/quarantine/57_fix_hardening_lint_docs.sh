#!/usr/bin/env bash
set -e

echo "🚑 Sprint 8.5: Saneamento de Lint e Documentação TSDoc (Strict Compliance)..."

# 1. DeepSeek Provider (Falta TSDoc e tem erros de Lint)
# -----------------------------------------------------
echo "📝 Refatorando packages/analysis-agent/src/providers/deepseek-provider.ts..."
cat > packages/analysis-agent/src/providers/deepseek-provider.ts <<EOF
import axios from 'axios';
import { LLMProvider, LLMResponse } from './llm-provider.js';

/**
 * Implementação do provedor de LLM utilizando a API da DeepSeek.
 */
export class DeepSeekProvider implements LLMProvider {
  private apiKey: string;
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions';

  /**
   * Cria uma instância do provedor DeepSeek.
   * @param apiKey - A chave de API para autenticação.
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Envia o prompt para a API da DeepSeek e retorna a resposta formatada.
   * @param prompt - O texto de entrada.
   * @returns Uma Promise com a resposta do modelo.
   * @throws Error se a chamada à API falhar.
   */
  async generate(prompt: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a specialized software engineering agent." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': \`Bearer \${this.apiKey}\`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      return {
        content: data.choices[0].message.content,
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens
        }
      };
    } catch (error: unknown) {
      // Tratamento de erro seguro (sem 'any')
      if (axios.isAxiosError(error)) {
         const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
         throw new Error(\`DeepSeek API Error: \${msg}\`);
      }
      throw new Error('Unknown error in DeepSeekProvider');
    }
  }
}
EOF

# 2. Server Index (Erro de Lint 'no-useless-catch' e 'any')
# -----------------------------------------------------
echo "📝 Refatorando packages/server/src/index.ts..."
cat > packages/server/src/index.ts <<EOF
import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
// FIX: Importando PromptOptimizer do pacote raiz
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

// FIX: Tipando error corretamente com FastifyError e removendo 'any'
fastify.setErrorHandler((error: FastifyError, request, reply) => {
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

    // FIX: Removido try/catch inútil. Se der erro, o Global Handler pega.
    const response = await agent.process({ ...request.body, text: optimizedText });
      
    // Persistência e Consumo
    await budgetService.consume(costEstimate);
    
    // Catch silencioso apenas na persistência (background task)
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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF

echo "✅ Código saneado e documentado."
echo "👉 Execute ./42_pipeline_checklist.sh"

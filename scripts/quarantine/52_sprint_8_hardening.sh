#!/usr/bin/env bash
set -e

echo "🛡️ Iniciando Fase 8: Hardening do Backend (Robustez & Documentação)..."

# ------------------------------------------------------------------------------
# 1. Instalar Dependências (Swagger/OpenAPI)
# ------------------------------------------------------------------------------
echo "📦 Instalando plugins do Fastify..."
pnpm --filter @mini-ide/server add @fastify/swagger @fastify/swagger-ui

# ------------------------------------------------------------------------------
# 2. Implementar Otimizador de Prompt (@mini-ide/analysis-agent)
# HU-2.1 Analysis-CompactPrompt
# ------------------------------------------------------------------------------
echo "🧠 Implementando PromptOptimizer no Agente..."
mkdir -p packages/analysis-agent/src/utils

cat > packages/analysis-agent/src/utils/prompt-optimizer.ts <<EOF
/**
 * Utilitário para otimização de prompts antes do envio ao LLM.
 * Reduz custos removendo espaços desnecessários e truncando inputs gigantes.
 */
export class PromptOptimizer {
  /**
   * Compacta e normaliza o texto.
   * 1. Remove espaços extras no início/fim.
   * 2. Substitui múltiplos espaços/quebras de linha por um único espaço (para análise simples).
   * 3. Trunca se exceder o limite de segurança.
   */
  static optimize(text: string, limit: number = 10000): string {
    if (!text) return '';

    // Normalização básica
    let optimized = text.trim().replace(/\s+/g, ' ');

    // Truncamento de segurança (Hard limit)
    if (optimized.length > limit) {
      optimized = optimized.substring(0, limit);
      console.warn(\`[PromptOptimizer] Input truncado de \${text.length} para \${limit} caracteres.\`);
    }

    return optimized;
  }
}
EOF

# ------------------------------------------------------------------------------
# 3. Implementar Serviço de Orçamento (@mini-ide/server)
# HU-2.2 Analysis-Budget-Check / HU-12.2 Budget-Per-Context
# ------------------------------------------------------------------------------
echo "💰 Implementando BudgetService no Server..."

cat > packages/server/src/services/budget.ts <<EOF
/**
 * Serviço de controle de orçamento.
 * Em um cenário real, conectaria com banco de dados ou Redis.
 * Aqui, usamos uma implementação em memória por instância.
 */
export class BudgetService {
  private readonly MAX_DAILY_COST = 5.00; // R$ 5,00
  private currentCost = 0;

  /**
   * Verifica se há orçamento suficiente para a operação.
   * @param estimatedCost Custo estimado da operação (mockado por enquanto)
   */
  async checkBudget(estimatedCost: number): Promise<boolean> {
    if (this.currentCost + estimatedCost > this.MAX_DAILY_COST) {
      return false;
    }
    return true;
  }

  /**
   * Deduz o custo do orçamento atual.
   */
  async consume(cost: number): Promise<void> {
    this.currentCost += cost;
  }

  getRemaining(): number {
    return Math.max(0, this.MAX_DAILY_COST - this.currentCost);
  }
}
EOF

# ------------------------------------------------------------------------------
# 4. Definir Schemas do Swagger (@mini-ide/server)
# HU-1.6 Server-OpenAPI
# ------------------------------------------------------------------------------
echo "📜 Criando definições OpenAPI..."

cat > packages/server/src/schemas.ts <<EOF
export const AnalyzeRequestSchema = {
  type: 'object',
  required: ['text'],
  properties: {
    text: { type: 'string', description: 'Código ou texto para analisar', example: 'Crie um CRUD em React' },
    maxLen: { type: 'number', description: 'Tamanho máximo do resumo', default: 100 }
  }
};

export const AnalyzeResponseSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    inputLength: { type: 'number' },
    outputLength: { type: 'number' },
    requestId: { type: 'string', format: 'uuid' },
    timestamp: { type: 'string', format: 'date-time' },
    budgetUsed: { type: 'number' },
    budgetRemaining: { type: 'number' }
  }
};
EOF

# ------------------------------------------------------------------------------
# 5. Atualizar Servidor Principal (Integration Hub)
# Conecta Swagger, Error Handler, Budget e Optimizer
# ------------------------------------------------------------------------------
echo "⚙️ Atualizando server/src/index.ts com Hardening..."

cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { AnalysisAgent } from '@mini-ide/analysis-agent';
import { PromptOptimizer } from '@mini-ide/analysis-agent/dist/utils/prompt-optimizer.js'; // Import via dist pois é cross-package
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
  }
});

// 1. Registro de Plugins (CORS e Swagger)
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
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

// 2. Global Error Handler (HU-1.3)
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  
  const statusCode = error.statusCode || 500;
  const message = error.statusCode ? error.message : 'Erro interno do servidor. Nossa equipe foi notificada.';
  
  reply.status(statusCode).send({
    error: true,
    message,
    requestId: request.id
  });
});

// 3. Rotas
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
      response: {
        200: AnalyzeResponseSchema
      }
    }
  },
  async (request, reply) => {
    const { text } = request.body;
    const costEstimate = 0.05; // Mock de custo

    // Validação de Negócio: Budget (HU-2.2)
    const canProceed = await budgetService.checkBudget(costEstimate);
    if (!canProceed) {
      return reply.code(402).send({ error: 'Payment Required', message: 'Orçamento diário excedido.' });
    }

    // Otimização de Prompt (HU-2.1)
    // Nota: Em produção, isso seria feito dentro do agente, mas expomos aqui para demonstrar a HU
    const optimizedText = PromptOptimizer.optimize(text);
    
    request.log.info({ 
      msg: 'Iniciando análise', 
      originalLength: text.length, 
      optimizedLength: optimizedText.length 
    });

    try {
      const response = await agent.process({ ...request.body, text: optimizedText });
      
      // Consumir budget e persistir
      await budgetService.consume(costEstimate);
      persistence.saveBundle(response).catch(err => request.log.error({ msg: 'Erro persistência', err }));

      // Injeta dados reais de budget na resposta
      response.budgetUsed = 5.00 - budgetService.getRemaining(); // Total usado
      response.budgetRemaining = budgetService.getRemaining();

      return response;
    } catch (error: any) {
      throw error; // Deixa o Global Error Handler pegar
    }
  }
);

// 4. Inicialização
const start = async () => {
  try {
    await persistence.init();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(\`🚀 Mini-IDE Server rodando em http://localhost:\${PORT}\`);
    console.log(\`📚 Documentação disponível em http://localhost:\${PORT}/docs\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF

# ------------------------------------------------------------------------------
# 6. Testes Unitários Novos
# ------------------------------------------------------------------------------
echo "🧪 Criando testes para Budget e Optimizer..."

mkdir -p packages/analysis-agent/test/utils
cat > packages/analysis-agent/test/utils/prompt-optimizer.test.ts <<EOF
import { describe, it, expect } from 'vitest';
import { PromptOptimizer } from '../../src/utils/prompt-optimizer';

describe('PromptOptimizer', () => {
  it('deve remover espaços extras', () => {
    const input = '  Ola    Mundo  ';
    const output = PromptOptimizer.optimize(input);
    expect(output).toBe('Ola Mundo');
  });

  it('deve truncar texto muito longo', () => {
    const input = 'A'.repeat(200);
    const output = PromptOptimizer.optimize(input, 50);
    expect(output.length).toBe(50);
  });
});
EOF

# Atualizar tsconfig do agent para incluir tests
tmp=$(mktemp)
jq '.include += ["test/**/*"]' packages/analysis-agent/tsconfig.json > "$tmp" && mv "$tmp" packages/analysis-agent/tsconfig.json


mkdir -p packages/server/test/services
cat > packages/server/test/services/budget.test.ts <<EOF
import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetService } from '../../src/services/budget';

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
    const allowed = await service.checkBudget(0.20); // 4.90 + 0.20 = 5.10 (> 5.00)
    expect(allowed).toBe(false);
  });
});
EOF

echo "✅ Fase 8 Implementada: Hardening completo."
echo "👉 Execute ./42_pipeline_checklist.sh"

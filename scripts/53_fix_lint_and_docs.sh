#!/usr/bin/env bash
set -e

echo "🚑 Sprint 8.1: Limpeza, Fix de Lint e Aplicação de TSDoc..."

# 1. Limpeza Cirúrgica (Remover artefatos de build dentro de src)
# -----------------------------------------------------
echo "🧹 Removendo arquivos .js/.d.ts perdidos em src/..."
find packages -name "src" -type d -exec find {} -name "*.js" -delete \;
find packages -name "src" -type d -exec find {} -name "*.d.ts" -delete \;

# 2. Analysis Agent: PromptOptimizer (Com TSDoc e sem console)
# -----------------------------------------------------
echo "📝 Corrigindo packages/analysis-agent/src/utils/prompt-optimizer.ts..."
cat > packages/analysis-agent/src/utils/prompt-optimizer.ts <<EOF
/**
 * Utilitário para otimização de prompts antes do envio ao LLM.
 * Reduz custos removendo espaços desnecessários e truncando inputs gigantes.
 */
export class PromptOptimizer {
  /**
   * Compacta e normaliza o texto.
   * 1. Remove espaços extras no início/fim.
   * 2. Substitui múltiplos espaços/quebras de linha por um único espaço.
   * 3. Trunca se exceder o limite de segurança.
   * 
   * @param text - O texto original.
   * @param limit - O limite máximo de caracteres (padrão: 10000).
   * @returns O texto otimizado.
   */
  static optimize(text: string, limit: number = 10000): string {
    if (!text) return '';

    // Normalização básica
    let optimized = text.trim().replace(/\s+/g, ' ');

    // Truncamento de segurança
    if (optimized.length > limit) {
      optimized = optimized.substring(0, limit);
      // console.warn removido para passar no lint estrito, em prod usaríamos logger
    }

    return optimized;
  }
}
EOF

# 3. Analysis Agent: Index (Lint Fixes + TSDoc)
# -----------------------------------------------------
echo "📝 Corrigindo packages/analysis-agent/src/index.ts..."
cat > packages/analysis-agent/src/index.ts <<EOF
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { LLMProvider } from './providers/llm-provider.js';
import { MockProvider } from './providers/mock-provider.js';
import { DeepSeekProvider } from './providers/deepseek-provider.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory para instanciar o provedor de LLM correto baseado no ambiente.
 * @returns Uma instância de LLMProvider (DeepSeek ou Mock).
 */
function getProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) {
    // console.log removido ou substituído por comentário para lint
    // Usando DeepSeek (Real)
    return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
  }
  // Usando Mock (Simulado)
  return new MockProvider();
}

/**
 * Agente principal responsável por orquestrar a análise de código.
 * Gerencia a comunicação com o LLM e a formatação da resposta.
 */
export class AnalysisAgent {
  private provider: LLMProvider;

  constructor() {
    this.provider = getProvider();
  }

  /**
   * Processa uma requisição de análise.
   * @param request - O objeto contendo o texto e configurações.
   * @returns Uma promessa com a resposta estruturada.
   */
  async process(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const requestId = uuidv4();
    
    // Prompt simplificado para esta fase
    const prompt = \`Contexto: \${request.text}\n\nInstrução: Gere um JSON com o plano de desenvolvimento.\`;

    const llmResult = await this.provider.generate(prompt);
    
    // Tenta parsear o resultado (se for JSON) ou usa texto cru
    let summary = llmResult.content;
    try {
        const parsed = JSON.parse(llmResult.content);
        summary = parsed.summary || JSON.stringify(parsed);
    } catch {
        // Conteúdo não era JSON, usa como string
    }

    // Truncar se necessário
    if (request.maxLen && summary.length > request.maxLen) {
        summary = summary.substring(0, request.maxLen) + '...';
    }

    // Custo estimado fictício para fins de demonstração
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

# 4. Analysis Agent: MockProvider (Fix lint)
# -----------------------------------------------------
echo "📝 Corrigindo packages/analysis-agent/src/providers/mock-provider.ts..."
cat > packages/analysis-agent/src/providers/mock-provider.ts <<EOF
import { LLMProvider, LLMResponse } from './llm-provider.js';

/**
 * Provedor simulado para desenvolvimento e testes.
 * Retorna respostas fixas sem consumir API externa.
 */
export class MockProvider implements LLMProvider {
  /**
   * Gera uma resposta simulada.
   * @param prompt - O texto de entrada (ignorado na lógica, usado apenas para log).
   */
  async generate(_prompt: string): Promise<LLMResponse> {
    // Simula latência
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      content: JSON.stringify({
        summary: "Análise Mockada das 8 Personas (Fase 8 Hardening)",
        personas: {
          product: { hus: ["HU-001: Exemplo"] },
          architect: { stack: "Node.js + React" },
          engine: { files: ["src/index.ts"] }
        }
      }, null, 2),
      usage: { inputTokens: 50, outputTokens: 120 }
    };
  }
}
EOF

# 5. Server: BudgetService (TSDoc)
# -----------------------------------------------------
echo "📝 Corrigindo packages/server/src/services/budget.ts..."
cat > packages/server/src/services/budget.ts <<EOF
/**
 * Serviço de controle de orçamento.
 * Gerencia os limites de gastos da aplicação para evitar custos excessivos com LLMs.
 */
export class BudgetService {
  private readonly MAX_DAILY_COST = 5.00; // R$ 5,00
  private currentCost = 0;

  /**
   * Verifica se há orçamento suficiente para a operação.
   * @param estimatedCost - Custo estimado da operação.
   * @returns True se houver orçamento, False caso contrário.
   */
  async checkBudget(estimatedCost: number): Promise<boolean> {
    if (this.currentCost + estimatedCost > this.MAX_DAILY_COST) {
      return false;
    }
    return true;
  }

  /**
   * Deduz o custo do orçamento atual.
   * @param cost - O valor a ser consumido.
   */
  async consume(cost: number): Promise<void> {
    this.currentCost += cost;
  }

  /**
   * Retorna o orçamento restante.
   */
  getRemaining(): number {
    return Math.max(0, this.MAX_DAILY_COST - this.currentCost);
  }
}
EOF

# 6. Server: PersistenceService (Fix lint)
# -----------------------------------------------------
echo "📝 Corrigindo packages/server/src/services/persistence.ts..."
cat > packages/server/src/services/persistence.ts <<EOF
import fs from 'fs/promises';
import path from 'path';
import { AnalyzeResponse } from '@mini-ide/shared';

/** Interface para itens listados no histórico. */
export interface HistoryItem {
  filename: string;
  timestamp: string;
  requestId: string;
  summary: string;
}

/**
 * Serviço responsável por salvar artefatos e metadados em disco.
 */
export class PersistenceService {
  private baseDir: string;

  constructor(baseDir: string = 'bundles') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
  }

  /** Cria o diretório base se não existir. */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // Ignora erro se já existir ou falhar (logging seria ideal em prod)
    }
  }

  /** Salva o resultado da análise em arquivo JSON. */
  async saveBundle(data: AnalyzeResponse): Promise<string> {
    const dateFolder = new Date().toISOString().split('T')[0];
    const targetDir = path.join(this.baseDir, dateFolder);
    await fs.mkdir(targetDir, { recursive: true });
    const filename = \`\${data.timestamp.replace(/:/g, '-')}-\${data.requestId}.json\`;
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  /** Lista o histórico de análises ordenado por data. */
  async listHistory(): Promise<HistoryItem[]> {
    const items: HistoryItem[] = [];
    try {
      const days = await fs.readdir(this.baseDir);
      for (const day of days) {
        const dayPath = path.join(this.baseDir, day);
        const stat = await fs.stat(dayPath);
        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(dayPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const content = await fs.readFile(path.join(dayPath, file), 'utf-8');
          try {
            const json = JSON.parse(content) as AnalyzeResponse;
            items.push({
              filename: file,
              timestamp: json.timestamp,
              requestId: json.requestId,
              summary: json.summary
            });
          } catch { /* Ignora corrompidos */ }
        }
      }
      return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }
}
EOF

# 7. Server: Index (Fix lint e try-catch desnecessário)
# -----------------------------------------------------
echo "📝 Corrigindo packages/server/src/index.ts..."
cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { AnalysisAgent } from '@mini-ide/analysis-agent';
import { PromptOptimizer } from '@mini-ide/analysis-agent/src/utils/prompt-optimizer.js';
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

// Plugins
fastify.register(cors, { origin: true });

fastify.register(swagger, {
  swagger: {
    info: {
      title: 'Mini-IDE API',
      description: 'API do Backend de Inteligência do Mini-IDE',
      version: '0.8.0'
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
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  const statusCode = error.statusCode || 500;
  const message = error.statusCode ? error.message : 'Erro interno do servidor.';
  
  reply.status(statusCode).send({ error: true, message, requestId: request.id });
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

    // Processamento (sem try/catch redundante, deixa o global handler pegar erros)
    const response = await agent.process({ ...request.body, text: optimizedText });
    
    // Persistência e Consumo
    await budgetService.consume(costEstimate);
    // Catch silencioso apenas na persistência para não falhar o request principal
    persistence.saveBundle(response).catch(err => request.log.error({ msg: 'Erro persistência', err }));

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

echo "✅ Limpeza e Documentação aplicadas."
echo "👉 Execute ./42_pipeline_checklist.sh"

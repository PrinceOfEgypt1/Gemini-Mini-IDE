#!/usr/bin/env bash
set -e

echo "🧠 Iniciando Fase 3: Inteligência e Orquestração..."

# 1. Instalar Dependências no Agente
# -----------------------------------------------------
echo "📦 Configurando @mini-ide/analysis-agent..."
pnpm --filter @mini-ide/analysis-agent add axios
pnpm --filter @mini-ide/analysis-agent add @mini-ide/shared@workspace:*

# 2. Criar a Lógica do Agente
# -----------------------------------------------------
echo "⚙️ Implementando Provider e Personas..."

mkdir -p packages/analysis-agent/src/providers

# Interface do Provider LLM
cat > packages/analysis-agent/src/providers/llm-provider.ts <<EOF
export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMProvider {
  generate(prompt: string): Promise<LLMResponse>;
}
EOF

# Implementação Mock (Para desenvolvimento sem custos)
cat > packages/analysis-agent/src/providers/mock-provider.ts <<EOF
import { LLMProvider, LLMResponse } from './llm-provider.js';

export class MockProvider implements LLMProvider {
  async generate(prompt: string): Promise<LLMResponse> {
    console.log('[MockProvider] Recebido prompt de ' + prompt.length + ' chars');
    
    // Simula latência de "pensamento"
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      content: JSON.stringify({
        summary: "Análise Mockada das 8 Personas",
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

# Implementação DeepSeek (Real)
cat > packages/analysis-agent/src/providers/deepseek-provider.ts <<EOF
import axios from 'axios';
import { LLMProvider, LLMResponse } from './llm-provider.js';

export class DeepSeekProvider implements LLMProvider {
  private apiKey: string;
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

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
    } catch (error: any) {
      console.error('Erro na chamada DeepSeek:', error.response?.data || error.message);
      throw new Error('Falha na geração do LLM');
    }
  }
}
EOF

# Orquestrador Principal
cat > packages/analysis-agent/src/index.ts <<EOF
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { LLMProvider } from './providers/llm-provider.js';
import { MockProvider } from './providers/mock-provider.js';
import { DeepSeekProvider } from './providers/deepseek-provider.js';
import { v4 as uuidv4 } from 'uuid';

// Factory para escolher o provider
function getProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('🔌 Usando Provider: DeepSeek (Real)');
    return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
  }
  console.log('🔌 Usando Provider: Mock (Simulado)');
  return new MockProvider();
}

export class AnalysisAgent {
  private provider: LLMProvider;

  constructor() {
    this.provider = getProvider();
  }

  async process(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Aqui montariamos o prompt complexo com as 8 personas
    // Por enquanto, passamos direto
    const prompt = \`Contexto: \${request.text}\n\nInstrução: Gere um JSON com o plano de desenvolvimento.\`;

    const llmResult = await this.provider.generate(prompt);
    
    // Tenta parsear o resultado (se for JSON) ou usa texto cru
    let summary = llmResult.content;
    try {
        const parsed = JSON.parse(llmResult.content);
        summary = parsed.summary || JSON.stringify(parsed);
    } catch (e) {
        // Conteúdo não era JSON, usa como string
    }

    // Truncar se necessário
    if (request.maxLen && summary.length > request.maxLen) {
        summary = summary.substring(0, request.maxLen) + '...';
    }

    return {
      requestId,
      summary,
      inputLength: request.text.length,
      outputLength: llmResult.content.length,
      timestamp: new Date().toISOString(),
      budgetUsed: (llmResult.usage.inputTokens + llmResult.usage.outputTokens) * 0.00001, // Custo estimado fictício
      budgetRemaining: 100 // Placeholder
    };
  }
}
EOF

# Rebuild do agente
echo "🏗️ Compilando analysis-agent..."
pnpm --filter @mini-ide/analysis-agent build


# 3. Conectar Servidor ao Agente
# -----------------------------------------------------
echo "🔗 Conectando Server -> Agent..."

# Adiciona dependência
pnpm --filter @mini-ide/server add @mini-ide/analysis-agent@workspace:*

# Atualiza o index.ts do servidor para usar a classe AnalysisAgent
cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
// Importa o Agente real
import { AnalysisAgent } from '@mini-ide/analysis-agent';

const PORT = Number(process.env.PORT) || 3200;
const agent = new AnalysisAgent();

const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
    }
  }
});

fastify.register(cors, { origin: true });

fastify.get('/healthz', async () => {
  return { status: 'ok', uptime: process.uptime() };
});

fastify.post<{ Body: AnalyzeRequest; Reply: AnalyzeResponse | { error: string } }>('/analyze', async (request, reply) => {
  const { text } = request.body;

  if (!text || text.trim().length === 0) {
    return reply.code(400).send({ error: 'Text is required' });
  }

  request.log.info({ msg: 'Delegating to AnalysisAgent', inputLength: text.length });

  try {
    // Chama o agente (que decide se usa Mock ou LLM Real)
    const response = await agent.process(request.body);
    return response;
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal Processing Error' });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(\`🚀 Mini-IDE Server rodando em http://localhost:\${PORT}\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF

echo "✅ Fase 3 concluída: O Cérebro está conectado!"
echo "👉 Execute ./42_pipeline_checklist.sh para validar."
echo "💡 DICA: Para usar IA real, rode: export DEEPSEEK_API_KEY='sua-chave' antes do checklist."

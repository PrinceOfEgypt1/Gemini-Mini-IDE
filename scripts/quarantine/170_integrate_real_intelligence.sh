#!/usr/bin/env bash
set -e

echo "🧠 [Phase 14] Iniciando Integração da Inteligência Real (Frontend -> Server -> LLM)..."

# ==============================================================================
# 1. Preparar o Agente (Instalar Cliente OpenAI)
# Usaremos a lib oficial da OpenAI, que é compatível com DeepSeek, Google e Ollama
# ==============================================================================
echo "📦 Instalando SDK OpenAI no analysis-agent..."
pnpm --filter @mini-ide/analysis-agent add openai

# ==============================================================================
# 2. Implementar o Cérebro (AnalysisAgent)
# Criamos uma implementação robusta que aceita config dinâmica
# ==============================================================================
echo "📝 Criando packages/analysis-agent/src/agent.ts..."

cat > packages/analysis-agent/src/agent.ts <<EOF
import OpenAI from 'openai';
import { z } from 'zod';
import { ConsolidatorService } from './services/consolidator-service';

export interface AgentConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// Schema de Resposta Esperado do LLM (Formato JSON estrito)
const ResponseSchema = z.object({
  summary: z.string(),
  product: z.object({
    userStories: z.array(z.object({
      id: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
      priority: z.string()
    }))
  }),
  engine: z.object({
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      language: z.string().optional()
    }))
  })
});

export class AnalysisAgent {
  private openai: OpenAI;
  private model: string;
  private consolidator: ConsolidatorService;

  constructor(config: AgentConfig, tempDir: string) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    });
    this.model = config.model;
    this.consolidator = new ConsolidatorService(tempDir);
  }

  async execute(userPrompt: string) {
    console.log(\`🤖 Agente iniciando análise com modelo: \${this.model}\`);

    const systemPrompt = \`
      Você é a Mini-IDE, um arquiteto de software sênior e gerador de código.
      Sua missão é receber uma ideia de software e gerar:
      1. Histórias de Usuário (Product).
      2. Código funcional completo (Engine).
      
      Regras:
      - Responda APENAS com um JSON válido.
      - Não inclua markdown code blocks (\`\`\`) no início ou fim.
      - O JSON deve seguir estritamente esta estrutura:
      {
        "summary": "Resumo executivo do que foi feito",
        "product": { "userStories": [...] },
        "engine": { "files": [{ "path": "src/index.js", "content": "..." }] }
      }
    \`;

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: this.model,
        response_format: { type: "json_object" }, // Força JSON se o modelo suportar
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("LLM retornou resposta vazia.");

      // Parse e Validação
      const rawJson = JSON.parse(content);
      const parsedData = ResponseSchema.parse(rawJson);

      // Materialização (Salvar arquivos no tempDir para o servidor zipar)
      await this.consolidator.saveArtifacts(parsedData);

      return {
        ...parsedData,
        requestId: completion.id,
        timestamp: new Date().toISOString(),
        // Estimativa simples
        inputLength: userPrompt.length,
        outputLength: content.length
      };

    } catch (error) {
      console.error("❌ Erro no Agente:", error);
      throw error;
    }
  }
}
EOF

# Atualizar export do index do agente
echo "export { AnalysisAgent } from './agent';" >> packages/analysis-agent/src/index.ts

# ==============================================================================
# 3. Atualizar Frontend (API Service)
# Enviar Headers de Modelo e URL
# ==============================================================================
echo "📝 Atualizando packages/ui/src/services/api.ts..."

cat > packages/ui/src/services/api.ts <<EOF
const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const apiKey = localStorage.getItem('mini-ide-api-key');
  const model = localStorage.getItem('mini-ide-model');
  const baseUrl = localStorage.getItem('mini-ide-base-url');

  if (apiKey) headers['Authorization'] = \`Bearer \${apiKey}\`;
  if (model) headers['X-LLM-Model'] = model;
  if (baseUrl) headers['X-LLM-Base-Url'] = baseUrl;
  
  return headers;
};

export const api = {
  exportProjectZip: async (projectData: unknown) => {
    try {
      const response = await fetch(\`\${API_BASE_URL}/export\`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ projectData }),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Não autorizado: Verifique sua API Key.');
        throw new Error(\`Erro na exportação: \${response.statusText}\`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mini-ide-project.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Falha no download:', error);
      throw error;
    }
  },

  analyze: async (text: string) => {
    try {
      const response = await fetch(\`\${API_BASE_URL}/analyze\`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, maxLen: 2000 }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('API Key inválida ou ausente.');
        throw new Error(errData.error || \`Erro no servidor: \${response.statusText}\`);
      }

      return await response.json();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro na análise:', error);
      throw error;
    }
  }
};
EOF

# ==============================================================================
# 4. Atualizar Servidor (Backend)
# Conectar a rota /analyze ao Agente Real
# ==============================================================================
echo "📝 Atualizando packages/server/src/index.ts..."

cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { ExportController } from './controllers/export.controller';
import { AnalysisAgent } from '@mini-ide/analysis-agent';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
    redact: ['req.headers.authorization'],
  },
});

async function bootstrap() {
  await server.register(cors, { 
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-LLM-Model', 'X-LLM-Base-Url'],
    credentials: false
  });
  
  await server.register(swagger, {
    swagger: { info: { title: 'Mini-IDE Server', version: '0.12.0' } }
  });
  await server.register(swaggerUi, { routePrefix: '/docs' });

  server.get('/healthz', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Rota de Análise REAL
  server.post<{ Body: { text: string } }>('/analyze', async (req, reply) => {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    const model = (req.headers['x-llm-model'] as string) || 'gpt-4o';
    const baseUrl = req.headers['x-llm-base-url'] as string;

    if (!apiKey) {
      return reply.status(401).send({ error: 'API Key não fornecida.' });
    }

    // Diretório temporário para esta execução
    const runId = Date.now().toString();
    const tempDir = path.join(os.tmpdir(), \`mini-ide-run-\${runId}\`);

    try {
      const agent = new AnalysisAgent({ apiKey, model, baseUrl }, tempDir);
      
      req.log.info({ model }, 'Iniciando análise com IA...');
      const result = await agent.execute(req.body.text);
      
      return result;

    } catch (error: any) {
      req.log.error(error, 'Falha na IA');
      return reply.status(500).send({ 
        error: 'Falha no processamento da IA', 
        details: error.message 
      });
    } finally {
      // Cleanup silencioso
      fs.rm(tempDir, { recursive: true, force: true }, () => {});
    }
  });

  server.post('/export', ExportController.downloadZip);

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
# 5. Validação
# ==============================================================================
echo "🏗️  Reconstruindo Backend e Agent..."
pnpm --filter @mini-ide/analysis-agent build
pnpm --filter @mini-ide/server build

echo "✅ INTEGRAÇÃO COMPLETA REALIZADA!"
echo "⚠️  IMPORTANTE: Reinicie o servidor (pnpm dev) para ativar a IA real."
EOF

chmod +x scripts/170_integrate_real_intelligence.sh

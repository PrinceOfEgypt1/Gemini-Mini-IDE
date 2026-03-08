#!/usr/bin/env bash
set -e

echo "🚀 Iniciando Fase 2: Motor de Análise e Contratos..."

# ------------------------------------------------------------------------------
# 1. Definir Contratos Compartilhados (@mini-ide/shared)
# O 'shared' é a fonte da verdade. Frontend e Backend dependerão dele.
# ------------------------------------------------------------------------------
echo "📦 Criando contratos de API em @mini-ide/shared..."

mkdir -p packages/shared/src/types

# Contrato de Resposta (HU-1.7)
cat > packages/shared/src/types/analyze-response.ts <<EOF
export interface AnalyzeResponse {
  summary: string;
  inputLength: number;
  outputLength: number;
  requestId: string;
  timestamp: string;
  budgetUsed?: number;
  budgetRemaining?: number;
}
EOF

# Contrato de Requisição
cat > packages/shared/src/types/analyze-request.ts <<EOF
export interface AnalyzeRequest {
  text: string;
  maxLen?: number;
}
EOF

# Exportar tudo no index
cat > packages/shared/src/index.ts <<EOF
export * from './types/analyze-response.js';
export * from './types/analyze-request.js';
EOF

# Rebuild do shared para garantir que os tipos estejam disponíveis
echo "🏗️ Compilando pacote shared..."
pnpm --filter @mini-ide/shared build


# ------------------------------------------------------------------------------
# 2. Configurar Dependências do Servidor
# ------------------------------------------------------------------------------
echo "🔗 Instalando dependências do Servidor..."

# Vincula o pacote shared localmente
pnpm --filter @mini-ide/server add @mini-ide/shared@workspace:*

# Instala libs de produção
pnpm --filter @mini-ide/server add fastify @fastify/cors uuid

# Instala libs de desenvolvimento (types e logger bonito para dev)
pnpm --filter @mini-ide/server add -D @types/uuid pino-pretty


# ------------------------------------------------------------------------------
# 3. Implementar Servidor Robusto (@mini-ide/server)
# Substitui o "Hello World" por uma estrutura profissional
# ------------------------------------------------------------------------------
echo "⚙️ Implementando servidor Fastify com validação e tipos..."

cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';
// Importando o contrato compartilhado para garantir tipagem forte
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';

const PORT = Number(process.env.PORT) || 3200;

// Configuração de Logs Estruturados (HU-1.5)
// Em produção, usa JSON puro. Em dev, usa pino-pretty.
const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
    }
  }
});

// Registrar CORS para permitir chamadas do Frontend (futuro)
fastify.register(cors, { origin: true });

// Endpoint Healthz (HU-1.4)
fastify.get('/healthz', async () => {
  return { status: 'ok', uptime: process.uptime() };
});

// Endpoint Analyze (HU-1.1) com Tipagem Genérica do Fastify
fastify.post<{ Body: AnalyzeRequest; Reply: AnalyzeResponse | { error: string } }>('/analyze', async (request, reply) => {
  const { text, maxLen = 100 } = request.body;
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();

  // Validação de Contrato (HU-1.2)
  if (!text || text.trim().length === 0) {
    request.log.warn({ requestId }, 'Tentativa de análise com texto vazio');
    return reply.code(400).send({ error: 'Text is required' });
  }

  // Log estruturado da operação (HU-1.5)
  request.log.info({ 
    requestId, 
    msg: 'Processing analysis request', 
    inputLength: text.length,
    maxLen 
  });

  // Simulação de Inteligência (Mock)
  // Na Fase 3, isso será substituído pela chamada ao DeepSeek
  const mockSummary = \`[MOCK] Análise do ID \${requestId.slice(0, 4)}: O texto recebido tem \${text.length} caracteres. Fim.\`;
  
  // Garantir que respeitamos o maxLen solicitado
  const finalSummary = mockSummary.substring(0, maxLen);

  const response: AnalyzeResponse = {
    summary: finalSummary,
    inputLength: text.length,
    outputLength: finalSummary.length,
    requestId,
    timestamp,
    budgetUsed: 0.00, // Placeholder para métricas futuras
    budgetRemaining: 100.00
  };

  return response;
});

// Inicialização
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

echo "✅ Fase 2 concluída: Backend estruturado e tipado!"
echo "👉 Próximo passo: Rode './42_pipeline_checklist.sh' para validar que o contrato está sendo cumprido."

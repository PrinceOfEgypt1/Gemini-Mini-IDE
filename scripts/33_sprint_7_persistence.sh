#!/usr/bin/env bash
set -e

echo "💾 Iniciando Fase 7: Persistência e Histórico..."

# ------------------------------------------------------------------------------
# 1. Serviço de Persistência (@mini-ide/server)
# Implementa HU-6.1 e HU-6.2
# ------------------------------------------------------------------------------
echo "⚙️ Criando PersistenceService..."
mkdir -p packages/server/src/services

cat > packages/server/src/services/persistence.ts <<EOF
import fs from 'fs/promises';
import path from 'path';
import { AnalyzeResponse } from '@mini-ide/shared';

/**
 * Serviço responsável por salvar artefatos e metadados em disco.
 * Garante que o trabalho do agente não seja perdido.
 */
export class PersistenceService {
  private baseDir: string;

  /**
   * Cria uma instância do serviço de persistência.
   * @param baseDir - Diretório raiz onde os bundles serão salvos.
   */
  constructor(baseDir: string = 'bundles') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
  }

  /**
   * Inicializa o diretório de armazenamento se não existir.
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório de bundles:', error);
      throw error;
    }
  }

  /**
   * Salva o resultado de uma análise como um arquivo JSON.
   * O arquivo é nomeado com o timestamp e o ID da requisição.
   * 
   * @param data - O objeto de resposta da análise.
   * @returns O caminho absoluto do arquivo salvo.
   */
  async saveBundle(data: AnalyzeResponse): Promise<string> {
    // Cria uma pasta para o dia (YYYY-MM-DD) para organização
    const dateFolder = new Date().toISOString().split('T')[0];
    const targetDir = path.join(this.baseDir, dateFolder);
    
    await fs.mkdir(targetDir, { recursive: true });

    const filename = \`\${data.timestamp.replace(/:/g, '-')}-\${data.requestId}.json\`;
    const filePath = path.join(targetDir, filename);

    const fileContent = JSON.stringify(data, null, 2);
    
    await fs.writeFile(filePath, fileContent, 'utf-8');
    
    return filePath;
  }
}
EOF

# ------------------------------------------------------------------------------
# 2. Integração no Servidor (@mini-ide/server)
# Atualiza o index.ts para usar o serviço de persistência
# ------------------------------------------------------------------------------
echo "🔗 Integrando Persistência ao Servidor..."

cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { AnalysisAgent } from '@mini-ide/analysis-agent';
import { PersistenceService } from './services/persistence.js';

const PORT = Number(process.env.PORT) || 3200;

// Inicializa serviços
const agent = new AnalysisAgent();
const persistence = new PersistenceService();

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

  request.log.info({ msg: 'Iniciando análise', inputLength: text.length });

  try {
    // 1. Processamento (IA/Mock)
    const response = await agent.process(request.body);

    // 2. Persistência (Background - não bloqueia, mas loga erro se falhar)
    persistence.saveBundle(response)
      .then((path) => request.log.info({ msg: 'Bundle salvo', path }))
      .catch((err) => request.log.error({ msg: 'Erro ao salvar bundle', err }));

    return response;
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal Processing Error' });
  }
});

const start = async () => {
  try {
    // Garante que a pasta de bundles existe
    await persistence.init();
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(\`🚀 Mini-IDE Server rodando em http://localhost:\${PORT}\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF

# ------------------------------------------------------------------------------
# 3. Testes Unitários da Persistência
# Garante qualidade (Regra 6 do Prompt-Mestre)
# ------------------------------------------------------------------------------
echo "🧪 Criando testes para PersistenceService..."
mkdir -p packages/server/test/services

cat > packages/server/test/services/persistence.test.ts <<EOF
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { PersistenceService } from '../../src/services/persistence';
import { AnalyzeResponse } from '@mini-ide/shared';

const TEST_DIR = path.join(__dirname, 'test-bundles');

describe('PersistenceService', () => {
  const service = new PersistenceService(TEST_DIR);

  beforeAll(async () => {
    await service.init();
  });

  afterEach(async () => {
    // Limpeza após cada teste
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it('deve salvar o arquivo JSON corretamente', async () => {
    const mockData: AnalyzeResponse = {
      summary: 'Teste',
      inputLength: 5,
      outputLength: 5,
      requestId: '123-abc',
      timestamp: new Date().toISOString(),
      budgetUsed: 0,
      budgetRemaining: 100
    };

    const savedPath = await service.saveBundle(mockData);

    // Verifica se o arquivo existe
    const fileExists = await fs.stat(savedPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Verifica conteúdo
    const content = await fs.readFile(savedPath, 'utf-8');
    const json = JSON.parse(content);
    expect(json.requestId).toBe('123-abc');
  });
});
EOF

# Atualizar tsconfig.json do server para incluir a pasta test
echo "⚙️ Ajustando tsconfig do server para testes..."
tmp=$(mktemp)
jq '.include += ["test/**/*"]' packages/server/tsconfig.json > "$tmp" && mv "$tmp" packages/server/tsconfig.json

echo "✅ Fase 7 (Backend Persistence) implementada."
echo "👉 Execute ./42_pipeline_checklist.sh para validar a persistência e os testes."

#!/usr/bin/env bash
set -e

echo "🔒 [Phase 12] Implementando fluxo seguro de API Key (Frontend -> Backend)..."

# ==============================================================================
# 1. Atualizar o Cliente de API (Frontend)
# Agora ele deve ler a chave do localStorage e anexar no Header
# ==============================================================================
echo "📝 Atualizando packages/ui/src/services/api.ts..."

cat > packages/ui/src/services/api.ts <<EOF
const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

// Helper para pegar headers com autenticação
const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const apiKey = localStorage.getItem('mini-ide-api-key');
  if (apiKey) {
    headers['Authorization'] = \`Bearer \${apiKey}\`;
  }
  
  return headers;
};

export const api = {
  /**
   * Solicita a exportação do projeto como ZIP
   * @param projectData Dados do projeto (HUs, código, etc)
   */
  exportProjectZip: async (projectData: unknown) => {
    try {
      const response = await fetch(\`\${API_BASE_URL}/export\`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ projectData }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Não autorizado: Verifique sua API Key em Preferências.');
        }
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

  /**
   * Envia texto para análise (LLM)
   * @param text Texto do usuário
   */
  analyze: async (text: string) => {
    try {
      const response = await fetch(\`\${API_BASE_URL}/analyze\`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, maxLen: 2000 }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API Key ausente ou inválida. Configure em Preferências.');
        }
        throw new Error('Falha na análise.');
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
# 2. Atualizar o Servidor (Backend)
# Adicionar hook 'onRequest' para logar auditoria (mas OFUSCAR a chave)
# ==============================================================================
echo "📝 Atualizando packages/server/src/index.ts..."

cat > packages/server/src/index.ts <<EOF
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'node:crypto';
import { ExportController } from './controllers/export.controller';

// Configuração do Logger com Redact para segurança
const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
    // HU-Sec-API-Key-Handling-001: Redact headers sensíveis
    redact: ['req.headers.authorization'],
  },
});

async function bootstrap() {
  // 1. CORS
  await server.register(cors, { 
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: false
  });
  
  // 2. Swagger
  await server.register(swagger, {
    swagger: {
      info: { title: 'Mini-IDE Server', version: '0.11.0' },
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    }
  });
  await server.register(swaggerUi, { routePrefix: '/docs' });

  // 3. Middleware de Segurança (Hook Global)
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      // Log de auditoria seguro: registra QUE veio uma chave, mas não QUAL chave
      request.log.info({ authenticated: true }, 'Requisição autenticada recebida');
    } else {
      // Opcional: Logar acesso anônimo
      request.log.info({ authenticated: false }, 'Requisição anônima (sem chave)');
    }
  });

  // 4. Routes
  server.get('/healthz', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  server.post('/analyze', async (req, reply) => {
    // Simulação
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Aqui no futuro injetaremos a chave no AnalysisAgent
    // const apiKey = req.headers.authorization?.replace('Bearer ', '');

    return {
      summary: "Análise simulada com sucesso (Security Ready).",
      inputLength: 150,
      outputLength: 300,
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      budgetUsed: 0.00,
      budgetRemaining: 10.00,
      status: "success" 
    };
  });

  server.post('/export', ExportController.downloadZip);

  // Start
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
# 3. Validação
# ==============================================================================
echo "🛡️  Validando alterações de segurança..."
pnpm --filter @mini-ide/ui lint
pnpm --filter @mini-ide/server build

echo "✅ Fluxo seguro implementado."
echo "⚠️  LEMBRETE: Reinicie o servidor (pnpm dev) para aplicar o novo middleware!"
EOF

chmod +x scripts/140_implement_secure_apikey_flow.sh

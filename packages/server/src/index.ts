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
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();

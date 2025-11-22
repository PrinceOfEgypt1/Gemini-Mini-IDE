import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { AnalysisAgent } from '@mini-ide/analysis-agent';
import { PersistenceService } from './services/persistence.js';
import path from 'path';

const PORT = Number(process.env.PORT) || 3200;
const agent = new AnalysisAgent();
const persistence = new PersistenceService();

const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      targets: [
        { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } },
        { 
          target: 'pino-roll', 
          options: { 
            file: path.join(process.cwd(), 'logs', 'audit.log'),
            size: '10m',
            interval: '1d',
            mkdir: true
          } 
        }
      ]
    }
  }
});

fastify.register(cors, { origin: true });

fastify.get('/healthz', async () => {
  return { status: 'ok', uptime: process.uptime() };
});

// NOVA ROTA: Histórico
fastify.get('/analyze/history', async () => {
  const history = await persistence.listHistory();
  return history;
});

fastify.post<{ Body: AnalyzeRequest; Reply: AnalyzeResponse | { error: string } }>('/analyze', async (request, reply) => {
  const { text } = request.body;
  if (!text || text.trim().length === 0) return reply.code(400).send({ error: 'Text is required' });

  request.log.info({ msg: 'Iniciando análise', inputLength: text.length });

  try {
    const response = await agent.process(request.body);
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
    await persistence.init();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Mini-IDE Server rodando em http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

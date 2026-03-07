#!/usr/bin/env bash
set -e

echo "🏗️ [Phase 11] Implementando Endpoint de Exportação (ZIP) no Backend..."

# ==============================================================================
# 1. Instalar 'archiver' no Server
# Necessário para gerar o ZIP on-the-fly
# ==============================================================================
echo "📦 Instalando archiver no server..."
# Adiciona dependência e seus tipos
pnpm --filter @mini-ide/server add archiver
pnpm --filter @mini-ide/server add -D @types/archiver

# ==============================================================================
# 2. Criar o ExportController
# Lógica: JSON -> Files (Consolidator) -> ZIP (Archiver) -> HTTP Response
# ==============================================================================
mkdir -p packages/server/src/controllers
echo "📝 Criando packages/server/src/controllers/export.controller.ts..."

cat > packages/server/src/controllers/export.controller.ts <<EOF
import { FastifyRequest, FastifyReply } from 'fastify';
import { ConsolidatorService } from '@mini-ide/analysis-agent';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

// Schema de validação da entrada (o mesmo JSON que o LLM gera)
const ExportRequestSchema = z.object({
  projectData: z.object({
    product: z.any().optional(),
    engine: z.any().optional()
  })
});

export class ExportController {
  static async downloadZip(req: FastifyRequest, reply: FastifyReply) {
    // 1. Validar Input
    const parseResult = ExportRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid project data', details: parseResult.error });
    }

    const { projectData } = parseResult.data;
    
    // 2. Preparar diretório temporário único para esta requisição
    const runId = Date.now().toString(); // Em prod, usar UUID
    const tempDir = path.join(os.tmpdir(), \`mini-ide-export-\${runId}\`);
    
    try {
      // 3. Usar ConsolidatorService para materializar os arquivos
      // O Consolidator é agnóstico de HTTP, ele só escreve em disco
      const consolidator = new ConsolidatorService(tempDir);
      await consolidator.saveArtifacts(projectData);

      // 4. Configurar Header para Download
      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', \`attachment; filename="mini-ide-project-\${runId}.zip"\`);

      // 5. Criar Stream de ZIP
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      // Pipe do arquivo zip direto para a resposta HTTP
      archive.pipe(reply.raw);

      // Adicionar o conteúdo da pasta temporária ao ZIP
      archive.directory(tempDir, false);

      // Finalizar (isso fecha o stream e envia a resposta)
      await archive.finalize();

    } catch (error) {
      req.log.error(error, 'Erro na exportação');
      return reply.status(500).send({ error: 'Failed to generate export' });
    } finally {
      // 6. Limpeza (Cleanup) - Importante para não encher o disco do servidor
      // Nota: Em produção, isso deve ser feito após o stream terminar ou via cron job
      // Aqui fazemos um cleanup assíncrono "best effort" após um delay curto
      setTimeout(() => {
        fs.rm(tempDir, { recursive: true, force: true }, (err) => {
          if (err) console.error(\`Failed to cleanup temp dir \${tempDir}\`, err);
        });
      }, 5000); 
    }
  }
}
EOF

# ==============================================================================
# 3. Registrar Rota no Server
# Atualiza o index.ts para incluir a nova rota
# ==============================================================================
echo "🔄 Atualizando packages/server/src/index.ts..."

cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ExportController } from './controllers/export.controller';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

async function bootstrap() {
  // Plugins
  await server.register(cors, { origin: '*' });
  
  await server.register(swagger, {
    swagger: {
      info: { title: 'Mini-IDE Server', version: '0.1.0' }
    }
  });
  await server.register(swaggerUi, { routePrefix: '/docs' });

  // Routes
  server.get('/healthz', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Endpoint de Análise (Placeholder para futura integração com LLM)
  server.post('/analyze', async (req, reply) => {
    // TODO: Conectar com AnalysisService real na próxima Sprint
    return { status: 'mock_analysis_complete' };
  });

  // Endpoint de Exportação (NOVO)
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
# 4. Validação
# ==============================================================================
echo "🛡️  Validando implementação do backend..."

echo "   > Build Server..."
pnpm --filter @mini-ide/server build

echo "✅ Endpoint /export implementado com sucesso."
EOF

chmod +x scripts/120_implement_export_backend.sh

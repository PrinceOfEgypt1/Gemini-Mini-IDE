#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Resetando integridade estrutural do Servidor..."

SERVER_DIR="packages/server"

# ==============================================================================
# 1. Limpeza Prévia (Matar processo e apagar dist)
# ==============================================================================
echo "🧹 Limpando artefatos antigos..."
# Tenta matar qualquer coisa na porta 3200
fuser -k 3200/tcp || true
# Apaga a pasta de distribuição para garantir que não sobrou lixo
rm -rf "$SERVER_DIR/dist"
rm -f "$SERVER_DIR/tsconfig.tsbuildinfo"

# ==============================================================================
# 2. Recriar Diretório de Controllers
# ==============================================================================
mkdir -p "$SERVER_DIR/src/controllers"

# ==============================================================================
# 3. Restaurar 'export.controller.ts' (Código da Sprint 11.3)
# Garantimos que o arquivo fonte existe fisicamente
# ==============================================================================
echo "📝 Restaurando packages/server/src/controllers/export.controller.ts..."
cat > "$SERVER_DIR/src/controllers/export.controller.ts" <<EOF
import { FastifyRequest, FastifyReply } from 'fastify';
import { ConsolidatorService } from '@mini-ide/analysis-agent';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

const ExportRequestSchema = z.object({
  projectData: z.object({
    product: z.any().optional(),
    engine: z.any().optional()
  })
});

export class ExportController {
  static async downloadZip(req: FastifyRequest, reply: FastifyReply) {
    const parseResult = ExportRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid project data', details: parseResult.error });
    }

    const { projectData } = parseResult.data;
    const runId = Date.now().toString();
    const tempDir = path.join(os.tmpdir(), \`mini-ide-export-\${runId}\`);
    
    try {
      const consolidator = new ConsolidatorService(tempDir);
      await consolidator.saveArtifacts(projectData);

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', \`attachment; filename="mini-ide-project-\${runId}.zip"\`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(reply.raw);
      archive.directory(tempDir, false);
      await archive.finalize();

    } catch (error) {
      req.log.error(error, 'Erro na exportação');
      return reply.status(500).send({ error: 'Failed to generate export' });
    } finally {
      setTimeout(() => {
        fs.rm(tempDir, { recursive: true, force: true }, () => {});
      }, 5000); 
    }
  }
}
EOF

# ==============================================================================
# 4. Restaurar 'index.ts' (Com Fix de CORS da Sprint 11.3)
# ==============================================================================
echo "📝 Restaurando packages/server/src/index.ts..."
cat > "$SERVER_DIR/src/index.ts" <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'node:crypto';
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
  // CORS Fix: Permissivo para desenvolvimento local
  await server.register(cors, { 
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: false
  });
  
  await server.register(swagger, {
    swagger: {
      info: { title: 'Mini-IDE Server', version: '0.1.0' }
    }
  });
  await server.register(swaggerUi, { routePrefix: '/docs' });

  server.get('/healthz', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  server.post('/analyze', async (req, reply) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      summary: "Análise simulada com sucesso.",
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
# 5. Garantir TSConfig correto (Include src/**/*)
# ==============================================================================
echo "⚙️  Garantindo tsconfig.json do servidor..."
cat > "$SERVER_DIR/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" },
    { "path": "../analysis-agent" }
  ]
}
EOF

# ==============================================================================
# 6. Compilação e Verificação
# ==============================================================================
echo "🏗️  Compilando servidor (Clean Build)..."
pnpm --filter @mini-ide/server build

echo "🔎 Verificando arquivos gerados..."
if [ -f "$SERVER_DIR/dist/index.js" ] && [ -f "$SERVER_DIR/dist/controllers/export.controller.js" ]; then
    echo "✅ SUCESSO: Todos os arquivos JS foram gerados corretamente em dist/."
else
    echo "❌ ERRO CRÍTICO: Arquivos faltando em dist/. Listando conteúdo:"
    ls -R "$SERVER_DIR/dist"
    exit 1
fi

echo "✅ Integridade restaurada. Pode rodar o checklist."

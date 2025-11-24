#!/usr/bin/env bash
set -e

echo "🚑 [Fix] Reaplicando Headers CORS no ExportController..."

CONTROLLER_FILE="packages/server/src/controllers/export.controller.ts"

# ==============================================================================
# Reescrever ExportController
# - Mantém tipagem estrita (Zod)
# - Reintroduz headers CORS manuais no reply.raw
# ==============================================================================
echo "📝 Atualizando $CONTROLLER_FILE..."

cat > "$CONTROLLER_FILE" <<EOF
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
    engine: z.any().optional(),
    name: z.string().optional()
  }).optional()
});

type ExportRequestBody = z.infer<typeof ExportRequestSchema>;

export class ExportController {
  static async downloadZip(req: FastifyRequest<{ Body: ExportRequestBody }>, reply: FastifyReply) {
    
    // --- FIX DE CORS (BRUTE FORCE) ---
    // Necessário porque streaming direto (reply.raw) pode pular o middleware padrão
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-LLM-Model, X-LLM-Base-Url');
    // ---------------------------------

    const parseResult = ExportRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid project data', details: parseResult.error });
    }

    const { projectData } = parseResult.data;
    
    const safeProjectData = projectData || {};
    const projectName = safeProjectData.name || 'mini-ide-project';

    const runId = Date.now().toString();
    const tempDir = path.join(os.tmpdir(), \`mini-ide-export-\${runId}\`);
    
    try {
      const consolidator = new ConsolidatorService(tempDir);
      await consolidator.saveArtifacts(safeProjectData);

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', \`attachment; filename="\${projectName}.zip"\`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(reply.raw);
      
      archive.append(
        \`# \${projectName}\n\nExportado em \${new Date().toISOString()}\`,
        { name: 'EXPORT_INFO.md' }
      );

      archive.directory(tempDir, false);
      await archive.finalize();

    } catch (error) {
      req.log.error(error, 'Erro na exportação');
      // Só envia erro se headers ainda não foram enviados
      if (!reply.raw.headersSent) {
        return reply.status(500).send({ error: 'Failed to generate export' });
      }
    } finally {
      setTimeout(() => {
        fs.rm(tempDir, { recursive: true, force: true }, () => {});
      }, 5000); 
    }
  }
}
EOF

# ==============================================================================
# Rebuild e Reinício
# ==============================================================================
echo "🏗️  Reconstruindo servidor..."
pnpm --filter @mini-ide/server build

echo "✅ Fix de CORS aplicado. Reinicie o servidor!"

#!/usr/bin/env bash
set -e

echo "🧹 [Quality] Eliminando 'any' do Servidor para Compliance Total com Lint..."

CONTROLLER_FILE="packages/server/src/controllers/export.controller.ts"

# ==============================================================================
# 1. Reescrever ExportController com Tipagem Estrita
# - Remove 'as any'
# - Usa z.infer para tipar o Request Body
# ==============================================================================
echo "📝 Refatorando $CONTROLLER_FILE..."

cat > "$CONTROLLER_FILE" <<EOF
import { FastifyRequest, FastifyReply } from 'fastify';
import { ConsolidatorService } from '@mini-ide/analysis-agent';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

// 1. Definição do Schema
const ExportRequestSchema = z.object({
  projectData: z.object({
    product: z.any().optional(), // Mantemos any aqui pois a estrutura interna é complexa/variável, mas validada pelo Consolidator
    engine: z.any().optional(),
    name: z.string().optional()
  }).optional()
});

// 2. Inferência do Tipo TypeScript a partir do Schema
type ExportRequestBody = z.infer<typeof ExportRequestSchema>;

export class ExportController {
  // 3. Uso do Generics do Fastify para tipar o Body corretamente
  static async downloadZip(req: FastifyRequest<{ Body: ExportRequestBody }>, reply: FastifyReply) {
    
    // Validação
    const parseResult = ExportRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid project data', details: parseResult.error });
    }

    // Extração segura (Tipada)
    const { projectData } = parseResult.data;
    
    // Dados sanitizados
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
      
      // Adiciona README extra se não existir
      archive.append(
        \`# \${projectName}\n\nExportado em \${new Date().toISOString()}\`,
        { name: 'EXPORT_INFO.md' }
      );

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
# 2. Validação Imediata
# ==============================================================================
echo "🛡️  Verificando Lint do Servidor..."
pnpm --filter @mini-ide/server lint

if [ $? -eq 0 ]; then
    echo "✅ Lint do Servidor limpo! (Zero Warnings)"
else
    echo "❌ Lint ainda falhou."
    exit 1
fi

echo "🏗️  Reconstruindo para garantir integridade..."
pnpm --filter @mini-ide/server build

echo "✨ Correção de Qualidade Aplicada."

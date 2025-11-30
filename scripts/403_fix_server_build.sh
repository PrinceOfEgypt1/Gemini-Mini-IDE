#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

CONTROLLER_PATH="packages/server/src/controllers/export.controller.ts"

log_info "Iniciando correção do Export Controller..."

# 1. Reescrever export.controller.ts para exportar uma constante funcional e usar a nova API
# Isso elimina a classe 'ExportController' e satisfaz o 'import { exportController }' do index.ts
cat > "$CONTROLLER_PATH" << 'EOF'
import { FastifyRequest, FastifyReply } from "fastify";
import { ConsolidatorService } from "@mini-ide/analysis-agent";
import { z } from "zod";

// Schema simples para validação do payload de exportação
// O frontend envia o objeto completo do projeto para ser zipado
const ExportSchema = z.object({
  project: z.any(), // Aceita a estrutura do projeto (validada internamente pelo Consolidator se necessário)
  format: z.enum(["zip", "md"]).default("zip")
});

/**
 * Controlador responsável por gerar o arquivo ZIP ou MD do projeto.
 * Usa o ConsolidatorService do pacote analysis-agent.
 */
export const exportController = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const parseResult = ExportSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({ 
        error: "Payload inválido para exportação", 
        details: parseResult.error.format() 
      });
    }

    const { project, format } = parseResult.data;
    const consolidator = new ConsolidatorService();

    if (format === "zip") {
      // Gera o buffer do ZIP
      const zipBuffer = await consolidator.consolidateToZip(project);

      // Configura headers para download
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", 'attachment; filename="mini-ide-project.zip"');
      
      return reply.send(zipBuffer);
    } 
    
    // Fallback/TODO para Markdown
    return reply.status(501).send({ error: "Formato MD ainda não implementado via API direta." });

  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({ 
      error: "Falha na exportação do projeto", 
      details: error.message 
    });
  }
};
EOF
log_ok "export.controller.ts reescrito com sucesso."

# 2. Recompilar Server para validar a correção
log_info "Recompilando servidor..."
cd packages/server
if ../../node_modules/.bin/tsc -b; then
    log_ok "Server compilado com sucesso!"
else
    echo "Erro fatal na compilação do Server."
    exit 1
fi
cd ../..

# 3. Rodar Pipeline Final (Checklist Completo)
log_info "Executando pipeline final..."
bash ./42_pipeline_checklist.sh

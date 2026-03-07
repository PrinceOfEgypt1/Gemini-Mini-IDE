#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

CONTROLLER_PATH="packages/server/src/controllers/export.controller.ts"

log_info "Removendo 'any' do Export Controller para zerar warnings..."

# Reescreve o arquivo substituindo o tratamento de erro inseguro por Type Guard padrão
cat > "$CONTROLLER_PATH" << 'EOF'
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import archiver from "archiver";
import { PassThrough } from "stream";

// Schema para validação do payload
// Esperamos a estrutura padrão do projeto gerado pelo Agente
const FileSchema = z.object({
  path: z.string(),
  content: z.string()
});

const EngineSchema = z.object({
  files: z.array(FileSchema)
});

const ProjectSchema = z.object({
  engine: EngineSchema
});

const ExportSchema = z.object({
  project: z.any(), // Validamos campos internos manualmente para flexibilidade
  format: z.enum(["zip", "md"]).default("zip")
});

export const exportController = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const parseResult = ExportSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({ 
        error: "Payload inválido", 
        details: parseResult.error.format() 
      });
    }

    const { project, format } = parseResult.data;

    // Validação leve da estrutura do projeto
    const projectParse = ProjectSchema.safeParse(project);
    if (!projectParse.success) {
       return reply.status(400).send({ 
        error: "Estrutura do projeto inválida. Esperado: { engine: { files: [] } }", 
        details: projectParse.error.format() 
      });
    }

    const files = projectParse.data.engine.files;

    if (format === "zip") {
      // Cria um stream de passagem para pipear o arquivo
      const stream = new PassThrough();
      
      const archive = archiver("zip", {
        zlib: { level: 9 } // Compressão máxima
      });

      // Tratamento de erros do archiver
      archive.on("error", (err) => {
        request.log.error(err);
        if (!reply.raw.headersSent) {
          reply.status(500).send({ error: "Erro na compressão ZIP" });
        }
      });

      // Pipe do archive para o stream de resposta
      archive.pipe(stream);

      // Adiciona arquivos ao ZIP
      files.forEach((file) => {
        // Garante que caminhos sejam relativos e seguros
        const safePath = file.path.replace(/^(\.\.(\/|\\|$))+/, "");
        archive.append(file.content, { name: safePath });
      });

      // Adiciona um README automático se não existir
      if (!files.find(f => f.path.toLowerCase().includes("readme.md"))) {
        archive.append("# Projeto Gerado pelo Mini-IDE\n\nGerado automaticamente.", { name: "README.md" });
      }

      // Finaliza o arquivo (assíncrono, mas não bloqueante aqui)
      archive.finalize();

      // Configura headers e envia o stream
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", 'attachment; filename="mini-ide-project.zip"');
      
      return reply.send(stream);
    } 
    
    return reply.status(501).send({ error: "Formato não suportado: " + format });

  } catch (error) {
    request.log.error(error);
    // Type Guard seguro para evitar 'any'
    const errorMessage = error instanceof Error ? error.message : String(error);
    return reply.status(500).send({ 
      error: "Falha interna na exportação", 
      details: errorMessage 
    });
  }
};
EOF
log_ok "Lint warning resolvido."

# Recompilação rápida para garantir integridade de tipos
cd packages/server
if ../../node_modules/.bin/tsc -b; then
    log_ok "Server recompilado com sucesso."
else
    echo "Erro na recompilação."
    exit 1
fi
cd ../..

# Executa a pipeline final para verificar a meta de Zero Warnings
log_info "Executando Pipeline Final..."
bash ./42_pipeline_checklist.sh

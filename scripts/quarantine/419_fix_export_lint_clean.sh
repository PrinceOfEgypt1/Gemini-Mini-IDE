#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

CONTROLLER_PATH="packages/server/src/controllers/export.controller.ts"

log_info "Aplicando correção de Lint e Tipagem no Export Controller..."

# Reescreve o arquivo com Interfaces e Regex corrigida
cat > "$CONTROLLER_PATH" << 'EOF'
import { FastifyRequest, FastifyReply } from "fastify";
import archiver from "archiver";
import { PassThrough } from "stream";

// Interfaces para tipagem estrita (Elimina o uso de 'any')
interface FileEntry {
  path: string;
  content: string;
}

interface ExportBody {
  format?: string;
  project?: {
    engine?: {
      files?: FileEntry[];
    };
  };
}

export const exportController = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Casting seguro usando a interface definida
    const body = request.body as ExportBody;
    const project = body.project;

    if (!project || !project.engine || !Array.isArray(project.engine.files)) {
      request.log.warn({ availableKeys: Object.keys(project || {}) }, "Estrutura de projeto inválida para exportação");
      return reply.status(400).send({ error: "Estrutura de projeto inválida. Esperado engine.files[]" });
    }

    // O TypeScript agora sabe que 'files' é FileEntry[]
    const files = project.engine.files;
    const format = body.format || "zip";

    if (format === "zip") {
      const stream = new PassThrough();
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.on("error", (err) => {
        request.log.error(err);
        if (!reply.raw.headersSent) {
            reply.status(500).send({ error: "Erro ZIP" });
        }
      });

      archive.pipe(stream);

      files.forEach((file) => {
        if (file.path && file.content) {
          // FIX: Regex corrigida para remover escape desnecessário na barra '/'
          // Antes: /^[\/\\]/ -> Agora: /^[/\\]/
          const safePath = file.path.replace(/^[/\\]/, "");
          archive.append(file.content, { name: safePath });
        }
      });

      // Verifica README sem usar 'any'
      if (!files.find((f) => f.path && f.path.toLowerCase().includes("readme.md"))) {
        archive.append("# Projeto Gerado\n\nVerifique os arquivos.", { name: "README.md" });
      }

      archive.finalize();

      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", 'attachment; filename="mini-ide-project.zip"');
      return reply.send(stream);
    }
    
    return reply.status(501).send({ error: "Formato não suportado" });

  } catch (error) {
    // Tratamento de erro type-safe
    request.log.error(error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return reply.status(500).send({ error: "Falha interna", details: errorMessage });
  }
};
EOF
log_ok "Export Controller reescrito (Type-Safe e Lint-Clean)."

# Recompilação rápida para garantir que as interfaces estão corretas
log_info "Verificando compilação..."
cd packages/server
if ../../node_modules/.bin/tsc -b; then
    log_ok "Compilação OK."
else
    echo "Erro na compilação."
    exit 1
fi
cd ../..

# Executar a pipeline para prova final
log_info "Executando Pipeline Final (Agora deve passar no Lint)..."
bash ./42_pipeline_checklist.sh

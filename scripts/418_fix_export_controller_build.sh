#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

CONTROLLER_PATH="packages/server/src/controllers/export.controller.ts"

log_info "Corrigindo sintaxe de log no Export Controller..."

# Reescreve o arquivo com a correção de tipagem no log
cat > "$CONTROLLER_PATH" << 'EOF'
import { FastifyRequest, FastifyReply } from "fastify";
import archiver from "archiver";
import { PassThrough } from "stream";

export const exportController = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as any;
    const project = body.project; 

    if (!project || !project.engine || !Array.isArray(project.engine.files)) {
      // CORREÇÃO: Passar objeto como primeiro argumento para o logger (Padrão Pino)
      request.log.warn({ availableKeys: Object.keys(project || {}) }, "Estrutura de projeto inválida para exportação");
      return reply.status(400).send({ error: "Estrutura de projeto inválida. Esperado engine.files[]" });
    }

    const files = project.engine.files;
    const format = body.format || "zip";

    if (format === "zip") {
      const stream = new PassThrough();
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.on("error", (err) => {
        request.log.error(err);
        if (!reply.raw.headersSent) reply.status(500).send({ error: "Erro ZIP" });
      });

      archive.pipe(stream);

      files.forEach((file: any) => {
        if (file.path && file.content) {
          // Remove leading slashes para compatibilidade Windows/Zip
          const safePath = file.path.replace(/^[\/\\]/, "");
          archive.append(file.content, { name: safePath });
        }
      });

      if (!files.find((f: any) => f.path && f.path.toLowerCase().includes("readme.md"))) {
        archive.append("# Projeto Gerado\n\nVerifique os arquivos.", { name: "README.md" });
      }

      archive.finalize();

      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", 'attachment; filename="mini-ide-project.zip"');
      return reply.send(stream);
    }
    
    return reply.status(501).send({ error: "Formato não suportado" });

  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({ error: "Falha interna", details: error.message });
  }
};
EOF
log_ok "Export Controller corrigido."

# Recompilação do Server
log_info "Recompilando servidor..."
cd packages/server
if ../../node_modules/.bin/tsc -b; then
    log_ok "Server compilado com sucesso!"
else
    echo "Erro na compilação do Server."
    exit 1
fi
cd ../..

# Reiniciar
log_info "Reiniciando servidor..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Correção aplicada. Pode iniciar o servidor."

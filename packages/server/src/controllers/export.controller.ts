import { FastifyRequest, FastifyReply } from "fastify";
import archiver from "archiver";
import { PassThrough } from "stream";

// Interfaces para tipagem estrita
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

/**
 * Validates that a file path is safe for inclusion in a ZIP archive.
 * Returns the validated path if safe, or null if the path is rejected.
 *
 * Rejection rules (applied to the raw path, no normalization forgiveness):
 * - empty string
 * - contains backslash (\)
 * - starts with / (absolute path)
 * - contains segment . or .. (dot traversal)
 * - contains empty segments (consecutive slashes //)
 * - ends with /
 */
export function validateZipEntryPath(rawPath: string): string | null {
  if (!rawPath || rawPath.length === 0) return null;
  if (rawPath.includes("\\")) return null;
  if (rawPath.startsWith("/")) return null;
  if (rawPath.endsWith("/")) return null;
  if (rawPath.includes("//")) return null;

  const segments = rawPath.split("/");
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") return null;
  }

  return rawPath;
}

export const exportController = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> => {
  try {
    const body = request.body as ExportBody;
    const project = body.project;

    if (!project?.engine?.files || !Array.isArray(project.engine.files)) {
      request.log.warn(
        { availableKeys: Object.keys(project ?? {}) },
        "Estrutura de projeto inválida para exportação"
      );
      return reply.status(400).send({
        error: "Estrutura de projeto inválida. Esperado engine.files[]"
      });
    }

    const files = project.engine.files;
    const format = body.format ?? "zip";

    if (format === "zip") {
      // Validate paths before creating the archive (fail-fast on unsafe paths)
      for (const file of files) {
        if (file.path && validateZipEntryPath(file.path) === null) {
          return reply.status(400).send({
            error: `Caminho de arquivo inseguro ou inválido: ${file.path}`
          });
        }
      }

      const stream = new PassThrough();
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.on("error", (err) => {
        request.log.error(err, "Erro ao criar arquivo ZIP");
        if (!reply.raw.headersSent) {
          reply.status(500).send({ error: "Erro ao criar ZIP" });
        }
      });

      archive.pipe(stream);

      for (const file of files) {
        if (file.path && file.content) {
          archive.append(file.content, { name: file.path });
        }
      }

      // Adiciona README se não existir
      const hasReadme = files.some(
        (f) => f.path?.toLowerCase().includes("readme.md")
      );
      if (!hasReadme) {
        archive.append("# Projeto Gerado\n\nVerifique os arquivos.", {
          name: "README.md"
        });
      }

      await archive.finalize();

      reply.header("Content-Type", "application/zip");
      reply.header(
        "Content-Disposition",
        'attachment; filename="mini-ide-project.zip"'
      );
      return reply.send(stream);
    }

    return reply.status(501).send({ error: "Formato não suportado" });
  } catch (error: unknown) {
    request.log.error(error, "Erro no controller de exportação");
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return reply.status(500).send({
      error: "Falha interna",
      details: errorMessage
    });
  }
};

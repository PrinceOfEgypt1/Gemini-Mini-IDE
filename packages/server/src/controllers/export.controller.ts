import { FastifyRequest, FastifyReply } from 'fastify';
import archiver from 'archiver';

export class ExportController {
  /**
   * Endpoint para exportar projeto como ZIP
   * FIX CRÍTICO: Headers CORS + Content-Type + Streaming correto
   */
  static async downloadZip(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // HEADERS CRÍTICOS (ordem importa!)
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      reply.raw.setHeader('Content-Type', 'application/zip');
      reply.raw.setHeader('Content-Disposition', 'attachment; filename="mini-ide-project.zip"');
      
      // Status 200 explícito
      reply.raw.statusCode = 200;

      // Criar ZIP streamer
      const archive = archiver('zip', {
        zlib: { level: 9 } // Compressão máxima
      });

      // Pipe direto para a resposta HTTP
      archive.pipe(reply.raw);

      // Capturar erros do archiver
      archive.on('error', (err: Error) => {
        req.log.error({ err }, 'Erro ao gerar ZIP');
        if (!reply.raw.headersSent) {
          reply.code(500).send({ error: 'Erro ao gerar ZIP' });
        }
      });

      // Adicionar arquivos ao ZIP
      const body = req.body as any;
      const projectData = body?.projectData || { name: 'mini-ide-project' };

      // Arquivo 1: README.md
      archive.append(
        `# ${projectData.name || 'Mini-IDE Project'}\n\nProjeto exportado em ${new Date().toISOString()}\n`,
        { name: 'README.md' }
      );

      // Arquivo 2: project.json (metadados)
      archive.append(
        JSON.stringify(projectData, null, 2),
        { name: 'project.json' }
      );

      // Arquivo 3: .gitignore
      archive.append(
        'node_modules/\ndist/\n.env\n*.log\n',
        { name: '.gitignore' }
      );

      // Finalizar ZIP (fecha stream automaticamente)
      await archive.finalize();

      req.log.info('ZIP exportado com sucesso');
      
    } catch (err) {
      req.log.error({ err }, 'Erro crítico no downloadZip');
      
      // Só envia erro se headers ainda não foram enviados
      if (!reply.raw.headersSent) {
        reply.code(500).send({ error: 'Erro interno ao exportar' });
      }
    }
  }
}

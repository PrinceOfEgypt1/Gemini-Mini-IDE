import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Schema parcial para validar o que nos interessa agora (HUs e Code)
// Este schema deve bater com o que o Prompt-Mestre instrui o LLM a gerar
const ArtifactSchema = z.object({
  product: z.object({
    userStories: z.array(z.object({
      id: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()).optional(),
      priority: z.string().optional()
    })).optional()
  }).optional(),
  engine: z.object({
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      language: z.string().optional()
    })).optional()
  }).optional()
});

export type ProjectArtifacts = z.infer<typeof ArtifactSchema>;

export class ConsolidatorService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Orquestra a gravação de todos os artefatos
   */
  async saveArtifacts(llmResponse: unknown): Promise<string[]> {
    const createdFiles: string[] = [];
    
    // 1. Validação leve (Parse)
    const parsed = ArtifactSchema.safeParse(llmResponse);
    if (!parsed.success) {
       // eslint-disable-next-line no-console
      console.error('❌ Erro de validação no Consolidator:', parsed.error);
      throw new Error('Resposta do LLM inválida para consolidação.');
    }
    
    const data = parsed.data;

    // 2. Garantir diretório base
    // Em produção, isso seria um diretório temporário ou o diretório do usuário
    await fs.mkdir(this.basePath, { recursive: true });

    // 3. Extrair HUs (HU 4.2)
    if (data.product?.userStories?.length) {
      const huFile = await this.saveHUs(data.product.userStories);
      createdFiles.push(huFile);
    }

    // 4. Extrair Código (HU 4.3)
    if (data.engine?.files?.length) {
      const codeFiles = await this.saveCode(data.engine.files);
      createdFiles.push(...codeFiles);
    }

    return createdFiles;
  }

  private async saveHUs(userStories: NonNullable<ProjectArtifacts['product']>['userStories']): Promise<string> {
    let content = '# 📋 Backlog de Histórias de Usuário\n\n';
    
    userStories?.forEach(hu => {
      content += `## ${hu.id}\n`;
      content += `**Prioridade:** ${hu.priority || 'N/A'}\n\n`;
      content += `${hu.description}\n\n`;
      if (hu.acceptanceCriteria && hu.acceptanceCriteria.length > 0) {
        content += '### Critérios de Aceite:\n';
        hu.acceptanceCriteria.forEach(ac => content += `- [ ] ${ac}\n`);
      }
      content += '\n---\n\n';
    });

    const filePath = path.join(this.basePath, '1_Scope_and_HUs.md');
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  private async saveCode(files: NonNullable<ProjectArtifacts['engine']>['files']): Promise<string[]> {
    const savedPaths: string[] = [];

    for (const file of files || []) {
      // Segurança: Prevenir Path Traversal (ex: ../../etc/passwd)
      // Normalizamos o path e removemos referências a diretórios pai
      const safePath = file.path.replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(this.basePath, safePath);
      
      // Garantir diretório pai
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      await fs.writeFile(fullPath, file.content, 'utf-8');
      savedPaths.push(fullPath);
    }

    return savedPaths;
  }
}

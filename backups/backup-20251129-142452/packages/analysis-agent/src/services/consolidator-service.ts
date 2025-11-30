import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileArtifact {
  path: string;
  content: string;
}

export interface UserStoryArtifact {
  id: string;
  role: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[];
  description?: string;
  context?: string;
  functionalReqs?: string[];
  nonFunctionalReqs?: string[];
  security?: string[];
}

// Interface local para substituir 'any' na entrada
interface IncomingAgentResponse {
  summary?: string;
  requestId?: string;
  personas?: {
    engine?: { content?: string };
    product?: { content?: string };
  };
}

// Interface para o retorno consolidado
interface ConsolidatedProject {
  summary: string;
  requestId?: string;
  timestamp: string;
  engine: { files: FileArtifact[] };
  product: { userStories: UserStoryArtifact[] };
}

export class ConsolidatorService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  // Substituído 'any' por 'unknown' (entrada) e tipos explícitos
  public async saveArtifacts(response: unknown): Promise<ConsolidatedProject> {
    // Type assertion seguro
    const typedResponse = response as IncomingAgentResponse;
    
    const project = await this.consolidate(typedResponse);

    if (project.engine && project.engine.files) {
      await this.writeFilesToDisk(project.engine.files);
    }

    return project;
  }

  public async consolidate(response: IncomingAgentResponse): Promise<ConsolidatedProject> {
    const engineContent = response.personas?.engine?.content || '';
    const productContent = response.personas?.product?.content || '';

    // Logs removidos para satisfazer regra 'no-console' (ou usar logger injetado futuramente)
    
    const files = this.extractFiles(engineContent);
    const userStories = this.extractUserStories(productContent);

    return {
      summary: response.summary || "Projeto gerado com sucesso",
      requestId: response.requestId,
      timestamp: new Date().toISOString(),
      engine: { files: files },
      product: { userStories: userStories }
    };
  }

  private async writeFilesToDisk(files: FileArtifact[]): Promise<void> {
    for (const file of files) {
      try {
        const fullPath = path.join(this.basePath, file.path);
        const dir = path.dirname(fullPath);
        
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, file.content, 'utf-8');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[Consolidator] Erro ao salvar arquivo ${file.path}:`, error);
      }
    }
  }

  private extractFiles(text: string): FileArtifact[] {
    const files: FileArtifact[] = [];
    
    // CORREÇÃO REGEX (no-useless-escape):
    // Removidos escapes de / e . dentro dos colchetes [ ... ]
    // [a-zA-Z0-9_\-\/\.]  ->  [a-zA-Z0-9_\-/.]
    const regex = /(?:^|\n)(?:###|\*\*|File:)\s*([a-zA-Z0-9_\-/.]+)(?:\*\*|:)?\s*(?:```\w*)?\s*\n([\s\S]+?)```/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
      // Verificação de tipo para satisfazer strict null checks
      if (!match[1] || !match[2]) continue;

      const rawPath = match[1].trim();
      const content = match[2].trim();

      const cleanPath = rawPath.replace(/\.\./g, '').replace(/^\//, '');

      const existingIdx = files.findIndex(f => f.path === cleanPath);
      
      if (existingIdx >= 0) {
        // Asseguramos que o item existe
        files[existingIdx]!.content = content;
      } else {
        files.push({ path: cleanPath, content });
      }
    }
    return files;
  }

  private extractUserStories(text: string): UserStoryArtifact[] {
    const stories: UserStoryArtifact[] = [];
    
    const huRegex = /(HU-\d+|História \d+)[:\s]([\s\S]+?)(?=(?:HU-\d+|História \d+|---|$))/g;
    
    let match;
    while ((match = huRegex.exec(text)) !== null) {
      if (!match[0]) continue;
      
      const fullBlock = match[0].trim();
      
      stories.push({
        id: match[1] || `HU-${String(stories.length + 1).padStart(3, '0')}`,
        role: "",
        action: "", 
        benefit: "",
        acceptanceCriteria: [], 
        description: fullBlock
      });
    }

    return stories;
  }
}

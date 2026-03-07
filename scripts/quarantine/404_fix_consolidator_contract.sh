#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/404_fix_consolidator_contract.sh
# Objetivo: Restaurar contrato da classe ConsolidatorService (saveArtifacts + construtor)
#           mantendo a lógica de extração aprimorada.
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🚑 Restaurando contrato do ConsolidatorService..."

cat << 'EOF' > packages/analysis-agent/src/services/consolidator-service.ts
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

export class ConsolidatorService {
  private basePath: string;

  // RESTAURADO: Construtor que aceita o diretório temporário
  constructor(basePath: string) {
    this.basePath = basePath;
  }

  // RESTAURADO: Método principal chamado pelos controladores
  public async saveArtifacts(response: any): Promise<any> {
    // 1. Processa o JSON (Lógica Nova)
    const project = await this.consolidate(response);

    // 2. Salva arquivos no disco (Vital para o Export ZIP funcionar)
    if (project.engine && project.engine.files) {
      await this.writeFilesToDisk(project.engine.files);
    }

    return project;
  }

  // Método interno de lógica pura
  public async consolidate(response: any): Promise<any> {
    const engineContent = response.personas?.engine?.content || '';
    const productContent = response.personas?.product?.content || '';

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

  private async writeFilesToDisk(files: FileArtifact[]) {
    console.log(`[Consolidator] Salvando ${files.length} arquivos em ${this.basePath}...`);
    for (const file of files) {
      try {
        const fullPath = path.join(this.basePath, file.path);
        const dir = path.dirname(fullPath);
        
        // Garante que o diretório existe
        await fs.mkdir(dir, { recursive: true });
        // Escreve o arquivo
        await fs.writeFile(fullPath, file.content, 'utf-8');
      } catch (error) {
        console.error(`[Consolidator] Erro ao salvar arquivo ${file.path}:`, error);
      }
    }
  }

  private extractFiles(text: string): FileArtifact[] {
    const files: FileArtifact[] = [];
    // Regex robusta para capturar arquivos
    const regex = /(?:^|\n)(?:###|\*\*|File:)\s*([a-zA-Z0-9_\-\/\.]+)(?:\*\*|:)?\s*(?:```\w*)?\s*\n([\s\S]+?)```/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!match[1] || !match[2]) continue;
      const cleanPath = match[1].trim().replace(/\.\./g, '').replace(/^\//, '');
      const existingIdx = files.findIndex(f => f.path === cleanPath);
      
      if (existingIdx >= 0) {
        files[existingIdx]!.content = match[2].trim();
      } else {
        files.push({ path: cleanPath, content: match[2].trim() });
      }
    }
    return files;
  }

  private extractUserStories(text: string): UserStoryArtifact[] {
    const stories: UserStoryArtifact[] = [];
    
    // Regex robusta para capturar blocos de HU
    const huRegex = /(HU-\d+|História \d+)[:\s]([\s\S]+?)(?=(?:HU-\d+|História \d+|---|$))/g;
    
    let match;
    while ((match = huRegex.exec(text)) !== null) {
      if (!match[0]) continue;
      
      const fullBlock = match[0].trim();
      
      stories.push({
        id: match[1] || `HU-${String(stories.length + 1).padStart(3, '0')}`,
        role: "", // Deixa para o frontend parsear
        action: "", 
        benefit: "",
        acceptanceCriteria: [], 
        description: fullBlock // Passa o bloco completo
      });
    }

    return stories;
  }
}
EOF

echo "✅ ConsolidatorService reparado: Contrato restaurado e lógica aprimorada mantida."
EOF

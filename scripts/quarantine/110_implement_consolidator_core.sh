#!/usr/bin/env bash
set -euo pipefail

echo "🏗️ [Phase 11] Implementando Core do Consolidator (Parse, HUs, Code)..."

# ==============================================================================
# 1. Criar o Serviço de Consolidação
# Responsável por transformar o JSON em arquivos
# ==============================================================================
echo "📝 Criando packages/analysis-agent/src/services/consolidator-service.ts..."

cat > packages/analysis-agent/src/services/consolidator-service.ts <<EOF
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
      content += \`## \${hu.id}\n\`;
      content += \`**Prioridade:** \${hu.priority || 'N/A'}\n\n\`;
      content += \`\${hu.description}\n\n\`;
      if (hu.acceptanceCriteria && hu.acceptanceCriteria.length > 0) {
        content += '### Critérios de Aceite:\n';
        hu.acceptanceCriteria.forEach(ac => content += \`- [ ] \${ac}\n\`);
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
      const safePath = file.path.replace(/^(\.\.(\/|\\\\|$))+/, '');
      const fullPath = path.join(this.basePath, safePath);
      
      // Garantir diretório pai
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      await fs.writeFile(fullPath, file.content, 'utf-8');
      savedPaths.push(fullPath);
    }

    return savedPaths;
  }
}
EOF

# ==============================================================================
# 2. Criar Teste Unitário para o Consolidator
# Garante que o parser e a lógica de escrita funcionam (HU 5.1 Compliance)
# ==============================================================================
echo "🧪 Criando packages/analysis-agent/src/services/consolidator-service.test.ts..."

cat > packages/analysis-agent/src/services/consolidator-service.test.ts <<EOF
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConsolidatorService } from './consolidator-service';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('ConsolidatorService', () => {
  let tempDir: string;
  let consolidator: ConsolidatorService;

  beforeEach(async () => {
    // Cria diretório temporário isolado para cada teste
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mini-ide-test-'));
    consolidator = new ConsolidatorService(tempDir);
  });

  afterEach(async () => {
    // Limpeza (Cleanup)
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('deve salvar HUs corretamente em formato Markdown', async () => {
    const mockResponse = {
      product: {
        userStories: [
          { id: 'HU-1', description: 'Test Story', priority: 'P0', acceptanceCriteria: ['AC1', 'AC2'] }
        ]
      }
    };

    const files = await consolidator.saveArtifacts(mockResponse);
    
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('1_Scope_and_HUs.md');
    
    const content = await fs.readFile(files[0], 'utf-8');
    expect(content).toContain('# 📋 Backlog');
    expect(content).toContain('HU-1');
    expect(content).toContain('- [ ] AC1');
  });

  it('deve salvar arquivos de código respeitando a estrutura de pastas', async () => {
    const mockResponse = {
      engine: {
        files: [
          { path: 'src/main.ts', content: 'console.log("Hello");' },
          { path: 'docs/README.md', content: '# Project' }
        ]
      }
    };

    const files = await consolidator.saveArtifacts(mockResponse);
    
    expect(files).toHaveLength(2);
    
    const mainTsPath = path.join(tempDir, 'src/main.ts');
    const mainTsContent = await fs.readFile(mainTsPath, 'utf-8');
    expect(mainTsContent).toBe('console.log("Hello");');
    
    const readmePath = path.join(tempDir, 'docs/README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    expect(readmeContent).toBe('# Project');
  });
});
EOF

# ==============================================================================
# 3. Atualizar o Index do Agent para exportar o serviço
# ==============================================================================
echo "🔄 Atualizando packages/analysis-agent/src/index.ts..."

# Verifica se já existe para evitar duplicação
if ! grep -q "ConsolidatorService" packages/analysis-agent/src/index.ts; then
  echo "export { ConsolidatorService } from './services/consolidator-service';" >> packages/analysis-agent/src/index.ts
fi

# ==============================================================================
# 4. Pipeline de Validação Rápida
# ==============================================================================
echo "🛡️  Validando implementação..."

echo "   > Lint..."
pnpm --filter @mini-ide/analysis-agent lint

echo "   > Testes Unitários (Novo Service)..."
pnpm --filter @mini-ide/analysis-agent test

echo "   > Build..."
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Sprint 11.1 Concluída: Consolidator Core implementado e testado."
EOF

chmod +x scripts/110_implement_consolidator_core.sh

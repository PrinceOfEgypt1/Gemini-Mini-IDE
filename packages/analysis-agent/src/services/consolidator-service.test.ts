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

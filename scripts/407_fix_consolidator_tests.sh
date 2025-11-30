#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/407_fix_consolidator_tests.sh
# Objetivo: Atualizar testes do Consolidator para refletir a nova estrutura de retorno (Objeto vs Array)
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🧪 Atualizando testes do ConsolidatorService..."

cat << 'EOF' > packages/analysis-agent/src/services/consolidator-service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConsolidatorService } from './consolidator-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ConsolidatorService', () => {
  let tempDir: string;
  let consolidator: ConsolidatorService;

  beforeEach(async () => {
    // Cria diretório temporário para cada teste
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mini-ide-test-'));
    consolidator = new ConsolidatorService(tempDir);
  });

  afterEach(async () => {
    // Limpa sujeira após o teste
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('deve salvar arquivos de código respeitando a estrutura de pastas', async () => {
    const mockResponse = {
      requestId: 'req-123',
      summary: 'Test Build',
      personas: {
        engine: {
          content: `
Aqui está o código:
### src/main.ts
\`\`\`typescript
console.log('Hello World');
\`\`\`

### README.md
\`\`\`markdown
# Project
Demo
\`\`\`
          `
        },
        product: { content: '' }
      }
    };

    // Executa a consolidação
    const result = await consolidator.saveArtifacts(mockResponse);

    // 1. Valida estrutura do objeto de retorno (Novo Contrato)
    expect(result).toHaveProperty('requestId', 'req-123');
    expect(result.engine.files).toHaveLength(2);

    // 2. Valida persistência no disco
    const mainTsPath = path.join(tempDir, 'src/main.ts');
    const readmePath = path.join(tempDir, 'README.md');

    // Verifica se arquivos existem
    await expect(fs.access(mainTsPath)).resolves.toBeUndefined();
    await expect(fs.access(readmePath)).resolves.toBeUndefined();

    // Verifica conteúdo
    const mainContent = await fs.readFile(mainTsPath, 'utf-8');
    expect(mainContent).toContain("console.log('Hello World');");
  });

  it('deve salvar HUs corretamente e estruturar o retorno', async () => {
    const mockResponse = {
      requestId: 'req-hu',
      personas: {
        engine: { content: '' },
        product: {
          content: `
HU-001: Login
Como usuário, Quero logar, Para acessar.
---
HU-002: Logout
Como usuário, Quero sair, Para segurança.
          `
        }
      }
    };

    const result = await consolidator.saveArtifacts(mockResponse);

    // Valida extração de HUs no objeto de retorno
    expect(result.product.userStories).toHaveLength(2);
    expect(result.product.userStories[0].id).toBe('HU-001');
    expect(result.product.userStories[1].id).toBe('HU-002');
  });
});
EOF

echo "✅ Testes do Consolidator atualizados para o novo contrato."
EOF
